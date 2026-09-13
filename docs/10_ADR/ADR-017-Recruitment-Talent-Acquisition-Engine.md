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
4. Coordinate candidate evaluation, technical assessments, and interview panels without violating identity boundaries or corrupting existing engine invariants.
5. Conduct operational candidate trials using real project assignments, work logging, and mentor reviews for existing personnel, while providing structured audition deliverables for external candidates without prematurely creating shadow personnel records.
6. Issue formal employment offers with compensation terms and track mutually exclusive response lifecycles.
7. Convert hired candidates into organizational personnel (`Person` and `Employment` entities in M2) via a single, explicit, and atomic operation while preserving comprehensive recruitment history and preventing accidental identity collisions.
8. Manage concurrent application state deterministically upon hiring a candidate.
9. Provide operational talent pipeline analytics to the M11 Analytics Engine.

### Cross-Milestone Identity & Subsystem Boundary Challenge
A primary architectural challenge in M13 is reconciling the strict invariant:
$$\text{Candidate} \neq \text{Person}$$
with the existing contracts of M2 (People), M3 (Assignments), M5 (Work), and M8 (Evaluation):
* **M8 Evaluation Engine Contract**: M8 models evaluations strictly over M2 `Person` subjects (`evaluations.target_id` references `people.id`). An external M13 Candidate who does not possess a `Person` identity cannot directly become the target of an M8 Evaluation without violating `Candidate ≠ Person` or creating shadow/temporary `Person` records.
* **M3 & M5 Operational Contracts**: M3 `assignments` and M5 `work_records` require a `person_id REFERENCES people(id)`. External candidates without a `people` record cannot log work records or hold assignments directly.

The architecture must explicitly resolve this cross-milestone boundary without:
- Creating shadow, temporary, or hidden `Person` records in M2.
- Modifying M8, M5, or M3 architecture/schemas.
- Creating a redundant shadow Evaluation engine in M13.

---

## Decision Drivers

1. **Backbone Continuity**: Maintain the established DeVoc OS operational backbone:
   $$\text{Person} \rightarrow \text{Role} \rightarrow \text{Assignment} \rightarrow \text{Work} \rightarrow \text{Outcome} \rightarrow \text{Evaluation} \rightarrow \text{Analytics}$$
   Recruitment sits logically *upstream* of this backbone:
   $$\text{Position} \rightarrow \text{Candidate} \rightarrow \text{Application} \rightarrow \text{Recruitment Pipeline} \rightarrow \text{Decision} \rightarrow \text{Offer Issued} \rightarrow \text{Offer Accepted} \rightarrow \text{Explicit /hire} \rightarrow \text{Person} \rightarrow \text{Employment}$$
2. **Identity Boundary Invariant (`Candidate ≠ Person`)**: External job applicants must not pollute the authoritative `people` catalog until an offer is formally accepted and an explicit `/hire` conversion operation is executed.
3. **Cross-Milestone Evaluation Boundary Resolution**:
   - **External Candidates (No M2 Person)**: Pre-hire triage, screening, and interview feedback are recorded in M13 (`recruitment_application_stages.notes` and `status`). External candidate trials record audition objectives, deliverables summary, and mentor outcome notes directly in `recruitment_trials`. External candidates MUST NOT receive a shadow Person, an M3 assignment, M5 work records, or an M8 evaluation.
   - **Existing-Person Candidates (`internal_person_id IS NOT NULL`)**: Internal employees, students, or mentors applying for new roles already possess a valid M2 `people` record. Their applications MAY seamlessly utilize M3 assignments, M5 work records, and M8 evaluations because the subject is a legitimate M2 Person.
   - **Post-Hire Formal M8 Evaluation**: For newly hired external candidates, formal M8 evaluations become applicable *after* the `/hire` conversion operation provisions their authentic M2 `Person` and `Employment` records.
4. **Strict Non-Automated Identity Resolution**: Candidate conversion must never silently merge an external candidate into an existing `Person` record solely because email addresses match. Silent identity linkage creates security and privacy vulnerabilities.
5. **Requisition Boundary Invariant (`Position ≠ Role`)**: An organizational role (`Role` in M2) defines responsibility and permission authority. A `Position` in M13 defines an active hiring capacity need (headcount, timeline, salary range, qualifications).
6. **Application Authoritative for Hiring Process**: A candidate is an individual who may submit multiple applications over time. Application status is authoritative for a specific requisition; Candidate status represents overall relationship stance (`active`, `hired`, `archived`) and does not mirror individual rejections.
7. **Single Authoritative Conversion Operation**: Prevent competing auto-hire triggers. Offer issuance sets application status to `offered`. Offer acceptance leaves application in `offered` status with an accepted offer record. An explicit, authenticated `POST /applications/:id/hire` operation atomically converts Candidate to Person and Employment.
8. **Deterministic Concurrent Application Handling**: When a candidate is hired on one application, all other active applications for that same candidate are automatically transitioned to `withdrawn` within the same atomic transaction with reason `candidate_hired_elsewhere`.
9. **Strict Multi-Tenant Isolation with Cross-Domain Validation**: Beyond simple foreign keys, application services must enforce that all referenced entities (BU, Department, Team, Role, Manager, Recruiter, Evaluator, Mentor) belong to the identical tenant organization (`Request Org = Entity Org = Referenced Org`).
10. **Canonical Tenant-Scoped API Base**: The sole canonical API base is `/api/v1/organizations/:orgId/recruitment/...`.

