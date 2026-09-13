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
2. **Reconciled Physical Source Entities & Exact Columns**: All analytics queries resolve directly to established M1–M10 physical database tables and exact column names (`projects.key` not `code`, `users.is_active` not `status`, `finance_categories.category_type` not `type`, `financial_obligations.state` not `status`, `financial_obligations.due_at` not `due_date`, `financial_transactions.payment_mode` not `payment_method`, `financial_transactions.state` not `status`, `financial_transactions.posted_at` not `transaction_date`, `financial_budgets.period_name` not `fiscal_year`). Generic aliases, missing tables (e.g. `work_logs`, `project_members`, `evaluation_records`), or non-existent columns (e.g. `tasks.assignee_id`, `meetings.project_id`, `meetings.business_unit_id`) are strictly prohibited.
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
| **Organization (M1)** | `organizations`, `branches`, `business_units`, `departments`, `teams`, `users`, `organization_memberships` | Structural hierarchy, BU boundaries, team organization (`users.is_active`) |
| **People (M2)** | `people`, `roles`, `person_roles`, `employments`, `employment_history`, `skills`, `person_skills` | Headcount, employment types, manager reporting, skill inventory |
| **Assignments (M3)** | `assignments`, `assignment_history` | Resource capacity allocation, person assignment tracking, task & project responsibility |
| **Projects & Tasks (M4)** | `projects`, `project_business_units`, `project_owners`, `tasks`, `task_dependencies` | Project lifecycle (`projects.key`), task velocity, lead times, priority distribution (no direct task assignee column) |
| **Work (M5)** | `work_categories`, `work_records`, `work_evidence`, `outcomes`, `work_outcomes` | Hours logged (`work_records.duration_minutes`), category breakdown (`work_categories.active`), outcome deliverables |
| **Meetings (M6)** | `meeting_types`, `meetings`, `meeting_targets`, `meeting_participants`, `meeting_agenda_items`, `meeting_notes`, `meeting_decisions`, `meeting_action_items` | Scheduled vs actual meeting hours, target context (BU/project via `meeting_targets`), agenda items, decisions, action items |
| **Learning (M7)** | `learning_programs`, `learning_program_milestones`, `learning_activity_definitions`, `learning_enrollments`, `enrollment_milestones`, `learning_activities`, `learning_activity_references`, `learning_reviews`, `learning_review_changes`, `learning_assessments`, `learning_assessment_attempts` | Enrollment trends (`learning_enrollments.status`), milestone completion, review notes, assessment scores (`learning_assessment_attempts.score`) |
| **Evaluation (M8)** | `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_evaluators`, `criterion_results`, `evaluation_feedback`, `evaluation_outcomes`, `evaluation_history` | Evaluation states (`evaluations.state`), subject evaluation (`evaluations.subject_id`), criterion results (`criterion_results.value`) |
| **Finance (M9)** | `finance_categories`, `financial_parties`, `financial_obligations`, `financial_obligation_items`, `financial_transactions`, `financial_allocations`, `financial_adjustments`, `financial_budgets` | Revenue (`financial_transactions.posted_at`), collection efficiency (`financial_obligations.state`, `due_at`), budget utilization (`financial_budgets.period_name`, `period_start`, `period_end`), payment modes (`financial_transactions.payment_mode`), outstanding balances (`financial_obligations.balance_amount`) |
| **Audit & Events (M10)** | `audit_logs`, `event_outbox`, `event_consumer_records`, `event_registry` | System mutation volume, audit activity counts, outbox delivery health |

---

## Analytics Source Registry (Logical → Physical Column Mapping)

The Analytics Source Registry owns the mapping between logical source identifiers exposed in declarative metric definitions and physical PostgreSQL tables and exact column names:

