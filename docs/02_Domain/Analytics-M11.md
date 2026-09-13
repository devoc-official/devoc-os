# Analytics Engine Domain Specification — Milestone 11

## Domain Overview

The **Analytics Engine** is a downstream, read-oriented decision support domain for DeVoc OS. It defines, computes, and renders metrics, key performance indicators (KPIs), trends, and saved reports across all operational domains (Organization, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit/Events).

The Analytics Engine does not own operational transactional state. It provides a structured, multi-tenant framework to extract analytical insights safely, deterministically, and securely.

---

## Core Domain Entities

```text
┌────────────────────────────────┐       1 : N       ┌────────────────────────────────┐
│       MetricDefinition         ├──────────────────►│          MetricResult          │
│ (Declarative JSON Aggregation) │                   │  (Versioned Append-Only Snapshot│
└───────────────┬────────────────┘                   └────────────────────────────────┘
                │
                │ 1 : N
                ▼
┌────────────────────────────────┐
│          SavedReport           │
│  (Reusable Saved Configuration)│
└────────────────────────────────┘
```

### 1. `MetricDefinition`
Represents a declarative, reusable metric specification:
* `id`: Primary key (UUID).
* `organizationId`: Tenant owner ID (UUID).
* `name`: Human-readable metric title (e.g., "Student Placement Rate").
* `code`: Unique machine-readable metric identifier (e.g., `KPI_PLACEMENT_RATE`).
* `domainModule`: Target operational module (`organization`, `people`, `assignments`, `projects`, `work`, `meetings`, `learning`, `evaluation`, `finance`).
* `metricType`: Aggregation type (`COUNT`, `SUM`, `AVERAGE`, `MIN`, `MAX`, `RATE`, `PERCENTAGE`, `WEIGHTED_AGGREGATION`, `TREND`).
* `calculationSpec`: Declarative JSON structure defining logical source entities, target fields, filter rules, numerator/denominator references, or weights from the Analytics Source Registry.
* `supportedDimensions`: Array of allowed dimension codes (e.g., `["organization_id", "business_unit_id", "learning_program_id", "time_period"]`).
* `createdBy`: User ID initiating metric creation (UUID).
* `isActive`: Boolean flag indicating if metric is available for queries.
* `createdAt` / `updatedAt`: Standard UTC timestamps (`TIMESTAMPTZ`).

### 2. `MetricResult`
Represents an append-only calculated metric output instance (live calculation output or persisted snapshot):
* `id`: Primary key (UUID).
* `organizationId`: Tenant owner ID (UUID).
* `metricDefinitionId`: Reference to source `MetricDefinition` (UUID).
* `periodType`: Aggregation window type (`day`, `week`, `month`, `quarter`, `year`, `custom`).
* `periodStart` / `periodEnd`: Window boundary timestamps (UTC `TIMESTAMPTZ`).
* `dimensionValues`: JSON object of dimension key-value pairs (e.g., `{"business_unit_id": "bu-123"}`).
* `numericValue`: Main calculated numeric result (e.g., `87.5000`).
* `details`: Supplementary breakdown metadata (e.g., `{ "numeratorCount": 35, "denominatorCount": 40 }`).
* `calculationVersion`: Integer version number for snapshot recalculations (starts at `1`).
* `calculationRunId`: Unique UUID generated per calculation run.
* `calculatedAt`: UTC timestamp of computation execution (`TIMESTAMPTZ`).

### 3. `SavedReport`
Represents a saved user/team analytical report layout:
* `id`: Primary key (UUID).
* `organizationId`: Tenant owner ID (UUID).
* `name`: Report title (e.g., "Monthly BU Productivity Summary").
* `description`: Report purpose summary.
* `metricIds`: Array of `MetricDefinition` IDs included in report.
* `dimensions`: Array of dimensions selected for grouping/slicing.
* `filters`: Default filter selections (JSON).
* `timeWindow`: Default time range configuration (JSON).
* `groupBy`: Array of group-by fields.
* `sortBy`: Array of sort configuration objects (`field`, `direction`).
* `createdBy`: Creator user ID (UUID).
* `isPublic`: Visibility flag (false = private to creator; true = report configuration layout shared with authorized tenant users).
* `createdAt` / `updatedAt`: Standard UTC timestamps (`TIMESTAMPTZ`).

