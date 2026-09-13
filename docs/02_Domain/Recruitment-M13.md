# Recruitment & Talent Acquisition Domain — Milestone 13

## 1. Purpose

The **Recruitment & Talent Acquisition Domain** governs the end-to-end talent sourcing, evaluation, and hiring lifecycle of DeVoc OS. It defines the operational rules, entity lifecycles, pipeline stage taxonomies, candidate evaluation boundaries, and personnel conversion workflows across all tenant organizations.

Recruitment sits **upstream** of the core organizational backbone:

```text
Position
   ↓
Candidate
   ↓
Application
   ↓
Recruitment Pipeline (Screening → Assessment → Interview → Trial)
   ↓
Hiring Decision
   ↓
Offer
   ↓
Candidate Conversion
   ↓
Person & Employment (M2)
   ↓
Operational Backbone (Assignment → Work → Evaluation → Analytics)
```

M13 acts as an autonomous talent funnel engine while delegating formal assessments, meeting logistics, trial operations, financial commitments, and personnel records to the established operational engines (M1–M12).

---

## 2. Core Domain Model

```text
Organization Boundary (Multi-Tenant Scoped)
  │
  ├── Positions (recruitment_positions)
  │     ├── Target Role (M2 roles)
  │     ├── Business Structure (M1 business_units, departments, teams)
  │     ├── Openings & Headcount Management
  │     └── Requisition Lifecycle (draft → open → paused → closed → archived)
  │
  ├── Candidates (recruitment_candidates)
  │     ├── Profile, Resume, Skills, Source Channels
  │     ├── Candidate Lifecycle (active → hired | rejected | withdrawn | archived)
  │     └── Eventual Conversion Pointer (people.id)
  │
  ├── Pipeline Configuration (recruitment_pipeline_stages)
  │     ├── Master Data per Tenant (Applied, Screening, Assessment, Interview, Trial, Decision, Offer, Hired)
  │     └── Custom Stage Sequences & Evaluator Assignments
  │
  ├── Applications (recruitment_applications)
  │     ├── Candidate ↔ Position Relationship
  │     ├── Multi-Stage Application History (recruitment_application_stages)
  │     │     ├── Screening Triage
  │     │     ├── Formal Assessments (delegated to M8 Evaluation Engine)
  │     │     └── Interview Sessions (delegated to M6 Meetings & M8 Evaluation)
  │     └── Application Status Machine
  │
  ├── Trials (recruitment_trials)
  │     ├── Time-Boxed Audition Period
  │     ├── Real Project Assignments (delegated to M3 Assignment Engine)
  │     ├── Work Contribution Records (delegated to M5 Work Engine)
  │     └── Trial Performance Evaluation (delegated to M8 Evaluation Engine)
  │
  ├── Offers (recruitment_offers)
  │     ├── Compensation Terms, Frequency, Proposed Start Date
  │     ├── Offer Lifecycle (draft → issued → accepted → rejected → rescinded → expired)
  │     └── Financial Commitments (delegated to M9 Finance Engine)
  │
  └── Candidate Conversion Transaction
        ├── Atomic Provisioning of Person (M2 people)
        ├── Formal Contract Allocation (M2 employments)
        ├── Historical Linkage Preservation (recruitment_candidates.converted_person_id)
        └── Canonical Event Emission (recruitment.candidate.hired via M10 Outbox)
```

---

## 3. Domain Entities & Value Objects

### 3.1 Position Entity (`recruitment_positions`)

A **Position** represents an approved, funded hiring requisition within an organization. It encapsulates the operational capacity need, required competencies, target organizational unit, and headcount goals.

* **Identity & Tenancy**: `id` (UUID), `organization_id` (UUID).
* **Identification**: `title` (string), `code` (string, unique per organization).
* **Organizational Context**:
  - `business_unit_id` (optional reference to M1 `business_units`).
  - `department_id` (optional reference to M1 `departments`).
  - `team_id` (optional reference to M1 `teams`).
  - `target_role_id` (reference to M2 `roles`, defining target authority).
* **Capacity & Headcount**:
  - `employment_type` (`full_time`, `part_time`, `contract`, `internship`, `mentor`, `freelance`).
  - `openings_count` (integer, $\ge 1$).
  - `hired_count` (integer, $\ge 0$).
* **Ownership**:
  - `hiring_manager_id` (reference to M2 `people`).
  - `recruiter_id` (reference to M2 `people`).
