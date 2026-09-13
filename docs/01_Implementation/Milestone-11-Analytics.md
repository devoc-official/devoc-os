# Milestone 11 — Analytics Engine Implementation Specification

## Status

**Architecture frozen — implementation pending.**

## Objective

Milestone 11 establishes a read-only, extensible, multi-tenant **Analytics Engine** for DeVoc OS. It provides decision-support insights, performance metrics, key performance indicators (KPIs), and saved reports across all established operational domains (Organization, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit/Events) without duplicating operational entities or altering domain state.

M11 is a read-oriented analytical milestone. It operates as a modular-monolith engine within PostgreSQL, using an explicit Analytics Source Registry, declarative metric specifications, parameter-bound SQL query building, and contextual authorization.

---

## Core Architectural Principles

```text
               ┌─────────────────────────────────────────────────────────┐
               │    Operational Source of Truth (M1–M10 PostgreSQL)     │
               │ work_logs, criterion_results, learning_enrollments, etc. │
               └────────────────────────────┬────────────────────────────┘
                                            │
                                            │ Parameterized Read-Only Queries (Allowlist Validated)
                                            ▼
               ┌─────────────────────────────────────────────────────────┐
               │              Analytics Computation Engine               │
               │   (Registry-Validated Spec Evaluator & Query Builder)   │
               └──────────────┬───────────────────────────┬──────────────┘
                              │                           │
              Live Aggregation│                           │ Immutable Append-Only Snapshot
                              ▼                           ▼
               ┌─────────────────────────────┐  ┌─────────────────────────┐
               │    Live Metric Result       │  │ analytics_metric_results│
               │  (Calculated On-Demand)     │  │  (Versioned Historical) │
               └──────────────┬──────────────┘  └─────────────┬───────────┘
                              │                               │
                              └───────────────┬───────────────┘
                                              ▼
                               ┌──────────────────────────────┐
                               │  REST API (/api/v1/analytics)│
                               │   (Contextual Auth Scoped)   │
                               └──────────────────────────────┘
```

1. **Non-Authoritative & Read-Only**: Operational domain engines (M1–M10) remain the sole authoritative source of truth. Analytics computes derived views, aggregations, and trends; it never owns or mutates transactional entities.
2. **Reconciled Physical Source Entities**: All analytics queries operate directly against established physical table names (`work_logs`, `criterion_results`, `learning_enrollments`, `learning_programs`, `financial_obligations`, `financial_transactions`, `financial_parties`, `finance_categories`, `financial_budgets`, `people`, `employments`, `assignments`, `projects`, `tasks`, `meetings`, `audit_logs`).
3. **Declarative Metric Safety & Allowlist Registry**: Metrics are specified via an explicit Analytics Source Registry defining allowed entities, fields, operators, dimensions, joins, and aggregations. Raw SQL strings, dynamic SQL concatenation, and runtime code execution (`eval()`) are strictly prohibited. All execution resolves through a controlled parameter-bound query builder.
4. **Strict Multi-Tenant Scoping**: Every metric definition, snapshot result, and saved report mandates `organization_id`. Cross-tenant queries return HTTP `404 Not Found`.
5. **Contextual Scope-Bound Security**: Analytics access reuses the established DeVoc OS authorization model: `Role + Business Unit + Team + Project`. Setting `isPublic = true` on a saved report shares the report template configuration, NOT data access. Every report execution independently re-evaluates the executing user's authorized organizational scope against every underlying metric and source table.
6. **Immutable Versioned Metric Snapshots**: Persisted rows in `analytics_metric_results` are strictly append-only and immutable. Recalculations append a new row with `calculation_version = previous_version + 1` and a unique `calculation_run_id`.
7. **Auditability & Event Consumption**: Changes to metric definitions and saved report configurations emit standard M10 domain events and produce immutable audit entries via `AuditService`.

---

## Reconciled Source Domain Entities & Physical Table Mapping

The Analytics Engine maps queries across established physical database tables:

| Operational Domain | Physical Source Tables | Reconciled Analytical Scope |
|--------------------|------------------------|-----------------------------|
| **Organization (M1)** | `organizations`, `branches`, `business_units`, `departments`, `teams`, `users` | Structural hierarchy, BU boundaries, team organization |
| **People (M2)** | `people`, `user_identities`, `roles`, `person_roles`, `employments`, `skills`, `person_skills` | Headcount, employment types, manager reporting, skill inventory |
| **Assignments (M3)** | `assignments` | Resource capacity allocation, person assignment tracking |
| **Projects & Tasks (M4)** | `projects`, `project_business_units`, `project_owners`, `tasks`, `task_dependencies` | Project lifecycle, task velocity, lead times, priority distribution |
| **Work (M5)** | `work_categories`, `work_logs`, `work_outcomes`, `work_evidence` | Hours logged, work category breakdown, outcome deliverable counts, strategy work |
| **Meetings (M6)** | `meetings`, `meeting_participants`, `meeting_outcomes` | Scheduled vs actual meeting hours, decision outputs |
| **Learning (M7)** | `learning_programs`, `learning_program_milestones`, `learning_activity_definitions`, `learning_enrollments`, `enrollment_milestones`, `learning_activities`, `learning_reviews`, `assessments`, `assessment_attempts` | Enrollment trends, completion velocity, review pass rates, assessment scores |
| **Evaluation (M8)** | `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_evaluators`, `criterion_results`, `evaluation_feedback`, `evaluation_outcomes`, `evaluation_history` | Qualitative/rating score distributions, completion rates, mentor evaluation ratings |
| **Finance (M9)** | `finance_categories`, `financial_parties`, `financial_obligations`, `financial_obligation_items`, `financial_transactions`, `financial_allocations`, `financial_adjustments`, `financial_budgets` | Revenue, collection efficiency, budget utilization, payment modes, outstanding balances |
| **Audit & Events (M10)** | `audit_logs`, `event_outbox`, `event_consumer_records`, `event_registry` | System mutation volume, audit activity counts, outbox delivery health |

---

## Analytics Source Registry & Declarative Safety Model

The Analytics Source Registry defines the strict allowlist for metric specifications:

```json
{
  "allowedEntities": [
    "work_logs", "projects", "tasks", "learning_enrollments", "learning_programs",
    "evaluations", "criterion_results", "financial_obligations", "financial_transactions",
    "financial_budgets", "people", "employments", "assignments", "meetings", "audit_logs"
  ],
  "allowedOperators": ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "between", "is_null", "is_not_null"],
  "allowedAggregations": ["COUNT", "SUM", "AVERAGE", "MIN", "MAX", "RATE", "PERCENTAGE", "WEIGHTED_AGGREGATION", "TREND"],
  "allowedDimensions": [
    "organization_id", "branch_id", "business_unit_id", "department_id", "team_id",
    "person_id", "role_id", "project_id", "task_id", "learning_program_id",
    "evaluation_template_id", "category_id", "time_period"
  ]
}
```

Metric definitions violating this registry are rejected at validation time before database query construction.

---

## KPI Framework Specifications (Reconciled)