| Logical Source Identifier | Physical Table | Primary Key | Tenant Column | Allowed Dimensions | Allowed Relationships |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ORGANIZATION` | `organizations` | `id` | — (Tenant Boundary) | `slug`, `status`, `created_at` | — |
| `USER` | `users` | `id` | — (Global User) | `is_active`, `is_platform_admin`, `created_at` | — |
| `ORGANIZATION_MEMBERSHIP` | `organization_memberships` | `id` | `organization_id` | `user_id`, `role`, `status`, `created_at` | `USER` (`user_id`) |
| `BRANCH` | `branches` | `id` | `organization_id` | `code`, `name`, `status` | — |
| `BUSINESS_UNIT` | `business_units` | `id` | `organization_id` | `code`, `name`, `status` | — |
| `DEPARTMENT` | `departments` | `id` | `organization_id` | `code`, `name`, `status` | — |
| `TEAM` | `teams` | `id` | `organization_id` | `code`, `name`, `status`, `is_temporary`, `department_id`, `business_unit_id` | `DEPARTMENT` (`department_id`), `BUSINESS_UNIT` (`business_unit_id`) |
| `AUDIT_LOG` | `audit_logs` | `id` | `organization_id` | `actor_id`, `actor_person_id`, `action`, `entity_type`, `entity_id`, `source_module`, `created_at` | `USER` (`actor_id`), `PERSON` (`actor_person_id`) |
| `PERSON` | `people` | `id` | `organization_id` | `user_id`, `status`, `created_at` | `USER` (`user_id`) |
| `ROLE` | `roles` | `id` | `organization_id` | `code`, `name`, `is_system`, `status` | — |
| `PERSON_ROLE` | `person_roles` | `id` | `organization_id` | `person_id`, `role_id`, `business_unit_id`, `department_id`, `team_id`, `status`, `start_date`, `end_date` | `PERSON` (`person_id`), `ROLE` (`role_id`), `BUSINESS_UNIT` (`business_unit_id`), `DEPARTMENT` (`department_id`), `TEAM` (`team_id`) |
| `EMPLOYMENT` | `employments` | `id` | `organization_id` | `person_id`, `employment_type`, `status`, `job_title`, `department_id`, `business_unit_id`, `branch_id`, `manager_id`, `start_date`, `end_date` | `PERSON` (`person_id`), `PERSON` (`manager_id`), `DEPARTMENT` (`department_id`), `BUSINESS_UNIT` (`business_unit_id`), `BRANCH` (`branch_id`) |
| `EMPLOYMENT_HISTORY` | `employment_history` | `id` | `organization_id` | `employment_id`, `person_id`, `previous_status`, `new_status`, `effective_date` | `EMPLOYMENT` (`employment_id`), `PERSON` (`person_id`) |
| `SKILL` | `skills` | `id` | `organization_id` | `code`, `name`, `category`, `status` | — |
| `PERSON_SKILL` | `person_skills` | `id` | `organization_id` | `person_id`, `skill_id`, `proficiency_level` | `PERSON` (`person_id`), `SKILL` (`skill_id`) |
| `ASSIGNMENT` | `assignments` | `id` | `organization_id` | `person_id`, `target_type`, `target_id`, `assignment_type`, `role_context`, `status`, `start_at`, `end_at`, `capacity_type`, `capacity_value`, `capacity_unit`, `authority_type`, `assigned_by_person_id` | `PERSON` (`person_id`), `PERSON` (`assigned_by_person_id`) |
| `ASSIGNMENT_HISTORY` | `assignment_history` | `id` | `organization_id` | `assignment_id`, `previous_status`, `new_status`, `actor_user_id`, `actor_person_id`, `changed_at` | `ASSIGNMENT` (`assignment_id`), `USER` (`actor_user_id`), `PERSON` (`actor_person_id`) |
| `PROJECT` | `projects` | `id` | `organization_id` | `key`, `name`, `project_type`, `status`, `priority`, `start_at`, `target_end_at`, `actual_end_at`, `created_by_person_id`, `created_at` | `PERSON` (`created_by_person_id`) |
| `PROJECT_OWNER` | `project_owners` | `id` | `organization_id` | `project_id`, `person_id`, `ownership_type`, `start_at`, `end_at` | `PROJECT` (`project_id`), `PERSON` (`person_id`) |
| `PROJECT_BUSINESS_UNIT` | `project_business_units` | `(project_id, business_unit_id)` | `organization_id` | `project_id`, `business_unit_id` | `PROJECT` (`project_id`), `BUSINESS_UNIT` (`business_unit_id`) |
| `TASK` | `tasks` | `id` | `organization_id` | `project_id`, `parent_task_id`, `task_key`, `task_type`, `status`, `priority`, `start_at`, `due_at`, `completed_at`, `created_by_person_id`, `created_at` | `PROJECT` (`project_id`), `TASK` (`parent_task_id`), `PERSON` (`created_by_person_id`) |
| `TASK_DEPENDENCY` | `task_dependencies` | `id` | `organization_id` | `task_id`, `depends_on_task_id`, `dependency_type` | `TASK` (`task_id`), `TASK` (`depends_on_task_id`) |
| `WORK_CATEGORY` | `work_categories` | `id` | `organization_id` | `code`, `name`, `active` | — |
| `WORK_RECORD` | `work_records` | `id` | `organization_id` | `person_id`, `target_type`, `target_id`, `assignment_id`, `category_id`, `status`, `started_at`, `ended_at`, `duration_minutes`, `created_by_person_id`, `created_at` | `PERSON` (`person_id`), `ASSIGNMENT` (`assignment_id`), `WORK_CATEGORY` (`category_id`), `PERSON` (`created_by_person_id`) |
| `WORK_EVIDENCE` | `work_evidence` | `id` | `organization_id` | `work_record_id`, `evidence_type`, `provider` | `WORK_RECORD` (`work_record_id`) |
| `OUTCOME` | `outcomes` | `id` | `organization_id` | `title`, `outcome_type`, `measurable_unit`, `created_by_person_id`, `created_at` | `PERSON` (`created_by_person_id`) |
| `WORK_OUTCOME` | `work_outcomes` | `(work_record_id, outcome_id)` | — (via `work_record_id`) | `work_record_id`, `outcome_id`, `contribution_type` | `WORK_RECORD` (`work_record_id`), `OUTCOME` (`outcome_id`) |
| `MEETING_TYPE` | `meeting_types` | `id` | `organization_id` | `code`, `name`, `is_active` | — |
| `MEETING` | `meetings` | `id` | `organization_id` | `meeting_type_id`, `status`, `scheduled_start_at`, `scheduled_end_at`, `actual_start_at`, `actual_end_at`, `location_type`, `organizer_person_id`, `created_by_person_id`, `created_at` | `MEETING_TYPE` (`meeting_type_id`), `PERSON` (`organizer_person_id`), `PERSON` (`created_by_person_id`) |
| `MEETING_TARGET` | `meeting_targets` | `id` | `organization_id` | `meeting_id`, `target_type`, `target_id` | `MEETING` (`meeting_id`) |
| `MEETING_PARTICIPANT` | `meeting_participants` | `id` | `organization_id` | `meeting_id`, `person_id`, `participant_type`, `response_status`, `joined_at`, `left_at` | `MEETING` (`meeting_id`), `PERSON` (`person_id`) |
| `MEETING_AGENDA_ITEM` | `meeting_agenda_items` | `id` | `organization_id` | `meeting_id`, `position`, `owner_person_id`, `duration_minutes`, `status` | `MEETING` (`meeting_id`), `PERSON` (`owner_person_id`) |
| `MEETING_NOTE` | `meeting_notes` | `id` | `organization_id` | `meeting_id`, `prepared_by_person_id`, `status`, `finalized_at` | `MEETING` (`meeting_id`), `PERSON` (`prepared_by_person_id`) |
| `MEETING_DECISION` | `meeting_decisions` | `id` | `organization_id` | `meeting_id`, `decided_at`, `recorded_by_person_id` | `MEETING` (`meeting_id`), `PERSON` (`recorded_by_person_id`) |
| `MEETING_ACTION_ITEM` | `meeting_action_items` | `id` | `organization_id` | `meeting_id`, `owner_person_id`, `due_at`, `status`, `task_id` | `MEETING` (`meeting_id`), `PERSON` (`owner_person_id`), `TASK` (`task_id`) |
| `LEARNING_PROGRAM` | `learning_programs` | `id` | `organization_id` | `code`, `name`, `status`, `version` | — |
| `LEARNING_PROGRAM_MILESTONE` | `learning_program_milestones` | `id` | `organization_id` | `learning_program_id`, `sequence`, `required` | `LEARNING_PROGRAM` (`learning_program_id`) |
| `LEARNING_ACTIVITY_DEFINITION` | `learning_activity_definitions` | `id` | `organization_id` | `milestone_id`, `activity_type`, `sequence`, `required` | `LEARNING_PROGRAM_MILESTONE` (`milestone_id`) |
| `LEARNING_ENROLLMENT` | `learning_enrollments` | `id` | `organization_id` | `learning_program_id`, `person_id`, `status`, `enrolled_at`, `started_at`, `completed_at`, `withdrawn_at`, `created_at` | `LEARNING_PROGRAM` (`learning_program_id`), `PERSON` (`person_id`) |
| `ENROLLMENT_MILESTONE` | `enrollment_milestones` | `id` | `organization_id` | `enrollment_id`, `source_milestone_id`, `sequence`, `status`, `started_at`, `completed_at` | `LEARNING_ENROLLMENT` (`enrollment_id`), `LEARNING_PROGRAM_MILESTONE` (`source_milestone_id`) |
| `LEARNING_ACTIVITY` | `learning_activities` | `id` | `organization_id` | `enrollment_milestone_id`, `source_activity_id`, `activity_type`, `sequence`, `status`, `started_at`, `completed_at` | `ENROLLMENT_MILESTONE` (`enrollment_milestone_id`), `LEARNING_ACTIVITY_DEFINITION` (`source_activity_id`) |
| `LEARNING_ACTIVITY_REFERENCE` | `learning_activity_references` | `id` | `organization_id` | `learning_activity_id`, `reference_type`, `reference_id` | `LEARNING_ACTIVITY` (`learning_activity_id`) |
| `LEARNING_REVIEW` | `learning_reviews` | `id` | `organization_id` | `enrollment_id`, `reviewer_person_id`, `review_type`, `reviewed_at`, `progress_value` | `LEARNING_ENROLLMENT` (`enrollment_id`), `PERSON` (`reviewer_person_id`) |
| `LEARNING_REVIEW_CHANGE` | `learning_review_changes` | `id` | `organization_id` | `review_id`, `change_type`, `target_type`, `target_id` | `LEARNING_REVIEW` (`review_id`) |
| `LEARNING_ASSESSMENT` | `learning_assessments` | `id` | `organization_id` | `enrollment_id`, `learning_activity_id`, `assessment_type`, `status`, `max_score` | `LEARNING_ENROLLMENT` (`enrollment_id`), `LEARNING_ACTIVITY` (`learning_activity_id`) |
| `LEARNING_ASSESSMENT_ATTEMPT` | `learning_assessment_attempts` | `id` | `organization_id` | `assessment_id`, `person_id`, `attempt_number`, `status`, `score`, `submitted_at`, `completed_at` | `LEARNING_ASSESSMENT` (`assessment_id`), `PERSON` (`person_id`) |
| `EVALUATION_TEMPLATE` | `evaluation_templates` | `id` | `organization_id` | `name`, `version`, `is_active` | — |
| `EVALUATION_CRITERION` | `evaluation_criteria` | `id` | — (via `template_id`) | `template_id`, `order`, `name`, `weight`, `criterion_type` | `EVALUATION_TEMPLATE` (`template_id`) |
| `EVALUATION` | `evaluations` | `id` | `organization_id` | `template_id`, `subject_id`, `state`, `scheduled_at`, `started_at`, `submitted_at`, `completed_at`, `cancelled_at`, `created_at` | `EVALUATION_TEMPLATE` (`template_id`), `PERSON` (`subject_id`) |
| `EVALUATION_EVALUATOR` | `evaluation_evaluators` | `(evaluation_id, evaluator_id)` | — (via `evaluation_id`) | `evaluation_id`, `evaluator_id` | `EVALUATION` (`evaluation_id`), `PERSON` (`evaluator_id`) |
| `CRITERION_RESULT` | `criterion_results` | `id` | — (via `evaluation_id`) | `evaluation_id`, `criterion_id`, `value`, `created_at` | `EVALUATION` (`evaluation_id`), `EVALUATION_CRITERION` (`criterion_id`) |
| `EVALUATION_FEEDBACK` | `evaluation_feedback` | `id` | — (via `evaluation_id`) | `evaluation_id`, `feedback_type`, `created_at` | `EVALUATION` (`evaluation_id`) |
| `EVALUATION_OUTCOME` | `evaluation_outcomes` | `id` | — (via `evaluation_id`) | `evaluation_id`, `outcome_key`, `outcome_value`, `created_at` | `EVALUATION` (`evaluation_id`) |
| `EVALUATION_HISTORY` | `evaluation_history` | `id` | — (via `evaluation_id`) | `evaluation_id`, `captured_at` | `EVALUATION` (`evaluation_id`) |
| `FINANCE_CATEGORY` | `finance_categories` | `id` | `organization_id` | `code`, `name`, `category_type`, `is_active` | — |
| `FINANCIAL_PARTY` | `financial_parties` | `id` | `organization_id` | `party_type`, `person_id`, `name`, `email`, `tax_identifier` | `PERSON` (`person_id`) |
| `FINANCIAL_OBLIGATION` | `financial_obligations` | `id` | `organization_id` | `party_id`, `category_id`, `direction`, `currency`, `gross_amount`, `discount_amount`, `fee_amount`, `net_amount`, `balance_amount`, `state`, `issue_at`, `due_at`, `paid_at`, `cancelled_at`, `branch_id`, `business_unit_id`, `department_id`, `project_id` | `FINANCIAL_PARTY` (`party_id`), `FINANCE_CATEGORY` (`category_id`), `BRANCH` (`branch_id`), `BUSINESS_UNIT` (`business_unit_id`), `DEPARTMENT` (`department_id`), `PROJECT` (`project_id`) |
| `FINANCIAL_OBLIGATION_ITEM` | `financial_obligation_items` | `id` | — (via `obligation_id`) | `obligation_id`, `item_type`, `unit_amount`, `quantity`, `total_amount` | `FINANCIAL_OBLIGATION` (`obligation_id`) |
| `FINANCIAL_TRANSACTION` | `financial_transactions` | `id` | `organization_id` | `party_id`, `direction`, `transaction_type`, `state`, `amount`, `unallocated_amount`, `currency`, `payment_mode`, `reference_number`, `posted_at`, `reversed_at`, `created_at` | `FINANCIAL_PARTY` (`party_id`), `FINANCIAL_TRANSACTION` (`original_transaction_id`) |
| `FINANCIAL_ALLOCATION` | `financial_allocations` | `id` | `organization_id` | `transaction_id`, `obligation_id`, `obligation_item_id`, `allocated_amount` | `FINANCIAL_TRANSACTION` (`transaction_id`), `FINANCIAL_OBLIGATION` (`obligation_id`), `FINANCIAL_OBLIGATION_ITEM` (`obligation_item_id`) |
| `FINANCIAL_ADJUSTMENT` | `financial_adjustments` | `id` | `organization_id` | `obligation_id`, `adjustment_type`, `amount`, `created_by_person_id` | `FINANCIAL_OBLIGATION` (`obligation_id`), `PERSON` (`created_by_person_id`) |
| `FINANCIAL_BUDGET` | `financial_budgets` | `id` | `organization_id` | `business_unit_id`, `department_id`, `project_id`, `category_id`, `period_name`, `budget_amount`, `allocated_amount`, `spent_amount`, `period_start`, `period_end`, `status` | `BUSINESS_UNIT` (`business_unit_id`), `DEPARTMENT` (`department_id`), `PROJECT` (`project_id`), `FINANCE_CATEGORY` (`category_id`) |
| `EVENT_OUTBOX` | `event_outbox` | `id` | `organization_id` | `event_name`, `event_version`, `entity_type`, `entity_id`, `status`, `retry_count`, `scheduled_at`, `dispatched_at`, `created_at` | `USER` (`actor_id`), `PERSON` (`actor_person_id`) |
| `EVENT_CONSUMER_RECORD` | `event_consumer_records` | `id` | `organization_id` | `event_id`, `consumer_name`, `status`, `processed_at` | `EVENT_OUTBOX` (`event_id`) |
| `EVENT_REGISTRY` | `event_registry` | `id` | — (Global Registry) | `event_name`, `version`, `source_module`, `is_active`, `created_at` | — |

---

## Analytics Source Registry & Declarative Safety Model

The Analytics Source Registry defines the strict allowlist for metric specifications:

```json
{
  "allowedLogicalEntities": [
    "ORGANIZATION", "USER", "ORGANIZATION_MEMBERSHIP", "BRANCH", "BUSINESS_UNIT", "DEPARTMENT", "TEAM",
    "PERSON", "ROLE", "PERSON_ROLE", "EMPLOYMENT", "EMPLOYMENT_HISTORY", "SKILL", "PERSON_SKILL",
    "ASSIGNMENT", "ASSIGNMENT_HISTORY",
    "PROJECT", "PROJECT_OWNER", "PROJECT_BUSINESS_UNIT", "TASK", "TASK_DEPENDENCY",
    "WORK_CATEGORY", "WORK_RECORD", "WORK_EVIDENCE", "OUTCOME", "WORK_OUTCOME",
    "MEETING_TYPE", "MEETING", "MEETING_TARGET", "MEETING_PARTICIPANT", "MEETING_AGENDA_ITEM", "MEETING_NOTE", "MEETING_DECISION", "MEETING_ACTION_ITEM",
    "LEARNING_PROGRAM", "LEARNING_PROGRAM_MILESTONE", "LEARNING_ACTIVITY_DEFINITION", "LEARNING_ENROLLMENT", "ENROLLMENT_MILESTONE", "LEARNING_ACTIVITY", "LEARNING_ACTIVITY_REFERENCE", "LEARNING_REVIEW", "LEARNING_REVIEW_CHANGE", "LEARNING_ASSESSMENT", "LEARNING_ASSESSMENT_ATTEMPT",
    "EVALUATION_TEMPLATE", "EVALUATION_CRITERION", "EVALUATION", "EVALUATION_EVALUATOR", "CRITERION_RESULT", "EVALUATION_FEEDBACK", "EVALUATION_OUTCOME", "EVALUATION_HISTORY",
    "FINANCE_CATEGORY", "FINANCIAL_PARTY", "FINANCIAL_OBLIGATION", "FINANCIAL_OBLIGATION_ITEM", "FINANCIAL_TRANSACTION", "FINANCIAL_ALLOCATION", "FINANCIAL_ADJUSTMENT", "FINANCIAL_BUDGET",
    "AUDIT_LOG", "EVENT_OUTBOX", "EVENT_CONSUMER_RECORD", "EVENT_REGISTRY"
  ],
  "allowedOperators": ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "between", "is_null", "is_not_null"],
  "allowedAggregations": ["COUNT", "SUM", "AVERAGE", "RATE", "PERCENTAGE", "WEIGHTED_AGGREGATION", "TREND"],
  "allowedDimensions": [
    "organization_id", "branch_id", "business_unit_id", "department_id", "team_id",
    "person_id", "role_id", "project_id", "task_id", "learning_program_id",
    "template_id", "category_id", "meeting_type_id", "time_period"
  ]
}
```

Metric definitions violating this registry or attempting to specify unlisted logical entities or arbitrary raw SQL strings are rejected at validation time before database query construction.

---

## KPI Framework Specifications (Reconciled Exact Columns)

### 1. Placement Rate (Academy KPI)
* **Code**: `KPI_PLACEMENT_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Completed LEARNING_ENROLLMENT with Placement / Count of Total Completed LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`, `employments`
* **Exact Columns**: `learning_enrollments.status`, `employments.employment_type`, `employments.status`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period` (`enrolled_at` / `completed_at`)