* **Compensation & Timelines**:
  - `min_salary`, `max_salary` (numeric currency amounts).
  - `currency` (ISO 4217 currency code, default USD).
  - `target_start_date` (date).
* **Lifecycle Status**:
  - `status`: `draft`, `open`, `paused`, `closed`, `archived`.
  - `opened_at`, `closed_at` (timestamps).

#### Position State Machine
```text
┌───────┐      open       ┌──────┐      pause     ┌────────┐
│ draft │ ──────────────> │ open │ <────────────> │ paused │
└───────┘                 └──────┘                └────────┘
    │                        │                         │
    │                        │ close                   │ close
    │                        ▼                         ▼
    │                     ┌────────┐                ┌────────┐
    │                     │ closed │                │ closed │
    │                     └────────┘                └────────┘
    │                          │
    │ archive                  │ archive
    ▼                          ▼
┌──────────┐              ┌──────────┐
│ archived │              │ archived │
└──────────┘              └──────────┘
```

Valid Transitions:
* `draft` $\rightarrow$ `open`, `archived`
* `open` $\rightarrow$ `paused`, `closed`, `archived`
* `paused` $\rightarrow$ `open`, `closed`, `archived`
* `closed` $\rightarrow$ `open` (reopen), `archived`
* `archived` $\rightarrow$ Terminal (no further transitions permitted).

---

### 3.2 Candidate Entity (`recruitment_candidates`)

A **Candidate** represents an individual job applicant, prospective learner, or potential contractor interacting with the organization's recruitment funnels.

* **Core Identity**: `id` (UUID), `organization_id` (UUID).
* **Bio & Contact**: `first_name`, `last_name`, `email` (normalized, case-insensitive index), `phone`.
* **Sourcing**: `source` (`career_page`, `job_board`, `referral`, `campus`, `agency`, `internal`, `direct`, `other`), `source_details`.
* **Profile & Portfolio**: `resume_url`, `portfolio_url`, `skills` (text array), `profile_metadata` (JSONB).
* **Internal / Existing Linkage**:
  - `internal_person_id` (UUID, nullable reference to M2 `people` for internal employees/students applying for new roles).
  - `converted_person_id` (UUID, nullable reference to M2 `people` populated upon hire).
* **Status**: `active`, `hired`, `rejected`, `withdrawn`, `archived`.

#### Candidate Lifecycle Rules
* A candidate is created in `active` status.
* Candidate status reflects the overall stance across all applications. If all applications are rejected, candidate status moves to `rejected`.
* When any application results in a successful hire, candidate status moves to `hired`.
* Candidate records are append-oriented and never deleted; past candidates who reapply retain historical evaluations and past application outcomes.

---

### 3.3 Pipeline Stage Master Data (`recruitment_pipeline_stages`)

Defines the structured, ordered milestones a candidate must complete within a recruitment process.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `stage_code` (e.g., `APPLIED`, `SCREENING`, `TECH_ASSESSMENT`, `PANEL_INTERVIEW`, `TRIAL`, `DECISION`, `OFFER`, `HIRED`).
  - `name` (human-readable label).
  - `stage_type`: `applied`, `screening`, `assessment`, `interview`, `trial`, `decision`, `offer`, `hired`.
  - `order_index` (integer sequence).
  - `is_system` (boolean: core pipeline stages cannot be deleted).
  - `is_active` (boolean: allows deactivation without deleting past records).

---

### 3.4 Application Entity (`recruitment_applications`)

An **Application** links a `Candidate` to a specific `Position`. It is the authoritative execution record for an individual hiring process.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `candidate_id` (UUID FK $\rightarrow$ `recruitment_candidates`).
  - `position_id` (UUID FK $\rightarrow$ `recruitment_positions`).
  - `current_stage_id` (UUID FK $\rightarrow$ `recruitment_pipeline_stages`).
  - `status`: `applied`, `screening`, `assessment`, `interview`, `trial`, `decision`, `offered`, `hired`, `rejected`, `withdrawn`.
  - `applied_at` (timestamp).
  - `rejection_reason`, `rejected_at`.
  - `withdrawn_reason`, `withdrawn_at`.
  - `hired_at`.
  - `notes` (text).

#### Application Invariant Rules
1. **Uniqueness of Active Applications**: A candidate cannot have two active (non-terminal) applications for the *same* position simultaneously.
2. **Multiple Applications Allowed**: A candidate *may* maintain active applications across multiple *different* positions concurrently.
3. **Re-Application Allowed**: A candidate whose previous application was `rejected` or `withdrawn` may submit a new application for the same position after a cooling-off interval.

