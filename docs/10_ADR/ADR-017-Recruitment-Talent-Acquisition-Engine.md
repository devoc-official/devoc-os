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
5. Conduct operational candidate trials using real project assignments, work logging, and mentor reviews without prematurely granting permanent personnel status or violating identity boundaries.
6. Issue formal employment offers with compensation terms and track mutually exclusive response lifecycles.
7. Convert hired candidates into organizational personnel (`Person` and `Employment` entities in M2) via a single, explicit, and atomic operation while preserving comprehensive recruitment history and preventing accidental identity collisions.
8. Manage concurrent application state deterministically upon hiring a candidate.
9. Provide operational talent pipeline analytics to the M11 Analytics Engine.

The architectural challenge is introducing a robust talent acquisition engine without:
* Conflating unvetted external candidates with authenticated organizational personnel (`Candidate ≠ Person`).
* Conflating hiring requisitions with organizational authority roles (`Position ≠ Role`).
* Conflating application outcomes with candidate relationship stance (an applicant may be rejected for one job while remaining active for others or future openings).
* Automatically or silently linking external candidates to existing personnel records based merely on matching email strings.
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
   $$\text{Position} \rightarrow \text{Candidate} \rightarrow \text{Application} \rightarrow \text{Recruitment Pipeline} \rightarrow \text{Decision} \rightarrow \text{Offer Issued} \rightarrow \text{Offer Accepted} \rightarrow \text{Explicit /hire} \rightarrow \text{Person} \rightarrow \text{Employment}$$
2. **Identity Boundary Invariant (`Candidate ≠ Person`)**: External job applicants must not pollute the authoritative `people` catalog until an offer is formally accepted and an explicit `/hire` conversion operation is executed.
3. **Strict Non-Automated Identity Resolution**: Candidate conversion must never silently merge an external candidate into an existing `Person` record solely because email addresses match. Silent identity linkage creates security and privacy vulnerabilities.
4. **Requisition Boundary Invariant (`Position ≠ Role`)**: An organizational role (`Role` in M2) defines responsibility and permission authority. A `Position` in M13 defines an active hiring capacity need (headcount, timeline, salary range, qualifications).
5. **Application Authoritative for Hiring Process**: A candidate is an individual who may submit multiple applications over time. Application status is authoritative for a specific requisition; Candidate status represents overall relationship stance (`active`, `hired`, `archived`) and does not mirror individual rejections.
6. **Single Authoritative Conversion Operation**: Prevent competing auto-hire triggers. Offer issuance sets application status to `offered`. Offer acceptance leaves application in `offered` status with an accepted offer record. An explicit, authenticated `POST /applications/:id/hire` operation atomically converts Candidate to Person and Employment.
7. **Deterministic Concurrent Application Handling**: When a candidate is hired on one application, all other active applications for that same candidate are automatically transitioned to `withdrawn` within the same atomic transaction with reason `candidate_hired_elsewhere`.
8. **Subsystem Reuse Over Duplication**:
   - Assessment & Scoring $\rightarrow$ delegate to M8 Evaluation Engine (`evaluations`). M13 stores only reference pointers (`evaluation_id`), avoiding duplicate scoring columns.
   - Interview Logistics $\rightarrow$ delegate to M6 Meetings Engine (`meetings`).
   - Trial Operations $\rightarrow$ delegate to M3 Assignment Engine (`assignments`) and M5 Work Engine (`work_records`) where an existing authorized Person identity exists; otherwise manage trial deliverables via M8 evaluations.
   - Offer Financial Commitments $\rightarrow$ integrate with M9 Finance Engine (`financial_obligations`).
   - Audit & Events $\rightarrow$ delegate to M10 Audit and Outbox services.