### 1. Placement Rate (Academy KPI)
* **Code**: `KPI_PLACEMENT_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Completed learning_enrollments with Placement / Count of Total Completed learning_enrollments) * 100`
* **Physical Tables**: `learning_enrollments`, `employments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 2. Internship Rate (Academy KPI)
* **Code**: `KPI_INTERNSHIP_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Active learning_enrollments with Active Internship Assignment / Count of Total Active learning_enrollments) * 100`
* **Physical Tables**: `learning_enrollments`, `assignments`
* **Dimensions**: `organization_id`, `learning_program_id`, `business_unit_id`, `time_period`

### 3. Student Satisfaction (Academy KPI)
* **Code**: `KPI_STUDENT_SATISFACTION`
* **Domain**: `evaluation`
* **Formula Spec**: `Average numeric value in criterion_results for evaluations linked to Student/Mentorship templates`
* **Physical Tables**: `evaluations`, `criterion_results`, `evaluation_templates`
* **Dimensions**: `organization_id`, `learning_program_id`, `person_id`, `time_period`

### 4. Completion Rate (Academy KPI)
* **Code**: `KPI_COMPLETION_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of learning_enrollments where status = 'completed' / Count of Closed learning_enrollments) * 100`
* **Physical Tables**: `learning_enrollments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 5. Alumni Success (Academy KPI)
* **Code**: `KPI_ALUMNI_SUCCESS`
* **Domain**: `people`
* **Formula Spec**: `Count of Active employments for Persons with Completed learning_enrollments / Total Completed Students`
* **Physical Tables**: `people`, `employments`, `learning_enrollments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 6. Student Growth (Academy KPI)
* **Code**: `KPI_STUDENT_GROWTH`
* **Domain**: `learning`
* **Formula Spec**: `((Current Period learning_enrollments - Previous Period learning_enrollments) / Previous Period learning_enrollments) * 100`
* **Physical Tables**: `learning_enrollments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 7. Revenue (Finance KPI)
* **Code**: `KPI_REVENUE`
* **Domain**: `finance`
* **Formula Spec**: `Sum of amount in financial_transactions where direction = 'inflow' AND state = 'Posted'`
* **Physical Tables**: `financial_transactions`, `financial_parties`, `finance_categories`
* **Dimensions**: `organization_id`, `business_unit_id`, `department_id`, `category_id`, `time_period`

### 8. Founder Contribution (Work KPI)
* **Code**: `KPI_FOUNDER_CONTRIBUTION`
* **Domain**: `work`
* **Formula Spec**: `Sum of duration_minutes in work_logs for Founders where work_category code IN ('STRATEGY', 'VISION', 'PARTNERSHIPS')`
* **Physical Tables**: `work_logs`, `work_categories`, `people`, `employments`
* **Dimensions**: `organization_id`, `business_unit_id`, `work_category_id`, `time_period`

---

## Immutable Metric Snapshot Semantics

1. **Append-Only Immutability**: Rows in `analytics_metric_results` are strictly immutable. Updating existing historical snapshot rows in place is prohibited.
2. **Versioned Recalculation**: Every snapshot record contains `calculation_version INT NOT NULL DEFAULT 1` and `calculation_run_id UUID NOT NULL`. Recalculating a historical period appends a new snapshot row with `calculation_version = previous_version + 1`.
3. **Snapshot Selection**: Reports by default select the snapshot row with `MAX(calculation_version)` for a given target period/dimension combination, while retaining all earlier calculation versions for audit trail analysis.

---

## Saved Report Visibility & Contextual Security

1. **Configuration Visibility Only**: Setting `isPublic = true` on a saved report (`analytics_reports`) makes the report layout definition (title, metrics list, dimension grouping) visible to other tenant users.
2. **No Data Access Bypass**: `isPublic = true` NEVER bypasses underlying dataset permissions.
3. **Per-Execution Authorization**: Every report execution independently evaluates the executing user's `Role + Business Unit + Team + Project` against every underlying metric and physical table. Data outside the caller's scope is automatically filtered out or masked.

---

## Triggers for Future Architecture Review

PostgreSQL serves as the unified relational store for both operational CRUD and analytical queries. Introducing an out-of-band analytical data warehouse (e.g., ClickHouse, Snowflake, DuckDB) is deferred until the following triggers indicate a **Future Architecture Review**:

1. **Row Volume Threshold Trigger**: Transactional source tables (e.g. `work_logs`, `audit_logs`) exceed 10 million rows per organization tenant.
2. **Performance Degradation Trigger**: Live analytical query execution causes measurable lock contention or API p99 latency degradation (>500ms) on transactional CRUD workloads.
3. **High-Cardinality OLAP Trigger**: Business requirements demand complex multi-dimensional OLAP cube slice-and-dice over multi-year historical datasets that cannot be served within 2 seconds by indexed PostgreSQL queries.

---
*Document frozen for Milestone 11 — Analytics Engine Architecture.*