---

### 3.5 Application Stage Record (`recruitment_application_stages`)

Tracks the historical progression, evaluator feedback, and subsystem delegations as an application moves through stages.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `application_id` (UUID FK $\rightarrow$ `recruitment_applications`).
  - `stage_id` (UUID FK $\rightarrow$ `recruitment_pipeline_stages`).
  - `status`: `scheduled`, `in_progress`, `passed`, `failed`, `skipped`.
  - `evaluator_id` (UUID FK $\rightarrow$ M2 `people`).
  - `evaluation_id` (UUID, optional reference to M8 `evaluations`).
  - `meeting_id` (UUID, optional reference to M6 `meetings`).
  - `score` (numeric, optional summary score).
  - `feedback` (text, qualitative notes).
  - `started_at`, `completed_at`.

---

### 3.6 Trial Entity (`recruitment_trials`)

Represents a formal candidate trial or probation audition period where practical work is evaluated prior to final hiring decisions.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `application_id` (UUID FK $\rightarrow$ `recruitment_applications`).
  - `start_date`, `end_date` (date range).
  - `status`: `scheduled`, `active`, `completed`, `terminated`.
  - `objectives` (text, trial scope and deliverable criteria).
  - `mentor_id` (UUID FK $\rightarrow$ M2 `people`, assigned trial mentor/supervisor).
  - `assignment_id` (UUID, reference to M3 `assignments`).
  - `evaluation_id` (UUID, reference to M8 `evaluations`).
  - `outcome_notes` (text).

#### Trial Execution Workflow
1. Application reaches the `trial` stage.
2. Hiring manager creates a `recruitment_trials` record.
3. If candidate is external, a restricted guest or trial person identity is allocated.
4. M3 `AssignmentService` provisions an assignment to the target project.
5. Candidate executes tasks and submits work logs in M5 (`work_records`).
6. Assigned mentor conducts a trial performance review in M8 (`evaluations`).
7. Trial completes; evaluation score and outcome inform the hiring decision.

---

### 3.7 Offer Entity (`recruitment_offers`)

Represents the formal employment agreement and compensation proposal extended to a candidate.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `application_id` (UUID FK $\rightarrow$ `recruitment_applications`).
  - `position_id` (UUID FK $\rightarrow$ `recruitment_positions`).
  - `proposed_role_id` (UUID FK $\rightarrow$ M2 `roles`).
  - `employment_type` (string).
  - `base_salary` (numeric).
  - `currency` (string, 3-letter ISO).
  - `compensation_frequency`: `hourly`, `monthly`, `annual`, `milestone`.
  - `proposed_start_date` (date).
  - `status`: `draft`, `issued`, `accepted`, `rejected`, `rescinded`, `expired`.
  - `issued_at`, `expires_at`, `responded_at`.
  - `response_notes`, `terms_conditions`.
  - `financial_obligation_id` (UUID, optional reference to M9 `financial_obligations`).

#### Offer Invariants
* Only one offer may be in `issued` status for an application at any time.
* If an offer is `rejected` or `rescinded`, a new revised offer record may be drafted and issued.
* When an offer moves to `accepted`, the candidate becomes eligible for immediate conversion to `Person` and `Employment`.

---

## 4. Candidate → Person Conversion Process

Candidate conversion is the definitive bridge connecting the recruitment funnel to the core operational backbone.

```text
Offer Status = 'accepted'
           ↓
Begin DB Transaction
 ├── Verify Candidate & Application Eligibility
 ├── Check for Existing Person by Normalized Email
 │     ├── IF exists (Internal Transfer / Existing Member):
 │     │     ├── Link personId = existingPerson.id
 │     │     └── Insert M2 employments (new employment record)
 │     └── ELSE (New External Hire):
 │           ├── Insert M2 people (first_name, last_name, email, phone)
 │           └── Insert M2 employments (role_id, BU, department, start_date)
 ├── Update recruitment_candidates.converted_person_id = personId
 ├── Update recruitment_candidates.status = 'hired'
 ├── Update recruitment_applications.status = 'hired'
 ├── Update recruitment_applications.hired_at = NOW()
 ├── Increment recruitment_positions.hired_count
 ├── IF hired_count >= openings_count THEN recruitment_positions.status = 'closed'
 ├── Record Audit Log (RECRUITMENT_CANDIDATE_HIRED)
 └── Stage Outbox Event (recruitment.candidate.hired)
COMMIT DB Transaction
           ↓
Post-Commit Outbox Dispatch (eventBus.publish)
```

