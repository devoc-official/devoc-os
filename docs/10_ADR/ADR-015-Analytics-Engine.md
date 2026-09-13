# ADR-015 — Analytics Engine Architecture

## Status

**Accepted**

## Date

2026-09-13

---

## Context and Problem Statement

DeVoc OS requires enterprise analytics, key performance indicator (KPI) tracking, saved reports, and operational trend evaluation across all business domains (Organization, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit/Events).

The system must answer strategic questions such as:
* What is the Academy's student placement and completion rate across learning programs?
* How productive are business units and project teams in delivering work outcomes?
* What is the financial collection rate and budget utilization by department?
* What is the founder contribution distribution across strategy vs execution tasks?

The architectural challenge is providing flexible, multi-tenant analytics without mutating operational state, violating tenant isolation, creating security loopholes via unvetted query execution, or introducing heavy external data warehouses (e.g., ClickHouse, Snowflake, Kafka, BI microservices) prematurely.

---

## Decision Drivers

1. **Operational Domain Integrity**: Domain engines M1–M10 are the sole authoritative transactional source of truth. Analytics must be strictly read-oriented.
2. **Reconciled Source Entity Accuracy**: Analytics queries must resolve directly to established physical PostgreSQL table names (`work_records`, `work_categories`, `work_evidence`, `outcomes`, `work_outcomes`, `criterion_results`, `evaluations`, `evaluation_templates`, `learning_enrollments`, `learning_programs`, `financial_obligations`, `financial_transactions`, `financial_parties`, `finance_categories`, `financial_budgets`, `people`, `employments`, `assignments`, `projects`, `tasks`, `meetings`, `meeting_types`, `meeting_targets`, `meeting_participants`, `meeting_agenda_items`, `meeting_notes`, `meeting_decisions`, `meeting_action_items`, `audit_logs`, `event_outbox`). Non-existent columns (e.g., `tasks.assignee_id`, `meetings.project_id`, `meetings.business_unit_id`) are prohibited.
3. **Logical Source Identifier Abstraction & Declarative Metric Safety**: Metric specifications must use logical registered source identifiers (e.g., `WORK_RECORD`, `EVALUATION`, `LEARNING_ENROLLMENT`, `MEETING`, `MEETING_TARGET`) defined in an explicit Analytics Source Registry (mapping logical entities to physical tables, allowed columns, operators, dimensions, joins, aggregations). Direct SQL string concatenation, raw SQL strings, arbitrary table/column references, and runtime script evaluation (`eval()`) are prohibited. All query execution resolves through a controlled parameter-bound query builder.
4. **Multi-Tenancy & Per-Execution Contextual Authorization**: Analytics must enforce `organization_id` isolation and reuse the existing DeVoc OS permission model (`Role + Business Unit + Team + Project`). Setting `isPublic = true` on a saved report shares the report template configuration, NOT data access. Every report execution independently re-evaluates the executing user's authorized scope against every underlying metric and physical source table.
5. **Immutable Snapshot Versioning**: Persisted rows in `analytics_metric_results` are append-only. Historical snapshot rows are never updated in place. Recalculations write a new snapshot row with `calculation_version = previous_version + 1` and a distinct `calculation_run_id`.
6. **Architectural Simplicity**: DeVoc OS is built as a production-grade modular monolith. Introducing external OLAP data warehouses, distributed streaming buses, or separate microservices for V1 analytics adds unnecessary operational complexity.

---

## Considered Options

* **Option 1: Dynamic Unsafe SQL / Scripting Engine**: Allow administrators to write raw SQL snippets or JavaScript functions for metrics. (*Rejected*: Poses catastrophic SQL injection, security, and tenant isolation risks).
* **Option 2: External Data Warehouse & ETL Pipeline (ClickHouse / Snowflake + Kafka)**: Asynchronously stream all operational data to an external OLAP database. (*Rejected*: Premature infrastructure complexity; operational dataset fits well within PostgreSQL).
* **Option 3: Declarative Read-Only Analytics Engine within Modular Monolith**: Declarative JSON metric definitions referencing registered logical source identifiers validated against an Analytics Source Registry, live query evaluation over indexed PostgreSQL tables, immutable versioned snapshots for trend comparisons, strict multi-tenant and per-execution contextual authorization scoping. (*Selected*).

---

## Decision Outcome

**Chosen Option: Option 3 — Declarative Read-Only Analytics Engine within Modular Monolith.**

### Key Architectural Decisions:

1. **Read-Only Downstream Integration**: The Analytics Engine reads directly from M1–M10 physical PostgreSQL tables. It does not duplicate operational entities or own primary business state.
2. **Analytics Source Registry Allowlist**: Metric definitions reference registered logical source identifiers validated against an explicit allowlist registry before execution. The query builder constructs parameter-bound SQL queries exclusively for registered entities, fields, operators, joins, and aggregations.
3. **Hybrid Computation & Immutable Versioned Snapshots**:
   * **Live Query Computation**: Primary mode for real-time dashboards and reports. Executed against composite-indexed source tables.
   * **Stored Metric Snapshots**: `analytics_metric_results` table stores periodic append-only snapshots (`day`, `week`, `month`, `quarter`, `year`) with `calculation_version` and `calculation_run_id` for historical trend comparisons. In-place updates to snapshot rows are strictly prohibited.
4. **Per-Execution Contextual Scope Security**: Every report execution independently evaluates `Role + Business Unit + Team + Project` for the executing user against every underlying metric. `isPublic = true` shares template layout metadata only and does not bypass data access controls.
5. **Leveraging M10 Infrastructure**: Metric/report configuration mutations use `AuditService` and publish `eventBus` events for operational auditability.
6. **Triggers for Future Architecture Review**: PostgreSQL remains the unified relational engine. Introducing an analytical warehouse (ClickHouse, Snowflake) is deferred until empirical thresholds (>10M rows per tenant, p99 latency >500ms, multi-year multi-dimensional OLAP cube) trigger a **Future Architecture Review**, rather than acting as automatic migration rules.

---

## Analytics Source Registry (Exact Physical Column Mapping)

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

## Cross-Domain Integration Architecture (Reconciled Physical Entities)

```text
 ┌────────────────────────────────────────────────────────┐
 │            Operational Monolith (M1–M10)               │
 │ work_records, criterion_results, learning_enrollments, │
 │ financial_obligations, financial_transactions, etc.    │
 └───────────────────────────┬────────────────────────────┘
                             │
                             │ Registry-Validated Read-Only SQL (Parameter Bound)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │            Analytics Engine (Milestone 11)             │
 │ ┌───────────────────┐ ┌──────────────────────────────┐ │
 │ │ MetricDefinition  │ │     Metric Computation       │ │
 │ └─────────┬─────────┘ └──────────────┬───────────────┘ │
 │           │                          │                 │
 │           ▼                          ▼                 │
 │ ┌───────────────────┐ ┌──────────────────────────────┐ │
 │ │   SavedReport     │ │   analytics_metric_results   │ │
 │ └───────────────────┘ └──────────────────────────────┘ │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │             REST API (/api/v1/analytics)               │
 └────────────────────────────────────────────────────────┘
```

---
*ADR-015 frozen for Milestone 11 – Analytics Engine Architecture.*