---

## Declarative Safety Model & Analytics Source Registry

Metric specifications (`calculationSpec`) are validated against an explicit Analytics Source Registry before execution. Direct SQL string concatenation, raw SQL strings, arbitrary table/column references, and runtime script evaluation (`eval()`) are prohibited.

### Analytics Source Registry (Exact Physical Mapping)

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

## Declarative Calculation Specification Examples

### 1. `COUNT` Metric
```json
{
  "metricType": "COUNT",
  "sourceEntity": "WORK_RECORD",
  "filter": {
    "category_id": "cat-strategy-uuid"
  }
}
```

### 2. `SUM` Metric
```json
{
  "metricType": "SUM",
  "sourceEntity": "FINANCIAL_TRANSACTION",
  "targetColumn": "amount",
  "filter": {
    "transaction_type": "payment",
    "state": "Posted"
  }
}
```

### 3. `AVERAGE` Metric
```json
{
  "metricType": "AVERAGE",
  "sourceEntity": "CRITERION_RESULT",
  "targetColumn": "value",
  "join": {
    "targetEntity": "EVALUATION",
    "onField": "evaluation_id"
  },
  "filter": {
    "evaluations.state": "Completed"
  }
}
```

### 4. `PERCENTAGE` Metric
```json
{
  "metricType": "PERCENTAGE",
  "numerator": {
    "sourceEntity": "LEARNING_ENROLLMENT",
    "filter": { "status": "completed" }
  },
  "denominator": {
    "sourceEntity": "LEARNING_ENROLLMENT",
    "filter": { "status": ["completed", "withdrawn", "cancelled"] }
  }
}
```

---

## Supported Dimensions Matrix (Reconciled Exact Columns)

| Dimension Code | Reconciled Physical Source Column | Supported Operational Modules |
|----------------|-----------------------------------|-------------------------------|
| `organization_id` | `organization_id` | All Modules (Mandatory Tenant Scope) |
| `branch_id` | `branch_id` | Organization, People, Finance |
| `business_unit_id` | `business_unit_id` | Organization, Projects, Work, Learning, Finance, Meetings (via `meeting_targets`) |
| `department_id` | `department_id` | Organization, People, Finance |
| `team_id` | `team_id` | Organization, People, Projects |
| `person_id` | `person_id` / `subject_id` / `organizer_person_id` | People, Assignments, Work, Meetings, Learning, Evaluation |
| `role_id` | `role_id` | People, Assignments |
| `project_id` | `project_id` | Projects, Work, Finance, Meetings (via `meeting_targets`) |
| `task_id` | `task_id` | Projects, Work, Meetings (via `meeting_action_items`) |
| `learning_program_id` | `learning_program_id` | Learning, Evaluation |
| `template_id` | `template_id` | Evaluation |
| `category_id` | `category_id` | Work, Finance |
| `meeting_type_id` | `meeting_type_id` | Meetings |
| `time_period` | `created_at` / `posted_at` / `scheduled_start_at` | All Modules |

---

## Domain Business Rules & Security Constraints

1. **Read-Only Non-Authoritative Engine**: Analytics operations must never mutate operational source data. Derived analytical metrics cannot be written back to transactional tables as primary state.
2. **Allowlist Spec Execution Safety**: Metric specifications must parse strictly against registered logical source entities in the Analytics Source Registry. Dynamic raw SQL execution or arbitrary script invocation is strictly prohibited.
3. **Mandatory Tenant Scoping**: All metric definition lookups, query evaluations, snapshot retrievals, and report executions must enforce `organization_id = $1`. Cross-tenant queries return HTTP `404 Not Found`.
4. **Per-Execution Contextual Scope Security**:
   * Evaluates user's `Role + Business Unit + Team + Project` authorization during every report or metric execution.
   * `isPublic = true` shares report template configuration layout only, never data access.
5. **Immutable Snapshot Recalculation**: Persisted rows in `analytics_metric_results` are immutable. Recalculation appends a new row with incremented `calculation_version`.

---
*Document frozen for Milestone 11 – Analytics Domain Specification.*