### 2. Internship Rate (Academy KPI)
* **Code**: `KPI_INTERNSHIP_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Active LEARNING_ENROLLMENT with Active Internship Assignment / Count of Total Active LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`, `assignments`
* **Exact Columns**: `learning_enrollments.status`, `assignments.assignment_type`, `assignments.status`
* **Dimensions**: `organization_id`, `learning_program_id`, `business_unit_id`, `time_period`

### 3. Student Satisfaction (Academy KPI)
* **Code**: `KPI_STUDENT_SATISFACTION`
* **Domain**: `evaluation`
* **Formula Spec**: `Analysis of CRITERION_RESULT for EVALUATION linked to Student/Mentorship templates`
* **Logical Source Entity**: `CRITERION_RESULT`
* **Physical Tables**: `evaluations`, `criterion_results`, `evaluation_templates`
* **Exact Columns**: `criterion_results.value`, `evaluations.state`, `evaluation_templates.name`
* **Dimensions**: `organization_id`, `learning_program_id`, `person_id`, `time_period` (`evaluations.completed_at`)

### 4. Completion Rate (Academy KPI)
* **Code**: `KPI_COMPLETION_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of LEARNING_ENROLLMENT where status = 'completed' / Count of Closed LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`
* **Exact Columns**: `learning_enrollments.status`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 5. Alumni Success (Academy KPI)
* **Code**: `KPI_ALUMNI_SUCCESS`
* **Domain**: `people`
* **Formula Spec**: `Count of Active EMPLOYMENT for Persons with Completed LEARNING_ENROLLMENT / Total Completed Students`
* **Logical Source Entity**: `PERSON`
* **Physical Tables**: `people`, `employments`, `learning_enrollments`
* **Exact Columns**: `employments.status`, `learning_enrollments.status`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 6. Student Growth (Academy KPI)
* **Code**: `KPI_STUDENT_GROWTH`
* **Domain**: `learning`
* **Formula Spec**: `((Current Period LEARNING_ENROLLMENT - Previous Period LEARNING_ENROLLMENT) / Previous Period LEARNING_ENROLLMENT) * 100`
* **Logical Source Entity**: `LEARNING_ENROLLMENT`
* **Physical Tables**: `learning_enrollments`
* **Exact Columns**: `learning_enrollments.created_at`, `learning_enrollments.enrolled_at`
* **Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 7. Revenue (Finance KPI)
* **Code**: `KPI_REVENUE`
* **Domain**: `finance`
* **Formula Spec**: `Sum of amount in FINANCIAL_TRANSACTION where direction = 'inflow' AND state = 'Posted'`
* **Logical Source Entity**: `FINANCIAL_TRANSACTION`
* **Physical Tables**: `financial_transactions`, `financial_parties`, `finance_categories`
* **Exact Columns**: `financial_transactions.amount`, `financial_transactions.direction`, `financial_transactions.state`, `financial_transactions.posted_at`, `financial_transactions.payment_mode`
* **Dimensions**: `organization_id`, `business_unit_id`, `department_id`, `category_id`, `time_period` (`posted_at`)

### 8. Founder Contribution (Work KPI)
* **Code**: `KPI_FOUNDER_CONTRIBUTION`
* **Domain**: `work`
* **Formula Spec**: `Sum of duration_minutes in WORK_RECORD for Founders where WORK_CATEGORY code IN ('STRATEGY', 'VISION', 'PARTNERSHIPS')`
* **Logical Source Entity**: `WORK_RECORD`
* **Physical Tables**: `work_records`, `work_categories`, `people`, `employments`
* **Exact Columns**: `work_records.duration_minutes`, `work_categories.code`, `employments.job_title`
* **Dimensions**: `organization_id`, `business_unit_id`, `category_id`, `time_period` (`started_at`)

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
