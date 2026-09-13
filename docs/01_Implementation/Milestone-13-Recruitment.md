# Milestone 13 — Recruitment & Talent Acquisition Implementation Specification

## Status

**Architecture Draft — implementation pending.**

---

## 1. Purpose & Scope

Milestone 13 establishes the **Recruitment & Talent Acquisition Engine** for DeVoc OS. It introduces an upstream talent funnel that manages organizational hiring requisitions (Positions), applicant profiles (Candidates), multi-stage hiring processes (Applications), practical auditions (Trials), and formal employment agreements (Offers).

Crucially, M13 bridges the gap between external talent and organizational personnel by providing an atomic, auditable **Candidate $\rightarrow$ Person Conversion** pipeline into the M2 People Engine.

### Scope Boundaries
* **In Scope**:
  - Requisition lifecycle management (`recruitment_positions`).
  - Candidate identity management and sourcing (`recruitment_candidates`).
  - Configurable multi-stage recruitment pipelines (`recruitment_pipeline_stages`, `recruitment_applications`).
  - Screening, technical assessment, and interview session coordination.
  - Practical candidate trials with real task assignments (`recruitment_trials`).
  - Compensation proposals and offer negotiations (`recruitment_offers`).
  - Atomic hiring conversion into `Person` and `Employment` entities in M2.
  - Canonical event emission via M10 transactional outbox.
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
   ├── Stage 1: Screening (Triage & Resume Review)
   ├── Stage 2: Assessment (Delegated to M8 Evaluation Engine)
   ├── Stage 3: Interview (Delegated to M6 Meetings Engine & M8 Evaluation)
   ├── Stage 4: Trial (Delegated to M3 Assignments, M5 Work & M8 Evaluation)
   └── Stage 5: Decision & Offer (Terms & Terms Tracking)
         │
         ▼ (Offer Accepted)
Candidate Conversion Transaction
   │
   ├── Provision / Link M2 Person (people)
   ├── Create M2 Employment (employments)
   ├── Record Audit Log (M10 AuditService)
   └── Stage Outbox Event (recruitment.candidate.hired)
         │
         ▼