---

## Detailed Architectural Decisions

### 1. External Candidate vs. Existing-Person Subsystem Boundaries

To maintain absolute integrity across M2, M3, M5, M8, and M13, the architecture establishes a dual-path integration model based on identity status:

```text
                  Is Candidate an Existing M2 Person?
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
           YES (Internal)                      NO (External)
                 │                                 │
                 ▼                                 ▼
   ┌───────────────────────────┐     ┌───────────────────────────┐
   │ Can use M3 Assignments    │     │ Cannot use M3 Assignments │
   │ Can log M5 Work Records   │     │ Cannot log M5 Work        │
   │ Can target M8 Evaluations │     │ Cannot target M8 Eval     │
   └───────────────────────────┘     └───────────────────────────┘
                 │                                 │
                 │                                 ▼
                 │                   ┌───────────────────────────┐
                 │                   │ M13 Stage Notes/Status    │
                 │                   │ M13 Trial Deliverables    │
                 │                   │ M6 Meeting Logistics      │
                 │                   └───────────────────────────┘
                 │                                 │
                 │                                 ▼
                 │                   ┌───────────────────────────┐
                 │                   │ Explicit /hire Operation  │
                 │                   │ Creates M2 Person         │
                 │                   └───────────────────────────┘
                 │                                 │
                 ▼                                 ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Post-Hire M8 Evaluations & Full Operational Backbone       │
   └─────────────────────────────────────────────────────────────┘
```

#### Dual-Path Execution Table
| Subsystem Integration | External Candidate (No M2 Person) | Existing-Person Candidate (`internal_person_id IS NOT NULL`) | Post-Hire New Person |
|---|---|---|---|
| **Identity Entity** | `recruitment_candidates` | `recruitment_candidates` + M2 `people` | M2 `people` + `employments` |
| **M8 Evaluation Target** | **Disallowed** (Candidate $\neq$ Person) | **Allowed** (Target is existing `people.id`) | **Allowed** (Target is converted `people.id`) |
| **Stage Triage & Notes** | Recorded in `recruitment_application_stages.notes` & `status` | Recorded in stage notes OR M8 `evaluation_id` | M8 evaluations for performance reviews |
| **M6 Interview Meetings**| **Allowed** (Candidate listed in meeting notes/agenda; evaluators are M2 `people`) | **Allowed** (`meetings` + `meeting_participants`) | Standard M6 meetings |
| **M3 Assignments** | **Disallowed** (Requires `people.id`) | **Allowed** (`assignments` for trial project) | Standard M3 assignments |
| **M5 Work Logging** | **Disallowed** (Requires `people.id`) | **Allowed** (`work_records` logged during trial) | Standard M5 work records |
| **Trial Auditions** | `recruitment_trials` (objectives, deliverables_summary, outcome_notes) | `recruitment_trials` + M3 assignment + M5 work + M8 evaluation | Post-hire onboarding trials |

### 2. Schema Pointers for Optional Subsystem References
* **`recruitment_application_stages.evaluation_id`**: Optional (`UUID NULL`). Usable **strictly** when the candidate has an authorized M2 `Person` identity (`internal_person_id IS NOT NULL`). For external candidates, this field MUST remain `NULL`.
* **`recruitment_trials.assignment_id`**: Optional (`UUID NULL`). Usable **strictly** when `internal_person_id IS NOT NULL`.
* **`recruitment_trials.evaluation_id`**: Optional (`UUID NULL`). Usable **strictly** when `internal_person_id IS NOT NULL`.
* **`recruitment_trials.deliverables_summary` & `outcome_notes`**: Text fields on `recruitment_trials` used to record audition outputs, evaluation notes, and mentor feedback for external candidate trials without introducing a shadow evaluation table or violating M8 constraints.

### 3. Position Lifecycle & Terminology
* Lifecycle states: `draft`, `open`, `paused`, `closed`, `archived`.
* **Position State Machine**:
  ```text
  draft ──> open ──┬──> paused ──> open
                   ├──> closed (hiring-terminal) ──> archived (lifecycle-terminal)
                   └──> archived (lifecycle-terminal)
  ```
