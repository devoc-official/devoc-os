# ADR-017 — Recruitment & Talent Acquisition Engine Architecture

## Status

**Proposed (Architecture Draft)**

## Date

2026-09-14

---

## Context and Problem Statement

Following the completion and locking of Milestones 1 through 12 (Foundation, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit & Events, Analytics, Admin & Platform Management), DeVoc OS requires a structured, multi-tenant **Recruitment & Talent Acquisition Engine** (M13).

Organizations require a governed mechanism to:
1. Define organizational talent requisitions and hiring positions tied to business units, departments, and teams.
2. Ingest, track, and manage external and internal candidates and talent prospects.
3. Facilitate multi-stage recruitment applications across configurable hiring pipelines (screening, assessments, interviews, trials, offers, and decisions).
4. Coordinate candidate evaluations, technical assessments, and interview panels without reinventing evaluation and meeting systems.
5. Conduct operational candidate trials using real project assignments, work logging, and mentor reviews without prematurely granting permanent personnel status.
6. Issue formal employment offers with compensation terms and track responses.
7. Convert hired candidates into organizational personnel (`Person` and `Employment` entities in M2) atomically while preserving comprehensive recruitment history.
8. Provide operational talent pipeline analytics to the M11 Analytics Engine.

The architectural challenge is introducing a robust talent acquisition engine without:
* Conflating unvetted external candidates with authenticated organizational personnel (`Candidate ≠ Person`).
* Conflating hiring requisitions with organizational authority roles (`Position ≠ Role`).
* Re-implementing evaluation, assessment, scoring, or rubric systems already provided by M8 (`Evaluation Engine`).
* Re-implementing meeting scheduling, attendee tracking, or video coordination already provided by M6 (`Meetings Engine`).
* Re-implementing work logging, task assignment, or capacity tracking already provided by M3 (`Assignment Engine`) and M5 (`Work Engine`).
* Re-implementing compensation disbursal or payroll, which violates the bounded context of M9 (`Finance Engine`).
* Bypassing tenant isolation, audit logging, or the transactional outbox event architecture.

---

## Decision Drivers

1. **Backbone Continuity**: Maintain the established DeVoc OS operational backbone:
   $$\text{Person} \rightarrow \text{Role} \rightarrow \text{Assignment} \rightarrow \text{Work} \rightarrow \text{Outcome} \rightarrow \text{Evaluation} \rightarrow \text{Analytics}$$
   Recruitment sits logically *upstream* of this backbone:
   $$\text{Position} \rightarrow \text{Candidate} \rightarrow \text{Application} \rightarrow \text{Recruitment Pipeline} \rightarrow \text{Decision} \rightarrow \text{Offer} \rightarrow \text{Hire} \rightarrow \text{Person} \rightarrow \text{Employment}$$
2. **Identity Boundary Invariant (`Candidate ≠ Person`)**: External job applicants must not pollute the authoritative `people` catalog until an offer is formally accepted and conversion is executed.
3. **Requisition Boundary Invariant (`Position ≠ Role`)**: An organizational role (`Role` in M2) defines responsibility and permission authority. A `Position` in M13 defines an active hiring capacity need (headcount, timeline, salary range, qualifications).
4. **Subsystem Reuse Over Duplication**:
   - Assessment & Scoring $\rightarrow$ delegate to M8 Evaluation Engine (`evaluations`).
   - Interview Logistics $\rightarrow$ delegate to M6 Meetings Engine (`meetings`).
   - Trial Operations $\rightarrow$ delegate to M3 Assignment Engine (`assignments`) and M5 Work Engine (`work_records`).
   - Offer Financial Commitments $\rightarrow$ integrate with M9 Finance Engine (`financial_obligations`).
   - Audit & Events $\rightarrow$ delegate to M10 Audit and Outbox services.
5. **Configurable Pipeline Architecture**: Organizations must be able to define custom hiring stages (e.g., Screening $\rightarrow$ Coding Test $\rightarrow$ Panel Interview $\rightarrow$ Trial $\rightarrow$ Offer) without code changes or hard-coded technical interview assumptions.
6. **Multi-Application Flexibility**: Candidates may apply to multiple distinct positions over time or simultaneously, maintaining isolated application lifecycles.
7. **Strict Multi-Tenant Isolation**: All recruitment entities are strictly scoped by `organization_id`, returning HTTP 404 for cross-tenant access.
8. **Contextual Authorization**: Fine-grained administrative and hiring capabilities governed by `Role + Business Unit + Team + Project`.

