# Milestone 11 — Analytics Engine Implementation Specification

## Status

**Architecture frozen — implementation pending.**

## Objective

Milestone 11 establishes a read-only, extensible, multi-tenant **Analytics Engine** for DeVoc OS. It provides decision-support insights, performance metrics, key performance indicators (KPIs), and saved reports across all established operational domains (Organization, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit/Events) without duplicating operational entities or altering domain state.

M11 is a read-oriented analytical milestone. It operates as a modular-monolith engine within PostgreSQL, using an explicit Analytics Source Registry, declarative metric specifications referencing registered logical source identifiers, parameter-bound SQL query building, and contextual authorization.

---

## Core Architectural Principles

```text
               ┌─────────────────────────────────────────────────────────┐
               │    Operational Source of Truth (M1–M10 PostgreSQL)     │
               │ work_records, criterion_results, learning_enrollments,   │
               │ financial_transactions, event_outbox, audit_logs, etc.  │
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
2. **Reconciled Physical Source Entities**: All analytics queries resolve directly to established M1–M10 physical database tables (`work_records`, `work_categories`, `work_evidence`, `outcomes`, `work_outcomes`, `criterion_results`, `evaluations`, `evaluation_templates`, `learning_enrollments`, `learning_programs`, `learning_program_milestones`, `enrollment_milestones`, `financial_obligations`, `financial_transactions`, `financial_parties`, `finance_categories`, `financial_budgets`, `people`, `employments`, `assignments`, `projects`, `tasks`, `meetings`, `meeting_types`, `meeting_targets`, `meeting_participants`, `meeting_agenda_items`, `meeting_notes`, `meeting_decisions`, `meeting_action_items`, `audit_logs`, `event_outbox`). Generic aliases, missing tables (e.g. `work_logs`, `project_members`, `evaluation_records`, `outbox_events`), or non-existent columns (e.g. `tasks.assignee_id`, `meetings.project_id`, `meetings.business_unit_id`) are strictly prohibited.
3. **Logical Source Identifier Abstraction & Declarative Metric Safety**: User-facing `MetricDefinition.sourceEntity` values are registered logical source identifiers (e.g., `WORK_RECORD`, `EVALUATION`, `LEARNING_ENROLLMENT`, `FINANCIAL_TRANSACTION`, `MEETING`, `MEETING_TARGET`) rather than raw PostgreSQL table names. Metrics are specified via an explicit Analytics Source Registry defining allowed logical entities, fields, operators, dimensions, joins, and aggregations. Raw SQL strings, dynamic SQL concatenation, and runtime code execution (`eval()`) are strictly prohibited. All execution resolves through a controlled parameter-bound query builder.
4. **Strict Multi-Tenant Scoping**: Every metric definition, snapshot result, and saved report mandates `organization_id`. Cross-tenant queries return HTTP `404 Not Found`.
5. **Contextual Scope-Bound Security**: Analytics access reuses the established DeVoc OS authorization model: `Role + Business Unit + Team + Project`. Setting `isPublic = true` on a saved report shares the report template configuration, NOT data access. Every report execution independently re-evaluates the executing user's authorized organizational scope against every underlying metric and physical source table.
6. **Immutable Versioned Metric Snapshots**: Persisted rows in `analytics_metric_results` are strictly append-only and immutable. Recalculations append a new row with `calculation_version = previous_version + 1` and a unique `calculation_run_id`.
7. **Auditability & Event Consumption**: Changes to metric definitions and saved report configurations emit standard M10 domain events and produce immutable audit entries via `AuditService`.

---

## Reconciled Source Domain Entities & Physical Table Mapping

The Analytics Engine maps queries across established M1–M10 physical database tables:

| Operational Domain | Physical Source Tables | Reconciled Analytical Scope |
|--------------------|------------------------|-----------------------------|
| **Organization (M1)** | `organizations`, `branches`, `business_units`, `departments`, `teams`, `users`, `organization_memberships` | Structural hierarchy, BU boundaries, team organization |
| **People (M2)** | `people`, `roles`, `person_roles`, `employments`, `employment_history`, `skills`, `person_skills` | Headcount, employment types, manager reporting, skill inventory |
| **Assignments (M3)** | `assignments`, `assignment_history` | Resource capacity allocation, person assignment tracking, task & project responsibility |
| **Projects & Tasks (M4)** | `projects`, `project_business_units`, `project_owners`, `tasks`, `task_dependencies` | Project lifecycle, task velocity, lead times, priority distribution (no direct task assignee column) |
| **Work (M5)** | `work_categories`, `work_records`, `work_evidence`, `outcomes`, `work_outcomes` | Hours logged, work category breakdown, outcome deliverable counts, strategy work |
| **Meetings (M6)** | `meeting_types`, `meetings`, `meeting_targets`, `meeting_participants`, `meeting_agenda_items`, `meeting_notes`, `meeting_decisions`, `meeting_action_items` | Scheduled vs actual meeting hours, target context (BU/project via `meeting_targets`), agenda items, decisions, action items |
| **Learning (M7)** | `learning_programs`, `learning_program_milestones`, `learning_activity_definitions`, `learning_enrollments`, `enrollment_milestones`, `learning_activities`, `learning_activity_references`, `learning_reviews`, `learning_review_changes`, `learning_assessments`, `learning_assessment_attempts` | Enrollment trends, completion velocity, review pass rates, assessment scores |
| **Evaluation (M8)** | `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_evaluators`, `criterion_results`, `evaluation_feedback`, `evaluation_outcomes`, `evaluation_history` | Qualitative/rating score distributions, completion rates, mentor evaluation ratings |
| **Finance (M9)** | `finance_categories`, `financial_parties`, `financial_obligations`, `financial_obligation_items`, `financial_transactions`, `financial_allocations`, `financial_adjustments`, `financial_budgets` | Revenue, collection efficiency, budget utilization, payment modes, outstanding balances |
| **Audit & Events (M10)** | `audit_logs`, `event_outbox`, `event_consumer_records`, `event_registry` | System mutation volume, audit activity counts, outbox delivery health |

---

## Analytics Source Registry (Logical → Physical Mapping)

The Analytics Source Registry owns the mapping between logical source identifiers exposed in declarative metric definitions and physical PostgreSQL tables:

| Logical Source Identifier | Physical Table | Primary Key | Tenant Column | Allowed Dimensions | Allowed Relationships |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `WORK_RECORD` | `work_records` | `id` | `organization_id` | `work_category_id`, `project_id`, `task_id`, `business_unit_id`, `person_id`, `created_at` | `WORK_CATEGORY` (`work_category_id`), `PROJECT` (`project_id`), `TASK` (`task_id`), `PERSON` (`person_id`), `BUSINESS_UNIT` (`business_unit_id`) |
| `WORK_CATEGORY` | `work_categories` | `id` | `organization_id` | `code`, `name` | — |
| `WORK_EVIDENCE` | `work_evidence` | `id` | `organization_id` | `work_record_id`, `evidence_type` | `WORK_RECORD` (`work_record_id`) |
| `OUTCOME` | `outcomes` | `id` | `organization_id` | `status`, `outcome_type`, `created_at` | — |
| `WORK_OUTCOME` | `work_outcomes` | `id` | `organization_id` | `work_record_id`, `outcome_id` | `WORK_RECORD` (`work_record_id`), `OUTCOME` (`outcome_id`) |
| `EVALUATION` | `evaluations` | `id` | `organization_id` | `template_id`, `evaluatee_id`, `evaluatee_type`, `status`, `cycle_name`, `created_at` | `EVALUATION_TEMPLATE` (`template_id`), `PERSON` (`evaluatee_id`) |
| `EVALUATION_TEMPLATE` | `evaluation_templates` | `id` | `organization_id` | `evaluation_type`, `code`, `status` | — |
| `EVALUATION_CRITERION` | `evaluation_criteria` | `id` | `organization_id` | `template_id`, `category` | `EVALUATION_TEMPLATE` (`template_id`) |
| `CRITERION_RESULT` | `criterion_results` | `id` | `organization_id` | `evaluation_id`, `criterion_id`, `score` | `EVALUATION` (`evaluation_id`), `EVALUATION_CRITERION` (`criterion_id`) |
| `EVALUATION_EVALUATOR` | `evaluation_evaluators` | `id` | `organization_id` | `evaluation_id`, `evaluator_id` | `EVALUATION` (`evaluation_id`), `PERSON` (`evaluator_id`) |
| `EVALUATION_FEEDBACK` | `evaluation_feedback` | `id` | `organization_id` | `evaluation_id`, `author_id`, `feedback_type` | `EVALUATION` (`evaluation_id`), `PERSON` (`author_id`) |
| `EVALUATION_OUTCOME` | `evaluation_outcomes` | `id` | `organization_id` | `evaluation_id`, `outcome_type` | `EVALUATION` (`evaluation_id`) |
| `EVALUATION_HISTORY` | `evaluation_history` | `id` | `organization_id` | `evaluation_id`, `previous_status`, `new_status` | `EVALUATION` (`evaluation_id`) |
| `LEARNING_PROGRAM` | `learning_programs` | `id` | `organization_id` | `code`, `status` | — |
| `LEARNING_PROGRAM_MILESTONE` | `learning_program_milestones` | `id` | `organization_id` | `program_id`, `milestone_type` | `LEARNING_PROGRAM` (`program_id`) |
| `LEARNING_ACTIVITY_DEFINITION` | `learning_activity_definitions` | `id` | `organization_id` | `milestone_id` | `LEARNING_PROGRAM_MILESTONE` (`milestone_id`) |
| `LEARNING_ENROLLMENT` | `learning_enrollments` | `id` | `organization_id` | `program_id`, `student_id`, `mentor_id`, `status`, `created_at` | `LEARNING_PROGRAM` (`program_id`), `PERSON` (`student_id`), `PERSON` (`mentor_id`) |
| `ENROLLMENT_MILESTONE` | `enrollment_milestones` | `id` | `organization_id` | `enrollment_id`, `program_milestone_id`, `status` | `LEARNING_ENROLLMENT` (`enrollment_id`), `LEARNING_PROGRAM_MILESTONE` (`program_milestone_id`) |
| `LEARNING_ACTIVITY` | `learning_activities` | `id` | `organization_id` | `enrollment_milestone_id`, `status` | `ENROLLMENT_MILESTONE` (`enrollment_milestone_id`) |
| `LEARNING_ACTIVITY_REFERENCE` | `learning_activity_references` | `id` | `organization_id` | `learning_activity_id`, `reference_type`, `reference_id` | `LEARNING_ACTIVITY` (`learning_activity_id`) |
| `LEARNING_REVIEW` | `learning_reviews` | `id` | `organization_id` | `enrollment_id`, `reviewer_id`, `decision` | `LEARNING_ENROLLMENT` (`enrollment_id`), `PERSON` (`reviewer_id`) |
| `LEARNING_REVIEW_CHANGE` | `learning_review_changes` | `id` | `organization_id` | `review_id` | `LEARNING_REVIEW` (`review_id`) |
| `LEARNING_ASSESSMENT` | `learning_assessments` | `id` | `organization_id` | `enrollment_id`, `evaluator_id`, `status` | `LEARNING_ENROLLMENT` (`enrollment_id`), `PERSON` (`evaluator_id`) |
| `LEARNING_ASSESSMENT_ATTEMPT` | `learning_assessment_attempts` | `id` | `organization_id` | `assessment_id`, `passed` | `LEARNING_ASSESSMENT` (`assessment_id`) |
| `PERSON` | `people` | `id` | `organization_id` | `status`, `created_at` | `USER` (`user_id`) |
| `USER` | `users` | `id` | — (Global User) | `status` | — |
| `ORGANIZATION_MEMBERSHIP` | `organization_memberships` | `id` | `organization_id` | `user_id`, `status` | `USER` (`user_id`) |
| `PERSON_ROLE` | `person_roles` | `id` | `organization_id` | `person_id`, `role_id`, `business_unit_id`, `department_id`, `team_id`, `status` | `PERSON` (`person_id`), `ROLE` (`role_id`), `BUSINESS_UNIT` (`business_unit_id`), `DEPARTMENT` (`department_id`), `TEAM` (`team_id`) |
| `ROLE` | `roles` | `id` | `organization_id` | `code`, `name` | — |
| `EMPLOYMENT` | `employments` | `id` | `organization_id` | `person_id`, `employment_type`, `status`, `department_id`, `business_unit_id`, `branch_id`, `manager_id` | `PERSON` (`person_id`), `PERSON` (`manager_id`), `DEPARTMENT` (`department_id`), `BUSINESS_UNIT` (`business_unit_id`), `BRANCH` (`branch_id`) |
| `EMPLOYMENT_HISTORY` | `employment_history` | `id` | `organization_id` | `employment_id`, `person_id`, `new_status` | `EMPLOYMENT` (`employment_id`), `PERSON` (`person_id`) |
| `SKILL` | `skills` | `id` | `organization_id` | `code`, `category` | — |
| `PERSON_SKILL` | `person_skills` | `id` | `organization_id` | `person_id`, `skill_id`, `proficiency_level` | `PERSON` (`person_id`), `SKILL` (`skill_id`) |
| `ASSIGNMENT` | `assignments` | `id` | `organization_id` | `person_id`, `target_type`, `target_id`, `assignment_type`, `role_context`, `status` | `PERSON` (`person_id`) |
| `ASSIGNMENT_HISTORY` | `assignment_history` | `id` | `organization_id` | `assignment_id`, `previous_status`, `new_status` | `ASSIGNMENT` (`assignment_id`) |
| `PROJECT` | `projects` | `id` | `organization_id` | `code`, `project_type`, `status`, `created_at` | — |
| `PROJECT_OWNER` | `project_owners` | `id` | `organization_id` | `project_id`, `person_id`, `ownership_type` | `PROJECT` (`project_id`), `PERSON` (`person_id`) |
| `PROJECT_BUSINESS_UNIT` | `project_business_units` | `(project_id, business_unit_id)` | `organization_id` | `project_id`, `business_unit_id` | `PROJECT` (`project_id`), `BUSINESS_UNIT` (`business_unit_id`) |
| `TASK` | `tasks` | `id` | `organization_id` | `project_id`, `parent_task_id`, `status`, `priority`, `task_type`, `created_at` | `PROJECT` (`project_id`), `PERSON` (`created_by_person_id`) |
| `TASK_DEPENDENCY` | `task_dependencies` | `id` | `organization_id` | `task_id`, `depends_on_task_id` | `TASK` (`task_id`) |
| `MEETING_TYPE` | `meeting_types` | `id` | `organization_id` | `code`, `is_active` | — |
| `MEETING` | `meetings` | `id` | `organization_id` | `meeting_type_id`, `organizer_person_id`, `created_by_person_id`, `status`, `scheduled_start_at` | `MEETING_TYPE` (`meeting_type_id`), `PERSON` (`organizer_person_id`) |
| `MEETING_TARGET` | `meeting_targets` | `id` | `organization_id` | `meeting_id`, `target_type`, `target_id` | `MEETING` (`meeting_id`) |
| `MEETING_PARTICIPANT` | `meeting_participants` | `id` | `organization_id` | `meeting_id`, `person_id`, `participant_type`, `response_status` | `MEETING` (`meeting_id`), `PERSON` (`person_id`) |
| `MEETING_AGENDA_ITEM` | `meeting_agenda_items` | `id` | `organization_id` | `meeting_id`, `owner_person_id`, `status` | `MEETING` (`meeting_id`), `PERSON` (`owner_person_id`) |
| `MEETING_NOTE` | `meeting_notes` | `id` | `organization_id` | `meeting_id`, `prepared_by_person_id`, `status` | `MEETING` (`meeting_id`), `PERSON` (`prepared_by_person_id`) |
| `MEETING_DECISION` | `meeting_decisions` | `id` | `organization_id` | `meeting_id`, `recorded_by_person_id` | `MEETING` (`meeting_id`), `PERSON` (`recorded_by_person_id`) |
| `MEETING_ACTION_ITEM` | `meeting_action_items` | `id` | `organization_id` | `meeting_id`, `owner_person_id`, `task_id`, `status` | `MEETING` (`meeting_id`), `PERSON` (`owner_person_id`), `TASK` (`task_id`) |
| `FINANCIAL_PARTY` | `financial_parties` | `id` | `organization_id` | `party_type`, `person_id`, `status` | `PERSON` (`person_id`) |
| `FINANCE_CATEGORY` | `finance_categories` | `id` | `organization_id` | `code`, `type` | — |
| `FINANCIAL_OBLIGATION` | `financial_obligations` | `id` | `organization_id` | `party_id`, `obligation_type`, `status`, `due_date` | `FINANCIAL_PARTY` (`party_id`) |
| `FINANCIAL_OBLIGATION_ITEM` | `financial_obligation_items` | `id` | `organization_id` | `obligation_id`, `category_id` | `FINANCIAL_OBLIGATION` (`obligation_id`), `FINANCE_CATEGORY` (`category_id`) |
| `FINANCIAL_TRANSACTION` | `financial_transactions` | `id` | `organization_id` | `transaction_type`, `party_id`, `payment_method`, `status`, `transaction_date` | `FINANCIAL_PARTY` (`party_id`) |
| `FINANCIAL_ALLOCATION` | `financial_allocations` | `id` | `organization_id` | `transaction_id`, `obligation_id` | `FINANCIAL_TRANSACTION` (`transaction_id`), `FINANCIAL_OBLIGATION` (`obligation_id`) |
| `FINANCIAL_ADJUSTMENT` | `financial_adjustments` | `id` | `organization_id` | `obligation_id` | `FINANCIAL_OBLIGATION` (`obligation_id`) |
| `FINANCIAL_BUDGET` | `financial_budgets` | `id` | `organization_id` | `business_unit_id`, `department_id`, `project_id`, `fiscal_year` | `BUSINESS_UNIT` (`business_unit_id`), `DEPARTMENT` (`department_id`), `PROJECT` (`project_id`) |
| `AUDIT_LOG` | `audit_logs` | `id` | `organization_id` | `actor_id`, `action`, `entity_type`, `entity_id`, `created_at` | `USER` (`actor_id`) |
| `EVENT_OUTBOX` | `event_outbox` | `id` | `organization_id` | `event_name`, `status`, `created_at` | — |
| `EVENT_CONSUMER_RECORD` | `event_consumer_records` | `id` | — (System level) | `consumer_name`, `event_id`, `processed_at` | `EVENT_OUTBOX` (`event_id`) |
| `EVENT_REGISTRY` | `event_registry` | `id` | — (Global Registry) | `event_name`, `version`, `status` | — |
| `BRANCH` | `branches` | `id` | `organization_id` | `code`, `name` | — |
| `BUSINESS_UNIT` | `business_units` | `id` | `organization_id` | `code`, `name` | — |
| `DEPARTMENT` | `departments` | `id` | `organization_id` | `code`, `name` | — |
| `TEAM` | `teams` | `id` | `organization_id` | `department_id`, `code`, `name` | `DEPARTMENT` (`department_id`) |

---

## Analytics Source Registry & Declarative Safety Model

The Analytics Source Registry defines the strict allowlist for metric specifications:

```json
{
  "allowedLogicalEntities": [
    "WORK_RECORD", "WORK_CATEGORY", "WORK_EVIDENCE", "OUTCOME", "WORK_OUTCOME",
    "PROJECT", "PROJECT_OWNER", "PROJECT_BUSINESS_UNIT", "TASK", "TASK_DEPENDENCY",
    "LEARNING_PROGRAM", "LEARNING_PROGRAM_MILESTONE", "LEARNING_ACTIVITY_DEFINITION",
    "LEARNING_ENROLLMENT", "ENROLLMENT_MILESTONE", "LEARNING_ACTIVITY", "LEARNING_REVIEW", "LEARNING_ASSESSMENT",
    "EVALUATION_TEMPLATE", "EVALUATION_CRITERION", "EVALUATION", "CRITERION_RESULT", "EVALUATION_OUTCOME",
    "FINANCE_CATEGORY", "FINANCIAL_PARTY", "FINANCIAL_OBLIGATION", "FINANCIAL_TRANSACTION", "FINANCIAL_ALLOCATION", "FINANCIAL_BUDGET",
    "PERSON", "ROLE", "PERSON_ROLE", "EMPLOYMENT", "SKILL", "PERSON_SKILL", "ASSIGNMENT",
    "MEETING_TYPE", "MEETING", "MEETING_TARGET", "MEETING_PARTICIPANT", "MEETING_AGENDA_ITEM", "MEETING_NOTE", "MEETING_DECISION", "MEETING_ACTION_ITEM",
    "AUDIT_LOG", "EVENT_OUTBOX"
  ],
  "allowedOperators": ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "between", "is_null", "is_not_null"],
  "allowedAggregations": ["COUNT", "SUM", "AVERAGE", "MIN", "MAX", "RATE", "PERCENTAGE", "WEIGHTED_AGGREGATION", "TREND"],
  "allowedDimensions": [
    "organization_id", "branch_id", "business_unit_id", "department_id", "team_id",
    "person_id", "role_id", "project_id", "task_id", "learning_program_id",
    "template_id", "category_id", "work_category_id", "meeting_type_id", "time_period"
  ]
}
```

Metric definitions violating this registry or attempting to specify unlisted logical entities or arbitrary raw SQL strings are rejected at validation time before database query construction.

---

## KPI Framework Specifications (Reconciled)

### 1. Placement Rate (Academy KPI)
* **Code**: `KPI_PLACEMENT_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Completed LEARNING_ENROLLMENT with Placement / Count of Total Completed LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`, `employments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 2. Internship Rate (Academy KPI)
* **Code**: `KPI_INTERNSHIP_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Active LEARNING_ENROLLMENT with Active Internship Assignment / Count of Total Active LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`, `assignments`
* **Dimensions**: `organization_id`, `learning_program_id`, `business_unit_id`, `time_period`

