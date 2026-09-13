# Milestone 13 — Recruitment & Talent Acquisition Implementation Specification

## Status

**Architecture Draft — implementation pending.**

---

## 1. Purpose & Scope

Milestone 13 establishes the **Recruitment & Talent Acquisition Engine** for DeVoc OS. It introduces an upstream talent funnel that manages organizational hiring requisitions (Positions), applicant profiles (Candidates), multi-stage hiring processes (Applications), practical auditions (Trials), and formal employment agreements (Offers).

Crucially, M13 bridges the gap between external talent and organizational personnel by providing an atomic, auditable, and single-authority **Candidate $\rightarrow$ Person Conversion** pipeline into the M2 People Engine.

### Scope Boundaries
* **In Scope**:
  - Requisition lifecycle management (`recruitment_positions`) with strict headcount invariants ($0 \le \text{hired\_count} \le \text{openings\_count}$). Closed positions cannot reopen.
  - Candidate identity management and sourcing (`recruitment_candidates`) with decoupled candidate stance (`active`, `hired`, `archived`).
  - Configurable multi-stage recruitment pipelines (`recruitment_pipeline_stages`, `recruitment_applications`).
  - Authoritative 10-state application machine (`applied`, `screening`, `assessment`, `interview`, `trial`, `decision`, `offered`, `hired`, `rejected`, `withdrawn`).
  - Screening, technical assessment, and interview session coordination linking M8 Evaluations and M6 Meetings without data duplication, while respecting identity boundaries (M8 evaluations, M3 assignments, M5 work records apply ONLY to candidates holding an authorized M2 Person identity; external candidate auditions use native M13 deliverable summaries and triage notes).
  - Practical candidate trials (`recruitment_trials`) bounded by audition deliverable reviews for external candidates and M3/M5/M8 integration for existing personnel.
  - Compensation proposals and offer negotiations (`recruitment_offers`) with mutually exclusive terminal response states (`accepted`, `rejected`, `rescinded`, `expired`).
  - Single authoritative candidate conversion via explicit `POST .../applications/:id/hire` executing atomically under pessimistic concurrency locking.
  - Strict non-automated identity resolution: external candidate email collisions with existing personnel produce explicit `409 IDENTITY_CONFLICT` errors rather than silent linking.
  - Automatic concurrent active applications withdrawal (`candidate_hired_elsewhere`) during hiring conversion.
  - Canonical event emission via M10 transactional outbox (zero pre-commit publishing).
  - Recruitment operational metrics exposed to M11 Analytics.
* **Out of Scope (Non-Goals)**:
  - Payroll execution and salary disbursement (M9 / External payroll).
  - External job board scraping or candidate aggregator syndication.
  - AI automated resume screening, ranking, or auto-rejections.
  - Video calling or real-time communication streaming.
  - Public-facing career portal or mobile applicant interfaces.
  - Microservices infrastructure (modular monolith architecture preserved).

---

## 2. Conceptual Architecture & Operational Integration

```text
Position (Requisition)
   │
   ▼
Candidate (Applicant Profile)
   │
   ▼
Application (Pipeline Process)
   │
   ├── Stage 1: Screening (Triage & Resume Review Notes)
   ├── Stage 2: Assessment (M8 Evaluation Engine via evaluation_id ONLY if candidate is existing Person)
   ├── Stage 3: Interview (Delegated to M6 Meetings Engine; M8 Evaluation if candidate is existing Person)
   ├── Stage 4: Trial (Deliverables & Outcome Notes in M13; M3/M5/M8 ONLY if candidate holds M2 Person)
   └── Stage 5: Decision & Offer
         │
         ├── Offer Issued (application.status = offered)
         └── Offer Accepted (application.status remains offered)
               │
               ▼
Explicit /hire Conversion Endpoint (POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire)
   │
   ├── 1. Row-Level Lock on Position (SELECT ... FOR UPDATE)
   ├── 2. Validate application.status == 'offered' & offer.status == 'accepted'
   ├── 3. Verify Headcount Availability (hired_count < openings_count)
   ├── 4. Non-Automated Identity Resolution:
   │       ├── IF internal_person_id: link existing M2 Person & insert Employment
   │       ├── IF external & email matches existing Person: abort with 409 IDENTITY_CONFLICT
   │       └── ELSE: insert new M2 Person & new M2 Employment
   ├── 5. Transition Target Application & Candidate to 'hired'
   ├── 6. Auto-Withdraw Concurrent Active Applications (candidate_hired_elsewhere)
   ├── 7. Increment Position hired_count (if full -> status = 'closed')
   ├── 8. Record Audit Logs (M10 AuditService)
   └── 9. Stage Outbox Events (recruitment.candidate.hired, recruitment.application.withdrawn)
COMMIT TRANSACTION
   │
   ▼
Post-Commit Outbox Dispatch (eventBus.publish)
   │
   ▼
Core DeVoc Backbone (Person → Role → Assignment → Work → Evaluation → Analytics)
```