---

## Considered Options

### Option 1: Direct Person Pre-Creation (Early People Entity Allocation)
Create a record in `people` immediately upon candidate application with a role of `candidate` or `applicant`.
* *Pros*: Reuses the existing `people` table without creating a separate candidate entity.
* *Cons*: Severely pollutes organizational directories, manager hierarchies, reporting trees, and personnel queries with hundreds or thousands of unvetted, inactive, or rejected applicants; breaks relational integrity assumptions across M2–M12; leaks candidate records into tenant member lookups.
* *Verdict*: **Rejected**.

### Option 2: Monolithic Recruitment Silo (Duplicated Evaluation, Meetings, and Work)
Build a fully self-contained recruitment silo with its own `recruitment_evaluations`, `recruitment_interviews`, `recruitment_trial_work_logs`, and `recruitment_payroll`.
* *Pros*: Complete decoupling from other modules during initial implementation.
* *Cons*: Massive code duplication; divergent evaluation models; fragmented analytics; inconsistent audit trails; violates core modular monolith principles defined in `AGENTS.md` and ADR-005.
* *Verdict*: **Rejected**.

### Option 3: Upstream Recruitment Control Plane with Polymorphic Domain Delegation (Selected)
Introduce M13 as a dedicated upstream recruitment domain comprising `recruitment_positions`, `recruitment_candidates`, `recruitment_applications`, `recruitment_pipeline_stages`, `recruitment_application_stages`, `recruitment_trials`, and `recruitment_offers`.
* Manages the recruitment funnel natively.
* Delegates formal assessment and interview scoring to M8 `Evaluation Engine`.
* Delegates interview logistics to M6 `Meetings Engine`.
* Delegates trial capacity and work to M3 `Assignment Engine` and M5 `Work Engine`.
* Converts hired candidates to M2 `Person` and `Employment` entities atomically upon accepted offer.
* Emits canonical recruitment domain events via M10 transactional outbox.
* Exposes operational pipeline metrics to M11 Analytics.
* *Verdict*: **Accepted**.

---

## Key Architectural Decisions

### 1. Candidate vs. Person Boundary
- `recruitment_candidates` stores applicant-specific profiles: contact details, resume links, portfolio URLs, skills tags, sourcing channels, and profile metadata.
- A `Candidate` has no login credentials in `users` and no personnel record in `people`.
- When an application reaches the `hired` state (following offer acceptance), a formal `Person` record is created in `people` (or linked if an internal candidate), and an `Employment` record is created in `employments`.
- `recruitment_candidates.converted_person_id` stores the foreign key reference to `people.id`, preserving historical provenance indefinitely.

### 2. Position vs. Role Boundary
- A `Position` represents an approved hiring requirement within an organization, linked optionally to a `business_unit_id`, `department_id`, and `team_id`.
- A Position references a target `target_role_id` (pointing to M2 `roles`), establishing the intended organizational capacity to be filled.
- A Position maintains hiring-specific parameters: `openings_count`, `hired_count`, `employment_type`, `min_salary`, `max_salary`, `currency`, `hiring_manager_id`, `recruiter_id`, and `target_start_date`.
- Position status transitions: `draft` $\rightarrow$ `open` $\rightarrow$ `paused` $\rightarrow$ `closed` $\rightarrow$ `archived`.

### 3. Application vs. Candidate Lifecycle
- A `Candidate` represents the human applicant; an `Application` represents the active or historical evaluation of that candidate for a specific `Position`.
- Candidates may have multiple applications across different positions over time or concurrently.
- Applications maintain their own independent pipeline progression:
  $$\text{applied} \rightarrow \text{screening} \rightarrow \text{assessment} \rightarrow \text{interview} \rightarrow \text{trial} \rightarrow \text{decision} \rightarrow \text{offered} \rightarrow \text{hired}$$
  Terminal states: `rejected`, `withdrawn`.
- Candidate status represents the aggregate stance: `active`, `hired`, `rejected`, `withdrawn`, `archived`.

### 4. Configurable Pipeline Stages as Master Data
- Recruitment pipelines vary by discipline (e.g., Engineering trial vs. Executive interview).
- `recruitment_pipeline_stages` defines ordered stages per organization: `stage_code`, `name`, `stage_type` (`applied`, `screening`, `assessment`, `interview`, `trial`, `decision`, `offer`, `hired`), and `order_index`.
- `recruitment_application_stages` records the candidate's movement through these stages, including status (`scheduled`, `in_progress`, `passed`, `failed`, `skipped`), evaluator notes, and external entity links (`meeting_id`, `evaluation_id`).

