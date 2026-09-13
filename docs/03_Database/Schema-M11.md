# Database Architecture & Schema — M11 Analytics

## Migration Reservation

`011_analytics_m11_schema.sql`

All tables use UUID primary keys (`gen_random_uuid()`), tenant scoping (`organization_id`), UTC timestamps (`TIMESTAMPTZ`), strict foreign key references, and indexes consistent with M1–M10 conventions.

---

## DDL Schema Specifications

### 1. Table: `analytics_metric_definitions`

Stores configurable, declarative metric specifications:

```sql
CREATE TABLE IF NOT EXISTS analytics_metric_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(100) NOT NULL,
    domain_module VARCHAR(50) NOT NULL CHECK (
        domain_module IN (
            'organization', 'people', 'assignments', 'projects',
            'work', 'meetings', 'learning', 'evaluation', 'finance'
        )
    ),
    metric_type VARCHAR(50) NOT NULL CHECK (
        metric_type IN (
            'COUNT', 'SUM', 'AVERAGE', 'MIN', 'MAX', 'RATE',
            'PERCENTAGE', 'WEIGHTED_AGGREGATION', 'TREND'
        )
    ),
    calculation_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_org_metric_code UNIQUE (organization_id, code)
);
```

### 2. Table: `analytics_metric_results`

Stores append-only computed metric snapshots for historical trend comparisons and pre-calculated aggregations:

```sql
CREATE TABLE IF NOT EXISTS analytics_metric_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_definition_id UUID NOT NULL REFERENCES analytics_metric_definitions(id) ON DELETE CASCADE,
    period_type VARCHAR(30) NOT NULL CHECK (
        period_type IN ('day', 'week', 'month', 'quarter', 'year', 'custom')
    ),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    dimension_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    numeric_value NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    details JSONB NULL,
    calculation_version INT NOT NULL DEFAULT 1,
    calculation_run_id UUID NOT NULL DEFAULT gen_random_uuid(),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. Table: `analytics_reports`

Stores saved report query configurations:

```sql
CREATE TABLE IF NOT EXISTS analytics_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    metric_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    time_window JSONB NOT NULL DEFAULT '{}'::jsonb,
    group_by JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_by JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Indexing Strategy

Optimizes metric definition lookups, snapshot trend queries, and saved report execution:

```sql
-- Metric definition indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org ON analytics_metric_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_domain ON analytics_metric_definitions(organization_id, domain_module);

-- Metric result snapshot indexes (versioned append-only snapshots)
CREATE INDEX IF NOT EXISTS idx_analytics_results_def ON analytics_metric_results(metric_definition_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_results_org_period ON analytics_metric_results(organization_id, period_type, period_start, calculation_version DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_results_run ON analytics_metric_results(calculation_run_id);

-- Saved report indexes
CREATE INDEX IF NOT EXISTS idx_analytics_reports_org ON analytics_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_creator ON analytics_reports(organization_id, created_by);
```

---

## Analytics Source Registry (Exact Physical Column Mapping)

All analytical queries map to established M1–M10 physical database schema structures and exact PostgreSQL column names:

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

## Source Table Index Recommendations (Reconciled Physical Entities)

To support high-throughput live analytical aggregations without full table scans, source transactional tables should maintain composite operational indexes:

* `work_records`: `(organization_id, category_id, started_at)`
* `financial_transactions`: `(organization_id, state, transaction_type, posted_at)`
* `financial_obligations`: `(organization_id, state, due_at)`
* `learning_enrollments`: `(organization_id, status, created_at)`
* `tasks`: `(organization_id, status, created_at)`
* `meetings`: `(organization_id, status, scheduled_start_at)`
* `meeting_targets`: `(organization_id, target_type, target_id)`
* `evaluations`: `(organization_id, state, template_id, created_at)`
* `criterion_results`: `(evaluation_id, criterion_id)`

---

## Triggers for Future Architecture Review (Data Warehouse)

PostgreSQL serves as the unified relational engine for operational CRUD and analytical queries. Introducing an out-of-band analytical data warehouse (e.g., ClickHouse, Snowflake, DuckDB) is deferred until the following empirical performance thresholds indicate a **Future Architecture Review**:

1. **Row Volume Threshold Trigger**: Transactional source tables (e.g. `work_records`, `audit_logs`) exceed 10 million rows per organization tenant.
2. **Performance Contention Trigger**: Live analytical query execution causes measurable lock contention or API p99 latency degradation (>500ms) on transactional CRUD workloads.
3. **High-Cardinality OLAP Trigger**: Requirements demand complex multi-dimensional OLAP cube slice-and-dice over multi-year historical datasets that cannot be served within 2 seconds by indexed PostgreSQL queries.

When triggered, an architectural review will evaluate an out-of-band analytical replica or dedicated OLAP store fed asynchronously via the M10 Transactional Outbox (`event_outbox`).

---
*Document frozen for Milestone 11 – Analytics Database Schema.*
