# ADR-017 — Recruitment & Talent Acquisition Engine Architecture

## Status

**Proposed (Architecture Draft Revised)**

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
5. Conduct operational candidate trials using real project assignments, work logging, and mentor reviews without prematurely granting permanent personnel status or violating identity boundaries.
6. Issue formal employment offers with compensation terms and track mutually exclusive response lifecycles.
7. Convert hired candidates into organizational personnel (`Person` and `Employment` entities in M2) via a single, explicit, and atomic operation while preserving comprehensive recruitment history.
8. Provide operational talent pipeline analytics to the M11 Analytics Engine.

The architectural challenge is introducing a robust talent acquisition engine without:
* Conflating unvetted external candidates with authenticated organizational personnel (`Candidate ≠ Person`).
* Conflating hiring requisitions with organizational authority roles (`Position ≠ Role`).
* Conflating application outcomes with candidate relationship stance (an applicant may be rejected for one job while remaining active for others or future openings).
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
   $$\text{Position} \rightarrow \text{Candidate} \rightarrow \text{Application} \rightarrow \text{Recruitment Pipeline} \rightarrow \text{Decision} \rightarrow \text{Offer} \rightarrow \text{Explicit Hire} \rightarrow \text{Person} \rightarrow \text{Employment}$$
2. **Identity Boundary Invariant (`Candidate ≠ Person`)**: External job applicants must not pollute the authoritative `people` catalog until an offer is formally accepted and an explicit conversion operation is executed.
3. **Requisition Boundary Invariant (`Position ≠ Role`)**: An organizational role (`Role` in M2) defines responsibility and permission authority. A `Position` in M13 defines an active hiring capacity need (headcount, timeline, salary range, qualifications).
4. **Application Authoritative for Hiring Process**: A candidate is an individual who may submit multiple applications over time. Application status is authoritative for a specific requisition; Candidate status represents overall relationship stance (`active`, `hired`, `archived`) and does not mirror individual rejections.
5. **Single Authoritative Conversion Operation**: Prevent competing auto-hire triggers. Offer acceptance marks an application as `eligible_for_hire`; an explicit, authenticated `hire` operation atomically converts Candidate to Person and Employment.
6. **Subsystem Reuse Over Duplication**:
   - Assessment & Scoring $\rightarrow$ delegate to M8 Evaluation Engine (`evaluations`). M13 stores only reference pointers (`evaluation_id`), avoiding duplicate scoring columns.
   - Interview Logistics $\rightarrow$ delegate to M6 Meetings Engine (`meetings`).
   - Trial Operations $\rightarrow$ delegate to M3 Assignment Engine (`assignments`) and M5 Work Engine (`work_records`) where an existing authorized Person identity exists; otherwise manage trial deliverables via M8 evaluations.
   - Offer Financial Commitments $\rightarrow$ integrate with M9 Finance Engine (`financial_obligations`).
   - Audit & Events $\rightarrow$ delegate to M10 Audit and Outbox services.
7. **Strict Multi-Tenant Isolation with Cross-Domain Validation**: Beyond simple foreign keys, application services must enforce that all referenced entities (BU, Department, Team, Role, Manager, Recruiter, Evaluator, Mentor) belong to the identical tenant organization (`Request Org = Entity Org = Referenced Org`).
8. **Contextual Authorization**: Fine-grained administrative and hiring capabilities governed by `Role + Business Unit + Team + Project`.
9. **Canonical Tenant-Scoped API Base**: Consistent with DeVoc OS multi-tenant routing, the canonical API base is `/api/v1/organizations/:orgId/recruitment/...`.

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
* Delegates trial capacity and work to M3 `Assignment Engine` and M5 `Work Engine` for candidates possessing an authorized personnel identity.
* Converts hired candidates to M2 `Person` and `Employment` entities atomically via an explicit hiring endpoint.
* Emits canonical recruitment domain events via M10 transactional outbox.
* Exposes operational pipeline metrics to M11 Analytics.
* *Verdict*: **Accepted**.

---

## Detailed Architectural Decisions