---

## 5. Subsystem Integration Matrix

| Requirement | Authoritative Engine | Integration Mechanism |
|---|---|---|
| **Candidate Identity** | M13 Recruitment | `recruitment_candidates` table |
| **Hiring Requisition** | M13 Recruitment | `recruitment_positions` table |
| **Application Funnel** | M13 Recruitment | `recruitment_applications`, `recruitment_application_stages` |
| **Pipeline Taxonomy** | M13 Recruitment | `recruitment_pipeline_stages` master data |
| **Lightweight Screening** | M13 Recruitment | Notes and triage verdicts in `recruitment_application_stages` |
| **Formal Assessments** | M8 Evaluation Engine | Linked `evaluation_id` to M8 `evaluations` |
| **Interview Logistics** | M6 Meetings Engine | Linked `meeting_id` to M6 `meetings` |
| **Interview Scoring** | M8 Evaluation Engine | Linked `evaluation_id` to M8 `evaluations` |
| **Trial Responsibility** | M3 Assignment Engine | Linked `assignment_id` to M3 `assignments` |
| **Trial Work Contribution** | M5 Work Engine | Standard `work_records` logged against trial assignment |
| **Trial Performance Review** | M8 Evaluation Engine | Linked `evaluation_id` to M8 `evaluations` |
| **Bootcamp / Training Track** | M7 Learning Engine | Linked `enrollment_id` in M7 if pre-hire academy training |
| **Offer Financial Obligation**| M9 Finance Engine | Linked `financial_obligation_id` in M9 for signing bonuses / planned budgets |
| **Personnel Identity** | M2 People Engine | Converted `people` record upon hire |
| **Employment Contract** | M2 People Engine | Converted `employments` record upon hire |
| **Audit Records** | M10 Audit Engine | Atomic calls to `AuditService.recordLog` within transaction |
| **Domain Events** | M10 Events Engine | Atomic staging via `OutboxService.stageOutboxEvent` + post-commit dispatch |
| **Recruitment KPIs** | M11 Analytics Engine | Read-only metric queries over M13 operational tables |

---

## 6. Contextual Authorization & Capabilities

Recruitment permissions follow the established contextual authorization framework: `Role + Business Unit + Team + Project`.

| Capability | Scope & Meaning | Permitted Contextual Roles |
|---|---|---|
| `recruitment:view` | View positions, candidates, and applications | Org Admin, BU Head, Hiring Manager, Recruiter, Interviewer |
| `recruitment:create` | Create new job requisitions and candidate records | Org Admin, BU Head, Recruiter |
| `recruitment:manage` | Edit positions, advance pipeline stages, add notes | Org Admin, Recruiter, Assigned Hiring Manager |
| `recruitment:screen` | Complete initial screening and resume review | Org Admin, Recruiter, Designated Screener |
| `recruitment:assess` | Conduct evaluations and technical scorecards | Designated Evaluator, Interview Panelist |
| `recruitment:decide` | Issue final hiring decisions (`hire`, `reject`, `hold`) | Org Admin, BU Head, Hiring Manager |
| `recruitment:offer` | Draft, issue, rescind, and record offer responses | Org Admin, HR / Recruiting Lead |
| `recruitment:admin` | Configure pipeline stages, master data, and defaults | Org Admin, Platform Admin |

---

## 7. Canonical Domain Events

All domain events conform to M10 event definitions and are published strictly post-commit:

1. `recruitment.position.created`: Fired when a new job requisition is drafted.
2. `recruitment.position.opened`: Fired when a position is published for active hiring.
3. `recruitment.position.closed`: Fired when headcount is filled or requisition is cancelled.
4. `recruitment.candidate.created`: Fired when a new candidate profile is created.
5. `recruitment.application.created`: Fired when a candidate applies to a position.
6. `recruitment.application.stage_changed`: Fired when an application advances, passes, or fails a stage.
7. `recruitment.application.rejected`: Fired when an application is rejected.
8. `recruitment.application.withdrawn`: Fired when an application is withdrawn by candidate or recruiter.
9. `recruitment.trial.started`: Fired when a candidate trial begins.
10. `recruitment.trial.completed`: Fired when trial period concludes.
11. `recruitment.offer.issued`: Fired when an employment offer is extended.
12. `recruitment.offer.accepted`: Fired when an offer is formally accepted.
13. `recruitment.offer.rejected`: Fired when an offer is declined.
14. `recruitment.candidate.hired`: Fired when conversion to `Person` and `Employment` succeeds.
