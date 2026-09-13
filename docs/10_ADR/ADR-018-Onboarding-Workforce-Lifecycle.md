# ADR-018: Workforce Onboarding & Lifecycle Engine Architecture

## Status

**Proposed / Draft Architecture**

## Context

Following candidate recruitment and hiring conversion in Milestone 13, DeVoc OS requires an operational orchestration layer to handle newly hired employee onboarding, active organizational movements (Transfers and Promotions), and controlled employee exits (Offboarding).

Without a dedicated orchestration engine, modules risk duplicating identity records, creating parallel employment tables, or bypassing established assignment, learning, evaluation, and audit boundaries.

## Decision

We establish **Milestone 14 — Workforce Onboarding & Lifecycle Orchestration Engine** according to the following foundational decisions:

### 1. Identity & Employment Primacy (M2 Boundary)
M14 shall **NOT** create duplicate `Person` or `Employee` records. All M14 onboarding plans, task assignments, transfer workflows, promotion requests, and offboarding records strictly reference M2 `people` (`person_id`) and M2 `employments` (`employment_id`).

### 2. Assignment Primacy (M3 Boundary)
M14 shall **NOT** create duplicate assignment tables such as `employee_projects`, `employee_teams`, `employee_roles`, `onboarding_members`, or `onboarding_assignees`. All organizational placement, team involvement, project responsibilities, and mentor assignments are created and updated exclusively through M3 `assignments`.

### 3. M2 Employment Status & Movement Ownership
M2 `employments` remains the sole transactional source of truth for employment status (`active`, `suspended`, `terminated`, `resigned`). M14 orchestrates workflow processes (`workforce_transfers`, `workforce_promotions`, `workforce_offboardings`). Upon approval and execution, M14 updates M2 `employments` (`job_title`, `department_id`, `business_unit_id`, `manager_id`, `end_date`, `status`) inside an atomic database transaction.

### 4. Document Metadata Only (No Content Storage)
Onboarding compliance items (`workforce_onboarding_items`) store document metadata, policy verification timestamps, and external URL references only. M14 shall not store binary file blobs or sensitive document payloads.

### 5. Financial Obligation & No Payroll (M9 Boundary)
M14 offboarding clearances verify equipment return and departmental sign-offs without duplicating accounting or payroll processing. Financial obligation clearance references M9 Finance. No payroll disbursement logic exists in M14.

### 6. Centralized Capability Authorization
M14 endpoint access is enforced via `requireCapability(capability)` using the centralized permissions module in `src/permissions/permissions.middleware.ts`. Required capabilities include `workforce:view`, `workforce:create`, `workforce:manage`, `workforce:admin`, `workforce:approve`.

### 7. Transactional Outbox Pattern (M10 Integration)
All M14 domain mutations enforce strict transactional outbox semantics (`withTransaction` $\rightarrow$ state mutation $\rightarrow$ audit log $\rightarrow$ outbox event staging $\rightarrow$ `COMMIT` $\rightarrow$ post-commit event dispatch).

## Consequences

### Positive
- Ensures complete domain cohesion without redundant identity, assignment, or employment storage.
- Standardizes post-hire onboarding and employee lifecycle workflows across all business units.
- Guarantees full auditability and event-driven cross-domain integration via M10 Outbox.
- Prevents security vulnerabilities through centralized capability-based authorization and mandatory tenant scoping.

### Negative / Trade-offs
- Workflow executions require multi-step service coordination across M2, M3, M10, and M14 boundaries.
- Exit clearances require manual or programmatic verification step aggregation prior to final employment termination.