---

## 3. Implementation Components

### 3.1 Domain Layer (`src/modules/recruitment/domain`)
* **`PositionEntity`**: Validates salary boundaries, openings count, target role references, headcount limits, and lifecycle state transitions (`draft` $\rightarrow$ `open` $\rightarrow$ `paused` $\rightarrow$ `closed` $\rightarrow$ `archived`). Closed requisitions cannot reopen.
* **`CandidateEntity`**: Validates email format, phone format, sourcing channel, skills arrays, conversion pointer immutability, and decoupled status (`active`, `hired`, `archived`).
* **`ApplicationEntity`**: Enforces pipeline progression, terminal states (`rejected`, `withdrawn`, `hired`), and active application uniqueness per position.
* **`TrialEntity`**: Enforces date ranges, status transitions (`scheduled` $\rightarrow$ `active` $\rightarrow$ `completed` $\rightarrow$ `terminated`), deliverables summary, and identity boundary constraints.
* **`OfferEntity`**: Enforces positive compensation values, frequency validation, expiration logic, and mutually exclusive response states from `issued`.

### 3.2 Repositories (`src/modules/recruitment/infrastructure`)
* `PositionRepository`: Requisition CRUD, status filtering, headcount concurrency updates (`FOR UPDATE`).
* `CandidateRepository`: Candidate profile persistence, normalized email indexing, deduplication queries.
* `PipelineStageRepository`: Master data queries for tenant pipeline sequences.
* `ApplicationRepository`: Application queries, stage history tracking, candidate history aggregation, concurrent active applications query.
* `TrialRepository`: Audition scheduling and operational link persistence.
* `OfferRepository`: Employment offer persistence, active offer constraints.

### 3.3 Application Services (`src/modules/recruitment/application`)
* **`PositionService`**: Requisition creation, publication, pausing, closing, and headcount reconciliation.
* **`CandidateService`**: Candidate registration, profile enrichment, deduplication checks.
* **`ApplicationService`**: Multi-stage funnel progression, screening evaluations, interview coordination (M6), technical assessments (M8).
* **`TrialService`**: Audition setup, mentor assignment, deliverable summary recording.
* **`OfferService`**: Drafting, issuing, candidate response recording, M9 financial obligation binding.
* **`HiringService`**: Single authoritative candidate conversion transaction into M2 `Person` and `Employment`, with explicit identity resolution and auto-withdrawal of concurrent applications.

### 3.4 API Controllers & Routes (`src/modules/recruitment/api`)
* Mounted strictly at `/api/v1/organizations/:orgId/recruitment/...`.
* Protected by `authenticate`, `resolveTenant`, and contextual permission checks (`requireCapability`).

---

## 4. Cross-Domain Subsystem Integration

1. **People Engine (M2)**: Target roles (`roles`), interviewers/evaluators (`people`), and final conversion (`people`, `employments`). Internal candidates reference `internal_person_id` to prevent duplicate `people` records. Email collisions on external candidates require administrative resolution.
2. **Assignment Engine (M3)**: Trial project/task assignments (`assignments`) ONLY for candidates holding an authorized M2 Person identity.
3. **Work Engine (M5)**: Trial activity logging (`work_records`) ONLY for candidates holding an authorized M2 Person identity.
4. **Meetings Engine (M6)**: Interview panel coordination (`meetings`).
5. **Evaluation Engine (M8)**: Technical scorecards and trial evaluations (`evaluations`) ONLY for candidates holding an authorized M2 Person identity or post-hire personnel.
6. **Finance Engine (M9)**: Planned compensation budget allocations (`financial_obligations`). Offers do not execute payroll.
7. **Audit & Events (M10)**: Audit trail (`audit_logs`) and outbox event dispatch (`event_outbox`).
8. **Analytics Engine (M11)**: Funnel metrics registration (`analytics_metrics`).

---

## 5. Security & Authorization Specifications