9. **Strict Multi-Tenant Isolation with Cross-Domain Validation**: Beyond simple foreign keys, application services must enforce that all referenced entities (BU, Department, Team, Role, Manager, Recruiter, Evaluator, Mentor) belong to the identical tenant organization (`Request Org = Entity Org = Referenced Org`).
10. **Contextual Authorization**: Fine-grained administrative and hiring capabilities governed by `Role + Business Unit + Team + Project`.
11. **Canonical Tenant-Scoped API Base**: The sole canonical API base is `/api/v1/organizations/:orgId/recruitment/...`. No compatibility aliases are permitted.

---

## Detailed Architectural Decisions

### 1. Canonical API Base
The sole canonical API base path for all recruitment routes is:
```text
/api/v1/organizations/:orgId/recruitment/...
```
There is no secondary or root `/api/v1/recruitment` compatibility alias. All controllers, route definitions, and API documentation adhere strictly to this single tenant-explicit route hierarchy.

### 2. Candidate vs. Application Lifecycle
* **Candidate Status** represents the overall relationship stance with the organization:
  - `active`: Candidate profile is open; eligible for evaluation on active applications or future requisitions.
  - `hired`: Successfully converted to an organizational person via an accepted and finalized application.
  - `archived`: Explicitly archived by a recruiter (ineligible for active consideration).
* **Application Status** is authoritative for a specific hiring requisition:
  - Permitted values (10 canonical states):
    `applied`, `screening`, `assessment`, `interview`, `trial`, `decision`, `offered`, `hired`, `rejected`, `withdrawn`.
* **Decoupling Rule**: Rejecting an application sets `application.status = 'rejected'`, but leaves `candidate.status = 'active'`. A candidate may be rejected for one position while concurrently interviewing for another, or may reapply in the future.

### 3. Authoritative Hiring Flow & Preconditions
The hiring flow consists of clear, non-overlapping transitions:
1. Candidate completes pipeline stages and reaches `decision`.
2. Authorized actor issues an offer:
   - `recruitment_offers` record created with status `issued`.
   - `recruitment_applications.status` transitions from `decision` to `offered`.
3. Candidate accepts offer:
   - `recruitment_offers.status` transitions from `issued` to `accepted` (terminal state for the offer).
   - `recruitment_applications.status` **remains `offered`**. (No artificial `eligible_for_hire` status is created).
4. Authorized actor invokes the single authoritative conversion endpoint:
   `POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire`
   - **Eligibility Preconditions**:
     1. `application.status == 'offered'`
     2. Exactly one offer associated with the application is in `accepted` status.
     3. Target position has available headcount: `position.hired_count < position.openings_count`.
5. Upon successful execution of `/hire`:
   - `application.status` transitions to `hired`.
   - `candidate.status` transitions to `hired`.

### 4. Non-Automated Identity Resolution on Hire
Candidate conversion preserves the strict invariant `Candidate ≠ Person` and prevents unauthorized or accidental identity merging:
* **Case A: Verified Internal Candidate** (`candidate.internal_person_id IS NOT NULL`):
  - Service validates that `candidate.internal_person_id` belongs to `:orgId`.
  - Links to the existing M2 `Person` record.
  - Inserts a new M2 `Employment` contract for the new role/unit while managing prior employment status.
* **Case B: Standard External Candidate** (`candidate.internal_person_id IS NULL`):
  - Service checks if an existing M2 `Person` record in `:orgId` shares the candidate's normalized email:
    - **IF an email match is found**: The system **REFUSES** to silently merge identities. It aborts the transaction and returns an explicit `409 IDENTITY_CONFLICT` error with code `EXISTING_PERSON_EMAIL_CONFLICT`, requiring an administrator to explicitly verify whether the candidate is an internal person (and set `internal_person_id`) or use an alternative verified email.
    - **IF NO email match is found**: Inserts a new M2 `Person` record and a new M2 `Employment` record.
* **Linkage**: In all successful cases, `recruitment_candidates.converted_person_id` is populated with the resolved `people.id`.

