# Recruitment & Talent Acquisition Domain — Milestone 13

## 1. Purpose

The **Recruitment & Talent Acquisition Domain** governs the talent sourcing, evaluation, and hiring lifecycle of DeVoc OS. It defines the operational rules, entity lifecycles, pipeline stage taxonomies, candidate evaluation boundaries, and personnel conversion workflows across all tenant organizations.

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
Decision
   ↓
Offer Issued (application.status = offered)
   ↓
Offer Accepted (application.status remains offered)
   ↓
Explicit /hire Operation (Single Conversion Authority)
   ↓
Person & Employment (M2)
   ↓
Operational Backbone (Assignment → Work → Evaluation → Analytics)
```

M13 operates as an autonomous talent funnel engine while delegating formal assessments, meeting logistics, trial operations, financial commitments, and personnel records to the established operational engines (M1–M12).

---

## 2. Core Domain Model

```text
Organization Boundary (Multi-Tenant Scoped: /api/v1/organizations/:orgId/recruitment/...)
  │
  ├── Positions (recruitment_positions)
  │     ├── Target Role (M2 roles)
  │     ├── Business Structure (M1 business_units, departments, teams)
  │     ├── Headcount Invariant (0 <= hired_count <= openings_count)
  │     └── Requisition Lifecycle (draft → open → paused → closed → archived)
  │
  ├── Candidates (recruitment_candidates)
  │     ├── Profile, Resume, Skills, Source Channels
  │     ├── Candidate Lifecycle (active → hired → archived)
  │     └── Eventual Conversion Pointer (people.id)
  │
  ├── Pipeline Configuration (recruitment_pipeline_stages)
  │     ├── Master Data per Tenant (Applied, Screening, Assessment, Interview, Trial, Decision, Offer, Hired)
  │     └── Custom Stage Sequences & Evaluator Assignments
  │
  ├── Applications (recruitment_applications)
  │     ├── Candidate ↔ Position Relationship (authoritative for hiring process)
  │     ├── Authoritative Status Enum (applied, screening, assessment, interview, trial, decision, offered, hired, rejected, withdrawn)
  │     └── Multi-Stage Application History (recruitment_application_stages)
  │           ├── Screening Triage
  │           ├── Formal Assessments (delegated to M8 Evaluation Engine via evaluation_id)
  │           └── Interview Sessions (delegated to M6 Meetings via meeting_id)
  │
  ├── Trials (recruitment_trials)
  │     ├── Time-Boxed Audition Period (objectives, timeline, mentor)
  │     ├── Formal Audition Review (delegated to M8 Evaluation Engine via evaluation_id)
  │     └── Operational Assignments & Work (M3 / M5 for candidates possessing an authorized M2 Person identity)
  │
  ├── Offers (recruitment_offers)
  │     ├── Compensation Terms, Frequency, Proposed Start Date
  │     ├── Mutually Exclusive Response States (draft → issued → accepted | rejected | rescinded | expired)
  │     └── Financial Commitments (delegated to M9 Finance Engine via financial_obligation_id)
  │
  └── Explicit Candidate Conversion Transaction (Single Conversion Authority)
        ├── Single Authoritative Endpoint (POST .../applications/:id/hire)
        ├── Atomic Provisioning / Linking of M2 Person (people)
        ├── Strict Non-Automated Identity Resolution (No Silent Email Merging)
        ├── Formal Contract Allocation in M2 (employments)
        ├── Headcount Concurrency Control (Pessimistic FOR UPDATE Locking)
        ├── Concurrent Active Applications Auto-Withdrawal (candidate_hired_elsewhere)
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
  - **Headcount Invariant**: $0 \le \text{hired\_count} \le \text{openings\_count}$. Over-hiring is prevented by default.
* **Ownership**:
  - `hiring_manager_id` (reference to M2 `people`).
  - `recruiter_id` (reference to M2 `people`).