### 1. Tenant Isolation Architecture (Three-Layer Defense)
Ordinary foreign keys prove row existence, but do not enforce same-tenant ownership across different tables. DeVoc OS enforces a strict three-layer defense:
1. **Database Referential Integrity**: Every table in M13 contains `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
2. **Application-Level Tenant Validation**: Every service method performing a mutation or association explicitly verifies that the requested organization matches all referenced entities:
   $$\text{Request Org} = \text{M13 Entity Org} = \text{Referenced Entity Org}$$
   Specifically:
   - Position: `business_unit.organization_id == position.organization_id`, `department.organization_id == position.organization_id`, `team.organization_id == position.organization_id`, `target_role.organization_id == position.organization_id`, `hiring_manager.organization_id == position.organization_id`, `recruiter.organization_id == position.organization_id`.
   - Application: `candidate.organization_id == application.organization_id`, `position.organization_id == application.organization_id`, `stage.organization_id == application.organization_id`.
   - Application Stage: `evaluator.organization_id == application.organization_id`.
   - Trial: `mentor.organization_id == trial.organization_id`.
   - Offer: `proposed_role.organization_id == offer.organization_id`.
   Any cross-tenant mismatch throws `NotFoundError` (HTTP 404) to prevent information leakage.
3. **Authorization & Context Boundary**: The `resolveTenant` middleware and contextual permission check guarantee that the calling actor holds authority within the resolved tenant.

### 2. Candidate vs. Application Lifecycle
* **Candidate Status** represents the overall relationship stance with the organization:
  - `active`: Eligible to apply for open positions; candidate record is active.
  - `hired`: Successfully converted to an organizational person via an accepted application.
  - `archived`: Explicitly archived or deactivated by a recruiter (ineligible for active consideration).
* **Application Status** is authoritative for a specific hiring requisition:
  - Progression: `applied` $\rightarrow$ `screening` $\rightarrow$ `assessment` $\rightarrow$ `interview` $\rightarrow$ `trial` $\rightarrow$ `decision` $\rightarrow$ `offered` $\rightarrow$ `hired`.
  - Terminal exits: `rejected`, `withdrawn`.
* **Decoupling Rule**: Rejecting an application sets `application.status = 'rejected'`, but leaves `candidate.status = 'active'`. A candidate may be rejected for one position while concurrently interviewing for another, or may reapply in the future.

### 3. Offer Lifecycle State Machine
Offers follow strict, mutually exclusive response pathways from `issued`:
```text
┌───────┐      issue       ┌────────┐
│ draft │ ---------------> │ issued │
└───────┘                  └────────┘
                               │
         ┌─────────────────────┼─────────────────────┬─────────────────────┐
         │ accept              │ reject              │ rescind             │ expire
         ▼                     ▼                     ▼                     ▼
   ┌──────────┐          ┌──────────┐          ┌───────────┐         ┌─────────┐
   │ accepted │          │ rejected │          │ rescinded │         │ expired │
   └──────────┘          └──────────┘          └───────────┘         └─────────┘
    (Terminal)            (Terminal)            (Terminal)            (Terminal)