### 5. Concurrent Active Applications Auto-Withdrawal
Because a Candidate can have multiple active applications concurrently across different positions, the conversion of one application to `hired` triggers deterministic resolution of all other active applications:
* Within the **same atomic database transaction** as the hire:
  1. Selected application $\rightarrow$ `hired`, `hired_at = NOW()`.
  2. Candidate $\rightarrow$ `hired`.
  3. Query all other applications for `candidate_id` where `status NOT IN ('hired', 'rejected', 'withdrawn')`.
  4. For each concurrent active application:
     - Set `status = 'withdrawn'`.
     - Set `withdrawn_at = NOW()`.
     - Set `withdrawn_reason = 'candidate_hired_elsewhere'`.
     - Insert a terminal record into `recruitment_application_stages` with `status = 'skipped'`, `notes = 'System auto-withdrawn: candidate hired on another requisition'`.
     - Record an audit log via M10 `AuditService` (`APPLICATION_WITHDRAWN`).
     - Stage outbox event `recruitment.application.withdrawn`.
* **Invariant Enforced**: `candidate.status = 'hired'` guarantees that zero active applications remain for that candidate.

### 6. State Machine Verification & Concurrency Control

#### Position Lifecycle
```text
draft ──> open ──┬──> paused ──> open
                 ├──> closed (terminal) ──> archived (terminal)
                 └──> archived (terminal)
```
* `draft` $\rightarrow$ `open`, `archived`
* `open` $\rightarrow$ `paused`, `closed`, `archived`
* `paused` $\rightarrow$ `open`, `closed`, `archived`
* `closed` $\rightarrow$ `archived` (**terminal closure**; reopening a closed position is disallowed).
* `archived` $\rightarrow$ Terminal.
* **Headcount Invariant**: $0 \le \text{hired\_count} \le \text{openings\_count}$.
* **Concurrency Locking**: During the hire transaction, the position row is locked via `SELECT ... FROM recruitment_positions WHERE id = $1 FOR UPDATE`. If `hired_count + 1 == openings_count`, position status is set to `closed` atomically.

#### Candidate Lifecycle
* `active` $\rightarrow$ `hired`, `archived`
* `hired` $\rightarrow$ `archived`
* `archived` $\rightarrow$ Terminal.

#### Application Lifecycle
```text
applied ──> screening ──> assessment ──> interview ──> trial ──> decision ──> offered ──> hired (terminal)
   │             │              │             │          │          │           │
   └───┬─────────┴──────────────┴─────────────┴──────────┴──────────┴───────────┴──> rejected  (terminal)
       └───────────────────────────────────────────────────────────────────────────> withdrawn (terminal)
```
* Progression: `applied` $\rightarrow$ `screening` $\rightarrow$ `assessment` $\rightarrow$ `interview` $\rightarrow$ `trial` $\rightarrow$ `decision` $\rightarrow$ `offered` $\rightarrow$ `hired`.
* Terminal exits: `rejected`, `withdrawn`, `hired`.

#### Offer Lifecycle
```text
draft ──> issued ──┬──> accepted  (terminal)
                   ├──> rejected  (terminal)
                   ├──> rescinded (terminal)
                   └──> expired   (terminal)
```
* Responses from `issued` are mutually exclusive and terminal. Revisions require drafting a new offer entity. Only one offer per application may reside in `draft` or `issued`.

#### Application Stage Lifecycle
* `scheduled` $\rightarrow$ `in_progress` $\rightarrow$ `passed` | `failed` | `skipped`.

#### Trial Lifecycle
* `scheduled` $\rightarrow$ `active` $\rightarrow$ `completed` | `terminated`.

### 7. Candidate Trial Identity (Option C Resolution)
* **External Candidates**: Trial auditions are managed through milestone deliverables evaluated via M8 `evaluations`. External candidates do **NOT** receive shadow or temporary Person records, and do not directly log M5 `work_records` or receive M3 `assignments`. This preserves the strict `Candidate ≠ Person` invariant.
* **Internal Candidates / Contracted Auditions**: Candidates who already hold an authorized M2 `person_id` (e.g., internal transfers, existing students, or contractors with formal M2 trial contracts) have their `person_id` linked to M3 `assignments` and M5 `work_records`.

