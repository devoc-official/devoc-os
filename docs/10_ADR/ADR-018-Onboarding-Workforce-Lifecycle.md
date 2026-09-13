# ADR-018: Workforce Onboarding & Lifecycle Engine Architecture

## Status

**Proposed / Draft Architecture — Revised**

## Context

Following candidate recruitment and hiring conversion in Milestone 13, DeVoc OS requires an operational orchestration layer to handle newly hired employee onboarding, active organizational movements (Transfers and Promotions), and controlled employee exits (Offboarding).

Without a dedicated orchestration engine, modules risk duplicating identity records, creating parallel employment tables, or bypassing established assignment, learning, evaluation, and audit boundaries.

## Decision

We establish **Milestone 14 — Workforce Onboarding & Lifecycle Orchestration Engine** according to the following foundational decisions:

### 1. Identity & Employment Primacy (M2 Boundary)
M14 shall **NOT** create duplicate `Person` or `Employee` records. All M14 onboarding plans, task assignments, transfer workflows, promotion requests, and offboarding records strictly reference M2 `people` (`person_id`) and M2 `employments` (`employment_id`). M2's authoritative employment status lifecycle (`probation` $\rightarrow$ `active` $\rightarrow$ `suspended` $\rightarrow$ `terminated`/`resigned`) is strictly respected. Offboarding execution triggers M2 `EmploymentService` transitions atomically.

### 2. Assignment Primacy & Task Responsibility (M3 Boundary)
M14 shall **NOT** create duplicate assignment tables such as `employee_projects`, `employee_teams`, `employee_roles`, `onboarding_members`, or `onboarding_assignees`. Onboarding task responsibility is authoritatively maintained using M3 `assignments` with `target_type = 'task'` and `target_id = task.id`. Mentor responsibility uses M3 `assignments` with `target_type = 'team'`, `'department'`, `'student'`, or `'task'` and `assignment_type = 'mentor'`.

### 3. Template Requirement Definitions
Onboarding templates define required compliance items via `workforce_onboarding_template_items`. Instantiated onboarding plan items (`workforce_onboarding_items`) inherit from these definitions, maintaining compliance status (`pending` $\rightarrow$ `submitted` $\rightarrow$ `verified` / `rejected` / `skipped`) without storing binary document files inside M14.

### 4. Promotion Authority Boundaries
Promotion workflows explicitly distinguish:
- **Job Position / Title**: Updated in M2 `employments.job_title`.
- **System / Organizational Role**: Updated in M2 `person_roles` / M12 `roles`.
- **Operational Responsibilities**: Updated in M3 `assignments`.

M14 shall not create a promotion-specific role table.

### 5. Automatic Post-Hire Onboarding Trigger (M13 Integration)
Automatic onboarding plan creation occurs via the M10 outbox event consumer handling `recruitment.candidate.hired` emitted by M13 `/hire`. Manual API plan initiation (`POST /onboarding-plans`) exists strictly as an authorized administrative backup operation.

### 6. Financial Obligation & Clearance (M9 Boundary)
Exit clearance items (`workforce_offboarding_clearances`) optionally link to M9 `finance_obligations` via `financial_obligation_id`. Service-level validation strictly enforces same-tenant ownership (`financial_obligations.organization_id = clearance.organization_id`). No finance account tables or payroll logic exist in M14.

### 7. Centralized Capability Authorization
M14 endpoint access is enforced via `requireCapability(capability)` using the centralized permissions module in `src/permissions/permissions.middleware.ts`. Required capabilities include `workforce:view`, `workforce:create`, `workforce:manage`, `workforce:admin`, `workforce:approve`.

### 8. Transactional Outbox Pattern (M10 Integration)
All M14 domain mutations enforce strict transactional outbox semantics (`withTransaction` $\rightarrow$ state mutation $\rightarrow$ audit log $\rightarrow$ outbox event staging $\rightarrow$ `COMMIT` $\rightarrow$ post-commit event dispatch).

## Consequences

### Positive
- Ensures complete domain cohesion without redundant identity, assignment, or employment storage.
- Standardizes post-hire onboarding and employee lifecycle workflows across all business units.
- Eliminates duplicate task responsibility sources by strictly delegating task assignments to M3.
- Guarantees full auditability and event-driven cross-domain integration via M10 Outbox.
- Prevents security vulnerabilities through centralized capability-based authorization and mandatory tenant scoping.

### Negative / Trade-offs
- Workflow executions require multi-step service coordination across M2, M3, M9, M10, and M14 boundaries.
- Exit clearances require manual or programmatic verification step aggregation prior to final employment termination.