```
* `accepted`, `rejected`, `rescinded`, and `expired` are terminal states.
* If compensation terms are renegotiated after a rejection, rescission, or expiration, a **new offer entity** is drafted and issued. The previous offer remains historically immutable.
* A partial unique index ensures only one offer per application may reside in `draft` or `issued` status at any time.

### 4. Candidate Trial Identity Resolution
M3 `assignments` and M5 `work_records` strictly require a `person_id REFERENCES people(id)`.
We evaluated three approaches:
* *Option A (Temporary Person)*: Introduce a temporary Person identity in M2 before hire. **Rejected** because it violates the foundational invariant `Candidate ≠ Person` and pollutes the core People Engine with unhired applicants.
* *Option B (Polymorphic Actor in M3/M5)*: Refactor M3 and M5 schemas to support `candidate_id`. **Rejected** because M1–M12 schemas are locked and sealed.
* *Option C (Bounded Trial Integration - Selected)*:
  1. For external candidates undergoing practical auditions: The trial agreement, schedule, and deliverables are tracked in `recruitment_trials`. Candidate submissions and mentor assessments are evaluated via M8 `evaluations` (no M3 assignments or M5 work records are required).
  2. For candidates who already hold an authorized M2 `person_id` (such as internal transfers, existing students, or contractors explicitly onboarded under a trial agreement): `recruitment_trials` links their existing `person_id` to M3 `assignments` and M5 `work_records`.
  3. No shadow `trial_people` or `candidate_people` entities are created.

### 5. Single Authoritative Conversion Operation
To eliminate competing hiring pathways:
1. Candidate accepting an offer transitions `recruitment_offers.status = 'accepted'` and sets `recruitment_applications.status = 'decision'` (marked eligible for hire). **No automatic conversion occurs on offer acceptance.**
2. The hiring manager or authorized administrator explicitly invokes the canonical conversion endpoint:
   `POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire`
3. The conversion executes within a single database transaction:
   - Locks the target position row (`SELECT ... FROM recruitment_positions WHERE id = $1 FOR UPDATE`) to prevent headcount race conditions.
   - Validates that `application.status == 'decision'`, position is `open`, and accepted offer exists.
   - Validates that `hired_count + 1 <= openings_count`.
   - Checks for an existing `Person` record in the organization matching the candidate's normalized email (or via `internal_person_id`).
   - If existing: links `person_id` to existing person and appends a new `employments` record.
   - If new: inserts a new record into M2 `people` and an M2 `employments` record.
   - Sets `recruitment_candidates.converted_person_id = people.id` and `recruitment_candidates.status = 'hired'`.
   - Sets `recruitment_applications.status = 'hired'`, `hired_at = NOW()`.
   - Increments `recruitment_positions.hired_count`.
   - If `hired_count == openings_count`, atomically sets `recruitment_positions.status = 'closed'`, `closed_at = NOW()`.
   - Records an immutable audit log via M10 `AuditService`.
   - Stages `recruitment.candidate.hired` in the transactional outbox.
   - Commits transaction.
   - Dispatches the outbox event post-commit via `OutboxService.dispatchImmediate`.

### 6. Application Stage History Boundary
* `recruitment_application_stages` is strictly an orchestration and progression record.
* Redundant `score` and `feedback` columns are **removed** from the proposed M13 schema.
* M8 Evaluation Engine is the sole authoritative system for rubric criteria, numerical scores, and evaluator scorecards via `evaluation_id`.
* M6 Meetings Engine is the sole authoritative system for interview scheduling, attendee lists, calendar links, and meeting notes via `meeting_id`.
* `recruitment_application_stages` retains only a lightweight `notes` field for non-evaluative triage comments when no formal M8 evaluation is configured.

### 7. Position Lifecycle & Concurrency Invariants
* Lifecycle:
  - `draft` $\rightarrow$ `open`, `archived`
  - `open` $\rightarrow$ `paused`, `closed`, `archived`
  - `paused` $\rightarrow$ `open`, `closed`, `archived`
  - `closed` $\rightarrow$ `archived` (terminal closure; reopening is disallowed).
* **Rationale for Terminal Closure**: Allowing closed requisitions to reopen invalidates historical time-to-fill analytics in M11. If an organization requires additional hires after a requisition closes, a new position requisition must be drafted.
* **Headcount Invariant**: `0 <= hired_count <= openings_count`.
* **Concurrency Locking**: The hire operation uses pessimistic row-level locking (`FOR UPDATE`) on the position row to prevent concurrent hires from exceeding available headcount. When `hired_count == openings_count`, the position closes automatically.

### 8. Internal Candidate Handling
* External candidates: `internal_person_id IS NULL`. Conversion creates a new `people` row.
* Internal candidates (employees, students, mentors): `recruitment_candidates.internal_person_id REFERENCES people(id)` and `source = 'internal'`.
* Conversion never creates a duplicate `people` record. Instead:
  - It references the existing `people` record.
  - In M2 `employments`, it creates a new employment contract representing the new role, while closing or updating the previous employment contract to preserve historical continuity.

### 9. Learning & Finance Engine Boundaries
* **Learning Engine (M7)**: Candidate != Person in M7. External candidates cannot be enrolled in M7 learning journeys or milestones. Pre-hire training assessments are conducted via M8 evaluation scorecards.
* **Finance Engine (M9)**: Offers store proposed compensation terms for contracting transparency. M13 does NOT implement payroll or ledger accounts. If an accepted offer includes an approved upfront obligation (e.g., signing bonus), an optional `financial_obligation_id` may reference an M9 `financial_obligations` record.

### 10. Canonical API Base
* The canonical API base path for all recruitment routes is:
  `/api/v1/organizations/:orgId/recruitment/...`
* Standard resource-oriented routing with `X-Organization-Id` header resolution is maintained as an internal gateway mapping, with the canonical contract being tenant-explicit.

---

## Non-Goals (Scope Boundaries)

The following capabilities are explicitly excluded from M13:
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
- **Guaranteed Tenant Isolation**: Three-layer defense ensures zero cross-tenant reference leaks.
- **Pristine Identity Separation**: `Candidate ≠ Person` is maintained without compromising M3 or M5.
- **Single Conversion Authority**: Eliminates competing automatic conversion triggers.
- **Clean Subsystem Boundaries**: Zero duplicate scoring, zero duplicate meeting records, zero duplicate people.
- **Deterministic Headcount Concurrency**: Pessimistic locking prevents over-hiring race conditions.

### Negative / Trade-offs
- External candidates undergoing practical auditions cannot use internal M5 work logging directly unless they hold an explicit authorized M2 trial contract.
- Reopening closed requisitions is prohibited, requiring recruiters to draft a new requisition if headcount reopens.