### 5. Assessment & Screening Integration with M8 Evaluation
- Lightweight initial screenings record notes and pass/fail verdicts directly on `recruitment_application_stages`.
- Formal technical or behavioral assessments instantiate an evaluation in M8:
  - An evaluation template from M8 (`evaluation_templates`) is assigned.
  - The evaluator completes the review in M8 (`evaluations`).
  - `recruitment_application_stages.evaluation_id` stores the reference, maintaining complete rubric scoring, criteria breakdowns, and historical immutability without duplicating M8 schema.

### 6. Interview Coordination with M6 Meetings & M8 Evaluation
- Interview scheduling creates a meeting in M6 with `meeting_type = 'interview'`, recording calendar times, locations/links, and participant personnel.
- The interview's formal scorecard is recorded in M8 as an evaluation.
- `recruitment_application_stages` stores `meeting_id` and `evaluation_id`, uniting scheduling and scorecard data cleanly.

### 7. Candidate Trial Architecture (M3 Assignment + M5 Work + M8 Evaluation)
- A Trial is a formal, time-boxed practical audition on actual organizational tasks.
- When an application enters `trial`:
  1. If the candidate is external, a restricted guest `Person` entity or dedicated trial profile is provisioned with employment type `trial`.
  2. An assignment is created in M3 (`assignments`) linking the trial person to the project/team.
  3. The candidate logs work activities in M5 (`work_records`).
  4. The assigned mentor/evaluator completes a trial review in M8 (`evaluations`).
  5. `recruitment_trials` orchestrates this agreement: `application_id`, `start_date`, `end_date`, `status`, `assignment_id`, and `evaluation_id`.
- No separate trial work logging or assignment tables exist.

### 8. Hiring Decision and Conversion Transaction
- The hiring manager records a formal decision: `hire`, `reject`, `hold`, or `withdrawn`.
- A decision of `hire` permits the issuance of a formal `recruitment_offers` record.
- Upon offer acceptance:
  $$\text{Offer Accepted} \rightarrow \text{Candidate Conversion} \rightarrow \text{M2 Person} + \text{M2 Employment} \rightarrow \text{Outbox Event}$$
- Conversion executes within an atomic database transaction:
  1. Checks for existing `people` records matching the candidate's verified email.
  2. If an existing person is found (e.g., student, former contractor, or internal transfer), links to the existing person and adds a new `employments` record.
  3. If no person exists, inserts a new `people` record.
  4. Inserts a new `employments` record with position title, department, BU, start date, and employment type.
  5. Sets `recruitment_candidates.converted_person_id = people.id` and `recruitment_candidates.status = 'hired'`.
  6. Sets `recruitment_applications.status = 'hired'` and increments `recruitment_positions.hired_count`.
  7. If `hired_count >= openings_count`, transitions `recruitment_positions.status = 'closed'`.
  8. Records an immutable audit log via `AuditService`.
  9. Stages `recruitment.candidate.hired` in the transactional outbox.
  10. Commits the transaction and dispatches the outbox event post-commit.

### 9. Offer Entity & Finance Integration
- `recruitment_offers` specifies proposed employment terms: base salary, currency, payment frequency, proposed start date, expiration date, and status (`draft`, `issued`, `accepted`, `rejected`, `rescinded`, `expired`).
- M13 does not disburse payroll. Upon offer acceptance, an optional `financial_obligation_id` may be linked to M9 `financial_obligations` to represent sign-on commitments, relocation allowances, or scheduled compensation budgets.

### 10. Duplicate Prevention Rules
- A candidate cannot have multiple active (non-terminal) applications for the *same* position simultaneously (enforced via partial unique index).
- A candidate email is indexed per organization; multiple applications by the same individual reuse the existing candidate record.
- Candidate conversion verifies unique email in `people` before insertion, cleanly distinguishing between new hires and internal promotions/transfers.
- Only one offer and one trial may be in an `active` state per application at any given time.

---

## Answers to Architectural Questions (Section 28)