* **Closed Requisition Rule**: `closed` is a **hiring-terminal** state (reopening is strictly prohibited to preserve M11 time-to-fill analytics). If an organization requires additional headcount after a requisition closes, a new position requisition must be drafted.
* **Archived Position Rule**: `archived` is a **lifecycle-terminal** state (no further transitions permitted).
* **Headcount Invariant**: $0 \le \text{hired\_count} \le \text{openings\_count}$. Locked via `SELECT ... FOR UPDATE` during hire transactions. Automatically sets position status to `closed` when `hired_count == openings_count`.

### 4. Canonical API Base
The sole canonical API base path for all recruitment routes is:
```text
/api/v1/organizations/:orgId/recruitment/...
```
There is no secondary or root `/api/v1/recruitment` compatibility alias. All controllers, route definitions, and API documentation adhere strictly to this single tenant-explicit route hierarchy.

### 5. Candidate vs. Application Lifecycle
* **Candidate Status**: `active`, `hired`, `archived`. Decoupled from individual application outcomes. Rejecting an application sets `application.status = 'rejected'`, leaving `candidate.status = 'active'`.
* **Application Status**: 10 canonical states:
  `applied`, `screening`, `assessment`, `interview`, `trial`, `decision`, `offered`, `hired`, `rejected`, `withdrawn`.

### 6. Authoritative Hiring Flow & Preconditions
1. Application reaches `decision`.
2. Authorized actor issues offer $\rightarrow$ `recruitment_offers.status = 'issued'`, `application.status = 'offered'`.
3. Candidate accepts offer $\rightarrow$ `recruitment_offers.status = 'accepted'` (terminal), `application.status` **remains `offered`**.
4. Authorized actor explicitly invokes `/hire`:
   `POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire`
   - Preconditions: `application.status == 'offered'`, accepted offer exists, `position.hired_count < position.openings_count`.

### 7. Non-Automated Identity Resolution on Hire
* **Internal Candidate** (`candidate.internal_person_id IS NOT NULL`): Validates tenant ownership, links to existing `people.id`, appends M2 `employments` contract.
* **External Candidate** (`candidate.internal_person_id IS NULL`): Checks normalized email against existing M2 `people` in `:orgId`.
  - **IF email collision found**: Aborts transaction and returns `409 IDENTITY_CONFLICT` (`EXISTING_PERSON_EMAIL_CONFLICT`). No silent auto-linking.
  - **IF no collision**: Inserts new M2 `people` and M2 `employments` records.
* Sets `recruitment_candidates.converted_person_id = people.id`.

### 8. Concurrent Active Applications Auto-Withdrawal
During the same atomic hiring transaction:
1. Selected application $\rightarrow$ `hired`, `hired_at = NOW()`.
2. Candidate $\rightarrow$ `hired`.
3. All other active applications for `candidate_id` $\rightarrow$ `withdrawn`, `withdrawn_reason = 'candidate_hired_elsewhere'`, `withdrawn_at = NOW()`.
4. Stage skip records inserted into `recruitment_application_stages`.
5. M10 audit logs and `recruitment.application.withdrawn` outbox events staged within the transaction and dispatched post-commit.
* **Invariant**: `candidate.status = 'hired'` guarantees zero active applications remain for that candidate.

### 9. Tenant Isolation Architecture (Three-Layer Defense)
1. DB `organization_id NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
2. Service-level tenant cross-reference validation (`Request Org = Entity Org = Referenced Org`).
3. Authorization context via `resolveTenant`. Cross-tenant requests return 404.

### 10. M10 Event & Audit Integration
DB Mutation + Audit Log + Outbox Event $\xrightarrow{\text{COMMIT}}$ Post-Commit Dispatch $\rightarrow$ `eventBus.publish`. Zero pre-commit event emissions.

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
- **Zero Cross-Milestone Contradiction**: `Candidate ≠ Person` and M8 Evaluation Engine contracts are preserved without shadow personnel or M8 schema modifications.
- **Pristine Subsystem Boundaries**: External candidate auditions use native recruitment deliverables; internal candidates leverage full M3/M5/M8 integration.
- **Pristine Identity Security**: Eliminates accidental or silent identity linking by requiring explicit resolution for email collisions.
- **Automatic Funnel Hygiene**: Atomic withdrawal of concurrent applications ensures a hired person cannot remain active in parallel candidate funnels.
- **Strict Concurrency Control**: Pessimistic locking prevents headcount over-hiring.

### Negative / Trade-offs
- External candidate evaluations prior to hire rely on recruitment stage notes and trial deliverable summaries rather than formal M8 scorecards.
- Reopening closed requisitions is prohibited, requiring recruiters to draft a new requisition if headcount reopens.