* **Compensation & Timelines**:
  - `min_salary`, `max_salary` (numeric currency amounts, min $\le$ max).
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
    │                        │ close (or auto-fill)    │ close
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
* `closed` $\rightarrow$ `archived` (**terminal closure**; reopening a closed position is disallowed to protect M11 time-to-hire analytics; new hiring needs require drafting a new position).
* `archived` $\rightarrow$ Terminal (no further transitions permitted).

---

### 3.2 Candidate Entity (`recruitment_candidates`)

A **Candidate** represents an individual job applicant, prospective learner, or potential contractor interacting with the organization's recruitment funnels.

* **Core Identity**: `id` (UUID), `organization_id` (UUID).
* **Bio & Contact**: `first_name`, `last_name`, `email` (normalized lowercase index), `phone`.
* **Sourcing**: `source` (`career_page`, `job_board`, `referral`, `campus`, `agency`, `internal`, `direct`, `other`), `source_details`.
* **Profile & Portfolio**: `resume_url`, `portfolio_url`, `skills` (text array), `profile_metadata` (JSONB).
* **Internal / Existing Linkage**:
  - `internal_person_id` (UUID, nullable reference to M2 `people` for internal employees, students, or mentors applying for new roles).
  - `converted_person_id` (UUID, nullable reference to M2 `people` populated upon hire).
* **Status**: `active`, `hired`, `archived`.

#### Candidate vs. Application Lifecycle Rules
1. **Candidate Status Decoupling**: Candidate status represents the overall relationship stance with the organization (`active`, `hired`, `archived`). It does **NOT** mirror individual application outcomes.
2. **Rejections Do Not Reject Candidates**: When an application is rejected, `application.status` moves to `rejected`. The candidate remains `active` and fully eligible for concurrent applications or future requisitions.
3. **Immutability & Provenance**: Candidate records are append-oriented and never deleted; past candidates who reapply retain historical evaluations and past application outcomes.

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

An **Application** links a `Candidate` to a specific `Position`. It is the **authoritative execution record** for an individual hiring process.

* **Authoritative Status Enum (10 Canonical States)**:
  - `applied`: Initial application received.
  - `screening`: In initial resume review or recruiter triage.
  - `assessment`: Undertaking technical or behavioral assessments.
  - `interview`: Participating in structured interview panels.
  - `trial`: Performing time-boxed practical audition.
  - `decision`: Candidate review completed; pending offer decision.
  - `offered`: Formal employment offer has been extended to candidate.
  - `hired`: Explicit `/hire` conversion successfully completed.
  - `rejected`: Application terminated due to unsuccessful evaluation.
  - `withdrawn`: Application withdrawn by candidate or auto-withdrawn due to concurrent hire elsewhere.
* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `candidate_id` (UUID FK $\rightarrow$ `recruitment_candidates`).
  - `position_id` (UUID FK $\rightarrow$ `recruitment_positions`).
  - `current_stage_id` (UUID FK $\rightarrow$ `recruitment_pipeline_stages`).
  - `status`: one of the 10 canonical states above.
  - `applied_at` (timestamp).
  - `rejection_reason`, `rejected_at`.
  - `withdrawn_reason`, `withdrawn_at`.
  - `hired_at`.
  - `notes` (text).

#### Application Invariants
1. **Uniqueness of Active Applications**: A candidate cannot have two active (non-terminal) applications for the *same* position simultaneously (enforced via partial unique index).
2. **Multiple Positions Concurrency**: A candidate *may* maintain active applications across multiple *different* positions concurrently.
3. **Re-Application Permitted**: A candidate whose previous application was `rejected` or `withdrawn` may submit a new application for the same position once a prior process has terminated.

---

### 3.5 Application Stage Record (`recruitment_application_stages`)