### 3. Student Satisfaction (Academy KPI)
* **Code**: `KPI_STUDENT_SATISFACTION`
* **Domain**: `evaluation`
* **Formula Spec**: `Average numeric value in CRITERION_RESULT for EVALUATION linked to Student/Mentorship templates`
* **Logical Source Entity**: `CRITERION_RESULT`
* **Physical Tables**: `evaluations`, `criterion_results`, `evaluation_templates`
* **Dimensions**: `organization_id`, `learning_program_id`, `person_id`, `time_period`

### 4. Completion Rate (Academy KPI)
* **Code**: `KPI_COMPLETION_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of LEARNING_ENROLLMENT where status = 'completed' / Count of Closed LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 5. Alumni Success (Academy KPI)
* **Code**: `KPI_ALUMNI_SUCCESS`
* **Domain**: `people`
* **Formula Spec**: `Count of Active EMPLOYMENT for Persons with Completed LEARNING_ENROLLMENT / Total Completed Students`
* **Logical Source Entity**: `PERSON`
* **Physical Tables**: `people`, `employments`, `learning_enrollments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 6. Student Growth (Academy KPI)
* **Code**: `KPI_STUDENT_GROWTH`
* **Domain**: `learning`
* **Formula Spec**: `((Current Period LEARNING_ENROLLMENT - Previous Period LEARNING_ENROLLMENT) / Previous Period LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 7. Revenue (Finance KPI)
* **Code**: `KPI_REVENUE`
* **Domain**: `finance`
* **Formula Spec**: `Sum of amount in FINANCIAL_TRANSACTION where transaction_type = 'payment' AND status = 'posted'`
* **Logical Source Entity**: `FINANCIAL_TRANSACTION`
* **Physical Tables**: `financial_transactions`, `financial_parties`, `finance_categories`
* **Dimensions**: `organization_id`, `business_unit_id`, `department_id`, `category_id`, `time_period`

### 8. Founder Contribution (Work KPI)
* **Code**: `KPI_FOUNDER_CONTRIBUTION`
* **Domain**: `work`
* **Formula Spec**: `Sum of duration_minutes in WORK_RECORD for Founders where WORK_CATEGORY code IN ('STRATEGY', 'VISION', 'PARTNERSHIPS')`
* **Logical Source Entity**: `WORK_RECORD`
* **Physical Tables**: `work_records`, `work_categories`, `people`, `employments`
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

1. **Row Volume Threshold Trigger**: Transactional source tables (e.g. `work_records`, `audit_logs`) exceed 10 million rows per organization tenant.
2. **Performance Degradation Trigger**: Live analytical query execution causes measurable lock contention or API p99 latency degradation (>500ms) on transactional CRUD workloads.
3. **High-Cardinality OLAP Trigger**: Business requirements demand complex multi-dimensional OLAP cube slice-and-dice over multi-year historical datasets that cannot be served within 2 seconds by indexed PostgreSQL queries.

---
*Document frozen for Milestone 11 — Analytics Engine Architecture.*