### Contextual Capabilities
* `recruitment:view`: View positions, candidates, and applications.
* `recruitment:create`: Create requisitions and candidate entries.
* `recruitment:manage`: Advance pipeline stages, manage trial logistics.
* `recruitment:screen`: Perform initial triage and resume reviews.
* `recruitment:assess`: Conduct technical scorecards and interview ratings.
* `recruitment:decide`: Issue hiring verdicts and execute candidate conversion.
* `recruitment:offer`: Draft, issue, rescind, and record offer responses.
* `recruitment:admin`: Configure tenant pipeline stages and defaults.

### Tenant Isolation (Three-Layer Defense)
* Every database query filters by `organization_id`.
* Application services validate that all cross-domain references (BU, department, team, role, manager, recruiter, evaluator, mentor) belong to the caller's organization.
* Cross-tenant access returns HTTP `404 Not Found`.

---

## 6. Audit & Outbox Event Protocol

All administrative and recruitment state changes strictly adhere to the M10 invariant:

$$\text{Domain Mutation} + \text{Audit Log} + \text{Outbox Event} \xrightarrow{\text{COMMIT}} \text{Post-Commit Dispatch} \rightarrow \text{eventBus.publish}$$

No domain event may ever be emitted to the in-process event bus before transaction commit.

### Canonical Events
* `recruitment.position.created`
* `recruitment.position.opened`
* `recruitment.position.paused`
* `recruitment.position.closed`
* `recruitment.candidate.created`
* `recruitment.candidate.updated`
* `recruitment.application.created`
* `recruitment.application.stage_changed`
* `recruitment.application.rejected`
* `recruitment.application.withdrawn`
* `recruitment.trial.scheduled`
* `recruitment.trial.started`
* `recruitment.trial.completed`
* `recruitment.offer.issued`
* `recruitment.offer.accepted`
* `recruitment.offer.rejected`
* `recruitment.offer.rescinded`
* `recruitment.candidate.hired`

---

## 7. Migration Plan

* **File**: `migrations/013_recruitment_m13_schema.sql` (to be created during implementation phase).
* Creates 7 new tables with appropriate UUID keys, foreign key constraints, check constraints, and performance indexes.
* Seeds default pipeline stages (`APPLIED`, `SCREENING`, `ASSESSMENT`, `INTERVIEW`, `TRIAL`, `DECISION`, `OFFER`, `HIRED`) for default organizations.

---

## 8. Testing Strategy

### Unit Tests
* Position state transitions, salary validation, and headcount limit enforcement.
* Candidate email normalization, profile validation, and decoupled status machine.
* Application pipeline progression invariants and terminal states.
* Trial date validation, Option C identity enforcement (deliverables for external; M3/M5/M8 for internal).
* Offer compensation validation, mutually exclusive response states.

### Integration & API Tests
* Requisition CRUD, publication lifecycle, and terminal closure.
* Candidate registration and deduplication checks.
* Application progression through stages.
* Interview scheduling (M6).
* Offer issuance, rejection, revision, and acceptance.
* Explicit atomic Candidate $\rightarrow$ Person conversion transaction with headcount row-locking (`FOR UPDATE`).
* Concurrency test: simultaneous hire requests cannot exceed `openings_count`.
* Identity conflict test: external candidate with email matching existing Person throws `409 IDENTITY_CONFLICT`.
* Concurrent applications auto-withdrawal test: hiring on one application automatically withdraws other active applications for that candidate with reason `candidate_hired_elsewhere`.
* Event transaction semantics (rollback $\rightarrow$ 0 events; commit $\rightarrow$ post-commit dispatch).

### Tenant Isolation Tests
* Cross-tenant position access rejection (404).
* Cross-tenant cross-reference validation (BU, Department, Team, Role, Manager from foreign tenant rejected with 404).
* Cross-tenant candidate profile leakage prevention (404).
* Cross-tenant application progression prevention (404).
* Cross-tenant offer viewing and acceptance prevention (404).

---

## 9. Planned Implementation Sequence

1. Database migration `013_recruitment_m13_schema.sql`.
2. Seed default pipeline stages.
3. Domain entities and repository layer (`src/modules/recruitment/domain`, `infrastructure`).
4. Application services (`PositionService`, `CandidateService`, `ApplicationService`, `TrialService`, `OfferService`, `HiringService`).
5. REST API controllers and routing (`src/modules/recruitment/api`).
6. Subsystem integration hooks (M3, M5, M6, M8, M9, M10, M11).
7. Comprehensive unit, integration, and tenant-isolation test suites.
8. Regression validation across M1–M12.