Tracks the historical progression, timeline dates, and subsystem integration pointers as an application moves through stages.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `application_id` (UUID FK $\rightarrow$ `recruitment_applications`).
  - `stage_id` (UUID FK $\rightarrow$ `recruitment_pipeline_stages`).
  - `status`: `scheduled`, `in_progress`, `passed`, `failed`, `skipped`.
  - `evaluator_id` (UUID FK $\rightarrow$ M2 `people`).
  - `evaluation_id` (UUID, optional reference to M8 `evaluations`).
  - `meeting_id` (UUID, optional reference to M6 `meetings`).
  - `notes` (text, lightweight recruitment triage notes only; formal scoring and rubrics reside strictly in M8).
  - `started_at`, `completed_at`.

---

### 3.6 Trial Entity (`recruitment_trials`)

Represents a formal candidate audition or practical probation period.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `application_id` (UUID FK $\rightarrow$ `recruitment_applications`).
  - `start_date`, `end_date` (date range, start $\le$ end).
  - `status`: `scheduled`, `active`, `completed`, `terminated`.
  - `objectives` (text, trial scope and deliverable criteria).
  - `mentor_id` (UUID FK $\rightarrow$ M2 `people`, assigned trial mentor/supervisor).
  - `assignment_id` (UUID, optional reference to M3 `assignments` for candidates with an M2 identity).
  - `evaluation_id` (UUID, reference to M8 `evaluations` for trial performance review).
  - `outcome_notes` (text).

#### Candidate Trial Identity Boundary (Option C Resolution)
* **External Candidates**: Auditions are managed through milestone deliverables evaluated via M8 `evaluations`. External candidates do **NOT** receive shadow or temporary Person records, and do not directly log M5 `work_records` or receive M3 `assignments`. This preserves the strict `Candidate ≠ Person` invariant.
* **Internal Candidates / Contracted Auditions**: Candidates who already hold an authorized M2 `person_id` (e.g., internal transfers, existing students, or contractors with formal M2 trial contracts) have their `person_id` linked to M3 `assignments` and M5 `work_records`.

---

### 3.7 Offer Entity (`recruitment_offers`)

Represents the formal employment agreement and compensation proposal extended to a candidate.

* **Fields**:
  - `id` (UUID), `organization_id` (UUID).
  - `application_id` (UUID FK $\rightarrow$ `recruitment_applications`).
  - `position_id` (UUID FK $\rightarrow$ `recruitment_positions`).
  - `proposed_role_id` (UUID FK $\rightarrow$ M2 `roles`).
  - `employment_type` (string).
  - `base_salary` (numeric, $\ge 0$).
  - `currency` (string, 3-letter ISO).
  - `compensation_frequency`: `hourly`, `monthly`, `annual`, `milestone`.
  - `proposed_start_date` (date).
  - `status`: `draft`, `issued`, `accepted`, `rejected`, `rescinded`, `expired`.
  - `issued_at`, `expires_at`, `responded_at`.
  - `response_notes`, `terms_conditions`.
  - `financial_obligation_id` (UUID, optional reference to M9 `financial_obligations`).

#### Offer Lifecycle Rules
```text
draft ──> issued ──┬──> accepted  (terminal)
                   ├──> rejected  (terminal)
                   ├──> rescinded (terminal)
                   └──> expired   (terminal)
```
* Responses from `issued` are mutually exclusive and terminal.
* Only one active offer (`draft` or `issued`) is permitted per application (enforced via partial unique index).
* If terms are renegotiated after a terminal state, a new offer entity is created.
* When an offer is `accepted`, `application.status` remains `offered`. The accepted offer serves as the eligibility condition for the explicit `/hire` operation.

---

## 4. Single Authoritative Candidate Conversion Workflow

To eliminate competing hiring triggers, candidate conversion is initiated **only** via the explicit hiring endpoint:

$$\text{Decision} \rightarrow \text{Offer Issued (application: offered)} \rightarrow \text{Offer Accepted (application: offered)} \rightarrow \text{Explicit POST .../hire} \rightarrow \text{Atomic Conversion}$$