### 8. Application Stage History Boundary
* `recruitment_application_stages` is strictly an orchestration and timeline record.
* Redundant `score` and `feedback` columns are excluded from the schema.
* M8 Evaluation Engine is the sole authoritative system for rubric criteria, numerical scores, and evaluator scorecards via `evaluation_id`.
* M6 Meetings Engine is the sole authoritative system for interview scheduling, attendee lists, calendar links, and meeting notes via `meeting_id`.
* `recruitment_application_stages` retains only a lightweight `notes` field for non-evaluative triage comments when no formal M8 evaluation is configured.

### 9. Tenant Isolation Architecture (Three-Layer Defense)
1. **Database Referential Scoping**: Every table contains `organization_id NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
2. **Service-Level Cross-Domain Validation**: Services explicitly verify that all referenced entities belong to the caller's organization:
   $$\text{Request Organization} = \text{Recruitment Entity Organization} = \text{Referenced Entity Organization}$$
   - Position: validates `BU`, `Department`, `Team`, `Role`, `Hiring Manager`, and `Recruiter`.
   - Application: validates `Candidate`, `Position`, and `Stage`.
   - Stage: validates `Evaluator`.
   - Trial: validates `Mentor`.
   - Offer: validates `Proposed Role`.
   Any foreign organization reference causes immediate rejection with HTTP `404 Not Found`.
3. **Authorization Context Boundary**: Validated via `resolveTenant` middleware and contextual permissions.

### 10. M10 Event & Audit Integration
All recruitment mutations strictly adhere to M10 transactional outbox invariants:
$$\text{DB Mutation} + \text{Audit Log} + \text{Outbox Event} \xrightarrow{\text{COMMIT}} \text{Post-Commit Dispatch} \rightarrow \text{eventBus.publish}$$
No domain event is emitted before transaction commit. Concurrent application withdrawals during hiring stage their outbox events within the same transaction and dispatch post-commit.

---

## Non-Goals (Scope Boundaries)

The following capabilities are explicitly excluded from M13:
* **Payroll & Wage Disbursal**: Payroll execution belongs to third-party payroll or specialized finance workflows; M13 only documents offered terms.
* **Job Board & Public Posting Syndication**: No external job aggregator APIs (LinkedIn, Indeed, Glassdoor).
* **AI Resume Parsing / Auto-Screening**: No machine-learning candidate ranking or automated elimination.
* **Video Conferencing / Telephony**: No built-in video streaming; M6 provides external meeting link fields.
* **Background Check / Drug Screen Integrations**: Verification notes can be stored as metadata, but external API connectors are excluded.
* **Employee Self-Service / Applicant Portal**: External public career portals and mobile applicant applications belong to subsequent product milestones.
* **Microservices**: M13 is built as an internal module within the established Node.js TypeScript modular monolith.

---

## Consequences

### Positive
- **Deterministic Pipeline State**: Eliminates phantom states (`eligible_for_hire`) and aligns with the authoritative 10-state application machine.
- **Pristine Identity Security**: Eliminates accidental or silent identity linking by requiring explicit resolution for email collisions.
- **Automatic Funnel Hygiene**: Atomic withdrawal of concurrent applications ensures a hired person cannot remain active in parallel candidate funnels.
- **Strict Concurrency Control**: Pessimistic locking prevents headcount over-hiring.
- **Zero API Ambiguity**: Single canonical `/api/v1/organizations/:orgId/recruitment/...` hierarchy.

### Negative / Trade-offs
- External applicants sharing an email with an existing member require administrative review before hiring conversion can proceed.
- Reopening closed requisitions is prohibited, requiring recruiters to draft a new requisition if headcount reopens.