Core DeVoc Backbone (Person → Role → Assignment → Work → Evaluation → Analytics)
```

---

## 3. Implementation Components

### 3.1 Domain Layer (`src/modules/recruitment/domain`)
* **`PositionEntity`**: Validates salary boundaries, openings count, target role references, and lifecycle state transitions (`draft` $\rightarrow$ `open` $\rightarrow$ `paused` $\rightarrow$ `closed` $\rightarrow$ `archived`).
* **`CandidateEntity`**: Validates email format, phone format, sourcing channel, skills arrays, and conversion pointer immutability.
* **`ApplicationEntity`**: Enforces pipeline progression, terminal states (`rejected`, `withdrawn`, `hired`), and active application uniqueness per position.
* **`TrialEntity`**: Enforces date ranges, status transitions (`scheduled` $\rightarrow$ `active` $\rightarrow$ `completed` $\rightarrow$ `terminated`), and operational links.
* **`OfferEntity`**: Enforces positive compensation values, frequency validation, expiration logic, and response state machines.

### 3.2 Repositories (`src/modules/recruitment/infrastructure`)
* `PositionRepository`: Requisition CRUD, status filtering, headcount updates.
* `CandidateRepository`: Candidate profile persistence, normalized email indexing, deduplication queries.
* `PipelineStageRepository`: Master data queries for tenant pipeline sequences.
* `ApplicationRepository`: Application queries, stage history tracking, candidate history aggregation.
* `TrialRepository`: Audition scheduling and operational link persistence.
* `OfferRepository`: Employment offer persistence, active offer constraints.

### 3.3 Application Services (`src/modules/recruitment/application`)
* **`PositionService`**: Requisition creation, publication, pausing, closing, and headcount reconciliation.
* **`CandidateService`**: Candidate registration, profile enrichment, deduplication checks.
* **`ApplicationService`**: Multi-stage funnel progression, screening evaluations, interview coordination (M6), technical assessments (M8).
* **`TrialService`**: Audition setup, guest person allocation, M3 assignment binding, M8 trial review linkage.
* **`OfferService`**: Drafting, issuing, candidate response recording, M9 financial obligation binding.
* **`HiringService`**: Atomic candidate conversion transaction into M2 `Person` and `Employment`.

### 3.4 API Controllers & Routes (`src/modules/recruitment/api`)
* Mounted at `/api/v1/recruitment` and `/api/v1/organizations/:orgId/recruitment`.
* Protected by `authenticate`, `resolveTenant`, and contextual permission checks (`requireCapability`).

---

## 4. Cross-Domain Subsystem Integration

1. **People Engine (M2)**: Target roles (`roles`), interviewers/evaluators (`people`), and final conversion (`people`, `employments`).
2. **Assignment Engine (M3)**: Trial project/task assignments (`assignments`).
3. **Work Engine (M5)**: Trial activity logging (`work_records`).
4. **Meetings Engine (M6)**: Interview panel coordination (`meetings`).
5. **Evaluation Engine (M8)**: Technical scorecards and trial evaluations (`evaluations`).
6. **Finance Engine (M9)**: Planned compensation budget allocations (`financial_obligations`).
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
* `recruitment:decide`: Issue hiring verdicts (`hire`, `reject`, `hold`).
* `recruitment:offer`: Draft and issue formal employment offers.
* `recruitment:admin`: Configure tenant pipeline stages and defaults.

### Tenant Isolation
* Every database query filters by `organization_id`.
* Route handlers verify that requested entity belongs to caller's authenticated organization.
* Cross-tenant access returns HTTP `404 Not Found`.

---

## 6. Audit & Outbox Event Protocol

All administrative and recruitment state changes strictly adhere to the M10 invariant:

$$\text{Domain Mutation} + \text{Audit Log} + \text{Outbox Event} \xrightarrow{\text{COMMIT}} \text{Post-Commit Dispatch} \rightarrow \text{eventBus.publish}$$

No domain event may ever be emitted to the in-process event bus before transaction commit.

### Canonical Events
* `recruitment.position.created`
* `recruitment.position.opened`
* `recruitment.position.closed`
* `recruitment.candidate.created`
* `recruitment.application.created`
* `recruitment.application.stage_changed`
* `recruitment.application.rejected`
* `recruitment.application.withdrawn`
* `recruitment.trial.started`
* `recruitment.trial.completed`
* `recruitment.offer.issued`
* `recruitment.offer.accepted`
* `recruitment.offer.rejected`
* `recruitment.candidate.hired`

---

## 7. Migration Plan

* **File**: `migrations/013_recruitment_m13_schema.sql` (to be created during implementation phase).
* Creates 7 new tables with appropriate UUID keys, foreign key constraints, check constraints, and performance indexes.
* Seeds default pipeline stages (`APPLIED`, `SCREENING`, `ASSESSMENT`, `INTERVIEW`, `TRIAL`, `DECISION`, `OFFER`, `HIRED`) for default organizations.

---

## 8. Testing Strategy

### Unit Tests
* Position state transitions and salary validation.
* Candidate email normalization and profile validation.
* Application pipeline progression invariants.
* Trial date validation and status machine.
* Offer compensation validation and state machine.

### Integration & API Tests
* Requisition CRUD and publication lifecycle.
* Candidate registration and deduplication checks.
* Application progression through stages.
* Interview scheduling (M6) and assessment linkage (M8).
* Trial assignment (M3) and work logging (M5).
* Offer issuance, rejection, revision, and acceptance.
* Atomic Candidate $\rightarrow$ Person conversion transaction.
* Event transaction semantics (rollback $\rightarrow$ 0 events; commit $\rightarrow$ post-commit dispatch).

### Tenant Isolation Tests
* Cross-tenant position access rejection (404).
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