```text
POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire
                               │
                               ▼
BEGIN DATABASE TRANSACTION
 ├── 1. Lock Target Position Row (SELECT ... FROM recruitment_positions WHERE id = $1 FOR UPDATE)
 ├── 2. Validate Application Status: application.status == 'offered'
 ├── 3. Validate Accepted Offer: Exactly one offer for application has status == 'accepted'
 ├── 4. Validate Headcount Availability: (position.hired_count < position.openings_count)
 ├── 5. Resolve Person Identity (Strict Non-Automated Rule):
 │       ├── Case A: IF candidate.internal_person_id IS NOT NULL:
 │       │     ├── Validate internal_person_id belongs to :orgId
 │       │     ├── Use existingPerson.id = candidate.internal_person_id
 │       │     └── Insert M2 employments (new employment record for target role/unit)
 │       └── Case B: IF candidate.internal_person_id IS NULL:
 │             ├── Check if any M2 Person in :orgId has matching normalized email
 │             ├── IF match found:
 │             │     └── ABORT transaction, return 409 IDENTITY_CONFLICT (No silent auto-linking)
 │             └── ELSE:
 │                   ├── Insert M2 people (first_name, last_name, email, phone)
 │                   └── Insert M2 employments (role_id, BU, department, start_date)
 ├── 6. Update Target Application & Candidate:
 │       ├── recruitment_candidates.converted_person_id = personId
 │       ├── recruitment_candidates.status = 'hired'
 │       ├── recruitment_applications.status = 'hired'
 │       └── recruitment_applications.hired_at = NOW()
 ├── 7. Auto-Withdraw Concurrent Active Applications:
 │       ├── For every other application of candidate_id where status NOT IN ('hired', 'rejected', 'withdrawn'):
 │       │     ├── status = 'withdrawn'
 │       │     ├── withdrawn_at = NOW()
 │       │     ├── withdrawn_reason = 'candidate_hired_elsewhere'
 │       │     ├── Record stage skip record in recruitment_application_stages
 │       │     ├── Record Audit Log (APPLICATION_WITHDRAWN)
 │       │     └── Stage Outbox Event (recruitment.application.withdrawn)
 ├── 8. Update Position Headcount:
 │       ├── recruitment_positions.hired_count = hired_count + 1
 │       └── IF hired_count == openings_count THEN status = 'closed', closed_at = NOW()
 ├── 9. Record Immutable Audit Log (AuditService.recordLog: RECRUITMENT_CANDIDATE_HIRED)
 └── 10. Stage Outbox Event (OutboxService.stageOutboxEvent: recruitment.candidate.hired)
COMMIT DATABASE TRANSACTION
                               │
                               ▼
Post-Commit Outbox Dispatch (OutboxService.dispatchImmediate -> eventBus.publish)
```

---

## 5. Tenant Isolation Architecture (Three-Layer Defense)

Every recruitment operation enforces strict tenant isolation:

1. **Database Scoping**: Every table contains `organization_id NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
2. **Service-Level Cross-Domain Validation**: Services explicitly verify that all referenced entities belong to the caller's organization:
   $$\text{Request Organization} = \text{Recruitment Entity Organization} = \text{Referenced Entity Organization}$$
   - Position: validates `BU`, `Department`, `Team`, `Role`, `Hiring Manager`, and `Recruiter`.
   - Application: validates `Candidate`, `Position`, and `Stage`.
   - Stage: validates `Evaluator`.
   - Trial: validates `Mentor`.
   - Offer: validates `Proposed Role`.
   Any foreign organization reference causes immediate rejection with HTTP `404 Not Found`.
3. **Authorization Context Boundary**: Validated via `resolveTenant` middleware and contextual permissions.

---

## 6. Subsystem Integration Matrix

| Requirement | Authoritative Engine | Integration Boundary |
|---|---|---|
| **Candidate Identity** | M13 Recruitment | `recruitment_candidates` table |
| **Hiring Requisition** | M13 Recruitment | `recruitment_positions` table |
| **Application Funnel** | M13 Recruitment | `recruitment_applications`, `recruitment_application_stages` |
| **Pipeline Taxonomy** | M13 Recruitment | `recruitment_pipeline_stages` master data |
| **Lightweight Triage** | M13 Recruitment | `notes` field in `recruitment_application_stages` |
| **Formal Assessments** | M8 Evaluation Engine | Linked `evaluation_id` pointing to M8 `evaluations` |
| **Interview Logistics** | M6 Meetings Engine | Linked `meeting_id` pointing to M6 `meetings` |
| **Interview Scorecard** | M8 Evaluation Engine | Linked `evaluation_id` pointing to M8 `evaluations` |
| **Trial Audition Review**| M8 Evaluation Engine | Linked `evaluation_id` pointing to M8 `evaluations` |
| **Trial Assignments** | M3 Assignment Engine | Linked `assignment_id` (only for candidates with M2 Person identity) |
| **Trial Work Activity** | M5 Work Engine | Standard `work_records` (only for candidates with M2 Person identity) |
| **Learning Tracks** | M7 Learning Engine | Formal enrollment requires M2 Person; candidates are assessed via M8 |
| **Offer Commitments** | M9 Finance Engine | Linked `financial_obligation_id` for approved upfront obligations |
| **Personnel Identity** | M2 People Engine | Converted `people` record upon hire |
| **Employment Contract** | M2 People Engine | Converted `employments` record upon hire |
| **Audit Logging** | M10 Audit Engine | Atomic calls to `AuditService.recordLog` within transaction |
| **Domain Events** | M10 Events Engine | Atomic staging via `OutboxService.stageOutboxEvent` + post-commit dispatch |
| **Recruitment KPIs** | M11 Analytics Engine | Read-only metric queries over M13 operational tables |

---

## 7. Contextual Authorization & Capabilities

Recruitment permissions adhere to the established contextual framework: `Role + Business Unit + Team + Project`.

| Capability | Scope & Meaning | Permitted Contextual Roles |
|---|---|---|
| `recruitment:view` | View positions, candidates, and applications | Org Admin, BU Head, Hiring Manager, Recruiter, Interviewer |
| `recruitment:create` | Create new job requisitions and candidate records | Org Admin, BU Head, Recruiter |
| `recruitment:manage` | Edit positions, advance pipeline stages, schedule trials | Org Admin, Recruiter, Assigned Hiring Manager |
| `recruitment:screen` | Perform initial triage and resume reviews | Org Admin, Recruiter, Designated Screener |
| `recruitment:assess` | Conduct evaluations and technical scorecards | Designated Evaluator, Interview Panelist |
| `recruitment:decide` | Record hiring verdicts and execute candidate conversion | Org Admin, BU Head, Hiring Manager |
| `recruitment:offer` | Draft, issue, rescind, and record offer responses | Org Admin, HR / Recruiting Lead |
| `recruitment:admin` | Configure pipeline stages, master data, and defaults | Org Admin, Platform Admin |

---

## 8. Canonical Domain Events

All domain events conform to M10 event definitions and are published strictly post-commit:

1. `recruitment.position.created`
2. `recruitment.position.opened`
3. `recruitment.position.paused`
4. `recruitment.position.closed`
5. `recruitment.candidate.created`
6. `recruitment.candidate.updated`
7. `recruitment.application.created`
8. `recruitment.application.stage_changed`
9. `recruitment.application.rejected`
10. `recruitment.application.withdrawn` (emitted both on manual withdrawal and automatic concurrent withdrawal upon hire)
11. `recruitment.trial.scheduled`
12. `recruitment.trial.started`
13. `recruitment.trial.completed`
14. `recruitment.offer.issued`
15. `recruitment.offer.accepted`
16. `recruitment.offer.rejected`
17. `recruitment.offer.rescinded`
18. `recruitment.candidate.hired`