| # | Architectural Question | Architectural Decision |
|---|------------------------|------------------------|
| 1 | Candidate vs. Person boundary | Candidate is recruitment-specific; Person is an organizational member. Candidate becomes Person only upon hire conversion. |
| 2 | Position vs. Role boundary | Role defines authority/responsibility; Position defines hiring requisition/capacity need. Position references target Role. |
| 3 | Application vs. Candidate lifecycle | Candidate is the human entity; Application is the position-specific process. Candidate has multiple applications. |
| 4 | Recruitment stage configuration | Master data table `recruitment_pipeline_stages` configured per organization with ordered stage types. |
| 5 | Screening vs. Evaluation boundary | Lightweight triage notes stay in application stages; formal rubric scoring delegates to M8 Evaluation Engine. |
| 6 | Interview vs. Meeting/Evaluation boundary | Logistics and attendees delegate to M6 Meetings; scoring delegates to M8 Evaluations; M13 links both. |
| 7 | Trial vs. Assignment/Work boundary | Trial agreement tracked in M13; operational execution delegates to M3 Assignment, M5 Work, and M8 Evaluation. |
| 8 | Hiring decision vs. Employment boundary | Decision approves hiring; Offer negotiates terms; Employment is instantiated in M2 only after offer acceptance. |
| 9 | Offer vs. Finance boundary | Offer records compensation terms; payroll is excluded; optional financial obligations link to M9. |
| 10 | Candidate conversion & duplicate prevention | Atomic transaction creates Person/Employment or links existing Person; partial unique indexes prevent double hires. |
| 11 | Tenant isolation | Strict `organization_id` on all tables, indexes, and queries; cross-tenant access returns 404. |
| 12 | Authorization | Contextual `Role + Business Unit + Team + Project` with dedicated `recruitment:*` capabilities. |
| 13 | Audit/event integration | M10 `AuditService` and transactional outbox; zero pre-commit event emissions. |
| 14 | Analytics source mapping | M11 registers M13 operational tables as metric sources for funnel conversions, fill rates, and time-to-hire. |
| 15 | Pipeline stage master data | Scoped to `organization_id` in `recruitment_pipeline_stages`; supports organization-specific customization. |
| 16 | Multiple active applications | Allowed across different positions; disallowed for the identical position concurrently. |
| 17 | Multiple openings per position | Supported via `openings_count` and `hired_count`; auto-closes when capacity is fulfilled. |
| 18 | Multiple trials/offers per application | Only one active trial and one active offer at a time; full revision history preserved. |
| 19 | Reapplying rejected candidates | Candidate record is retained; new application is initiated; past rejection history remains transparent. |
| 20 | Internal candidates | Flagged as `source = 'internal'`; links `internal_person_id`; conversion updates existing Employment without duplicate Person. |

---

## Non-Goals (Scope Boundaries)

The following capabilities are explicitly out of scope for M13:
* **Payroll & Wage Disbursal**: Payroll execution belongs to third-party payroll or specialized finance workflows; M13 only documents offered terms.
* **Job Board & Public Posting Syndication**: No external job aggregator APIs (LinkedIn, Indeed, Glassdoor).
* **AI Resume Parsing / Auto-Screening**: No speculative machine-learning candidate ranking or automated elimination.
* **Video Conferencing / Telephony**: No built-in video streaming; M6 provides external meeting link fields.
* **Background Check / Drug Screen Integrations**: Verification notes can be stored as metadata, but external API connectors are excluded.
* **Employee Self-Service / Applicant Portal**: External public career portals and mobile applicant applications belong to subsequent product milestones.
* **Microservices**: M13 is built as an internal module within the established Node.js TypeScript modular monolith.

---

## Consequences

### Positive
- **Clean Separation of Concerns**: Core identity (`people`) remains pristine; recruitment funnels operate with maximum flexibility without polluting internal organizational lookups.
- **Maximized Subsystem Leverage**: Reuses millions of lines of proven logic across M3 (Assignments), M5 (Work), M6 (Meetings), M8 (Evaluation), M9 (Finance), M10 (Audit/Events), and M11 (Analytics).
- **High Multi-Tenant Security**: Strict tenant isolation prevents cross-tenant candidate or applicant leakage.
- **Audit Compliance**: Complete auditability of hiring decisions, candidate progression, and compensation offers.
- **Operational Scalability**: Capable of handling high-volume student academy admissions, internal mentor recruitment, and external professional hiring under a single unified model.

### Negative / Trade-offs
- **Multi-Table Conversion Flow**: Converting a candidate to a person requires an atomic multi-table transaction spanning `recruitment_candidates`, `recruitment_applications`, `recruitment_positions`, `people`, and `employments`.
- **Cross-Domain Reference Coordination**: Application stages and trials reference external M6, M8, and M3 UUIDs, requiring application services to enforce integrity checks without hard foreign keys across bounded modules.
