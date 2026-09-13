# REST API Architecture & Contracts — M11 Analytics

## Base URL

`/api/v1/analytics`

All endpoints require JWT Authentication (`Authorization: Bearer <token>`) and mandatory Tenant Resolution via `X-Organization-Id` header or authenticated user organization context.

---

## Authorization & Security Rules

* **Tenant Isolation**: All operations mandate `organization_id`. Requests attempting to access metric definitions, results, or saved reports belonging to another tenant return HTTP `404 Not Found`.
* **Required Permissions**:
  * `analytics:view`: Required to list metric definitions, view metric definitions, compute metric results, list saved reports, and execute saved reports.
  * `analytics:define`: Required to create, update, or deactivate metric definitions and saved reports.
* **Per-Execution Contextual Scope Security**:
  * Metric computation and report execution automatically enforce the user's authorized organizational scope (`Role + Business Unit + Team + Project`).
  * Setting `isPublic = true` on a saved report shares the report layout definition (title, metrics list, dimensions) with authorized tenant users. It does **NOT** grant data access to underlying domain metrics or physical tables.
  * Every report execution independently re-evaluates the caller's organizational scope against every underlying metric and source table.

---

## Declarative Safety Validation & Analytics Source Registry

All `calculationSpec` structures submitted via `POST /api/v1/analytics/metrics` are validated against the **Analytics Source Registry**:

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

* Allowed operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `between`, `is_null`, `is_not_null`.
* Allowed aggregations: `COUNT`, `SUM`, `AVERAGE`, `MIN`, `MAX`, `RATE`, `PERCENTAGE`, `WEIGHTED_AGGREGATION`, `TREND`.

Requests containing unlisted logical entity identifiers, physical table names, column names, raw SQL fragments, or dynamic code snippets return HTTP `400 Bad Request`.

---

## Response & Error Envelopes

### Success Envelope
```json
{
  "data": {},
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2026-09-13T18:50:00Z"
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to access analytics for this business unit",
    "details": []
  },
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2026-09-13T18:50:00Z"
  }
}
```

---

## Endpoint Contracts

### 1. Create Metric Definition
`POST /api/v1/analytics/metrics`

Creates a new declarative metric specification for the tenant.

**Permission**: `analytics:define`

**Request Body**:
```json
{
  "name": "Student Placement Rate",
  "code": "KPI_PLACEMENT_RATE",
  "domainModule": "learning",
  "metricType": "PERCENTAGE",
  "calculationSpec": {
    "numerator": {
      "sourceEntity": "LEARNING_ENROLLMENT",
      "filter": { "status": "completed" }
    },
    "denominator": {
      "sourceEntity": "LEARNING_ENROLLMENT",
      "filter": { "status": "completed" }
    }
  },
  "supportedDimensions": ["organization_id", "learning_program_id", "time_period"]
}
```

**Response (201 Created)**:
```json
{
  "data": {
    "id": "77a82b99-3c41-4822-a9e1-b841029c7821",
    "organizationId": "e2cca8ed-b8c2-476b-b77c-b0fcb50cae2a",
    "name": "Student Placement Rate",
    "code": "KPI_PLACEMENT_RATE",
    "domainModule": "learning",
    "metricType": "PERCENTAGE",
    "calculationSpec": {
      "numerator": {
        "sourceEntity": "LEARNING_ENROLLMENT",
        "filter": { "status": "completed" }
      },
      "denominator": {
        "sourceEntity": "LEARNING_ENROLLMENT",
        "filter": { "status": "completed" }
      }
    },
    "supportedDimensions": ["organization_id", "learning_program_id", "time_period"],
    "createdBy": "user-admin-uuid",
    "isActive": true,
    "createdAt": "2026-09-13T18:50:00.000Z",
    "updatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-1", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 2. List Metric Definitions
`GET /api/v1/analytics/metrics`

Lists active metric definitions for the organization.

**Permission**: `analytics:view`

**Query Parameters**:
* `domainModule` (optional): Filter by domain module (`learning`, `finance`, `work`, etc.).
* `metricType` (optional): Filter by metric type (`COUNT`, `PERCENTAGE`, etc.).
* `limit` (optional, default 50): Pagination limit.
* `offset` (optional, default 0): Pagination offset.

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "77a82b99-3c41-4822-a9e1-b841029c7821",
      "name": "Student Placement Rate",
      "code": "KPI_PLACEMENT_RATE",
      "domainModule": "learning",
      "metricType": "PERCENTAGE",
      "supportedDimensions": ["organization_id", "learning_program_id", "time_period"],
      "isActive": true
    }
  ],
  "meta": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "requestId": "req-m11-2",
    "timestamp": "2026-09-13T18:50:00Z"
  }
}
```

---

### 3. Get Metric Definition by ID
`GET /api/v1/analytics/metrics/:id`

Retrieves single metric definition by primary key.

**Permission**: `analytics:view`

**Response (200 OK)**:
```json
{
  "data": {
    "id": "77a82b99-3c41-4822-a9e1-b841029c7821",
    "organizationId": "e2cca8ed-b8c2-476b-b77c-b0fcb50cae2a",
    "name": "Student Placement Rate",
    "code": "KPI_PLACEMENT_RATE",
    "domainModule": "learning",
    "metricType": "PERCENTAGE",
    "calculationSpec": {
      "numerator": { "sourceEntity": "LEARNING_ENROLLMENT", "filter": { "status": "completed" } },
      "denominator": { "sourceEntity": "LEARNING_ENROLLMENT", "filter": { "status": "completed" } }
    },
    "supportedDimensions": ["organization_id", "learning_program_id", "time_period"],
    "createdBy": "user-admin-uuid",
    "isActive": true,
    "createdAt": "2026-09-13T18:50:00.000Z",
    "updatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-3", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 4. Compute Metric Result
`POST /api/v1/analytics/metrics/:id/compute`

Computes metric result on-demand or retrieves a pre-computed historical snapshot.

**Permission**: `analytics:view`

**Request Body**:
```json
{
  "periodType": "month",
  "startDate": "2026-08-01T00:00:00Z",
  "endDate": "2026-08-31T23:59:59Z",
  "dimensionFilters": {
    "learning_program_id": "prog-fs-eng-uuid"
  },
  "useSnapshot": false,
  "calculationVersion": 1
}
```

**Response (200 OK)**:
```json
{
  "data": {
    "metricDefinitionId": "77a82b99-3c41-4822-a9e1-b841029c7821",
    "code": "KPI_PLACEMENT_RATE",
    "periodType": "month",
    "periodStart": "2026-08-01T00:00:00.000Z",
    "periodEnd": "2026-08-31T23:59:59.000Z",
    "dimensionValues": {
      "learning_program_id": "prog-fs-eng-uuid"
    },
    "numericValue": 85.7143,
    "details": {
      "numeratorCount": 18,
      "denominatorCount": 21
    },
    "calculationVersion": 1,
    "calculationRunId": "run-99b11a44-uuid",
    "calculatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-4", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 5. Create Saved Report Configuration
`POST /api/v1/analytics/reports`

Saves a reusable report query layout for tenant users.

**Permission**: `analytics:define`

**Request Body**:
```json
{
  "name": "Academy Placement & Finance Overview",
  "description": "Monthly report tracking placement rate and incoming revenue.",
  "metricIds": ["77a82b99-3c41-4822-a9e1-b841029c7821"],
  "dimensions": ["learning_program_id", "business_unit_id"],
  "filters": {
    "business_unit_id": "bu-academy-uuid"
  },
  "timeWindow": {
    "periodType": "month",
    "startDate": "2026-08-01T00:00:00Z",
    "endDate": "2026-08-31T23:59:59Z"
  },
  "groupBy": ["learning_program_id"],
  "sortBy": [{ "field": "numericValue", "direction": "DESC" }],
  "isPublic": true
}
```

**Response (201 Created)**:
```json
{
  "data": {
    "id": "rep-99b11a44-8c12-4211-9e45-123456789abc",
    "organizationId": "e2cca8ed-b8c2-476b-b77c-b0fcb50cae2a",
    "name": "Academy Placement & Finance Overview",
    "description": "Monthly report tracking placement rate and incoming revenue.",
    "metricIds": ["77a82b99-3c41-4822-a9e1-b841029c7821"],
    "dimensions": ["learning_program_id", "business_unit_id"],
    "filters": { "business_unit_id": "bu-academy-uuid" },
    "timeWindow": { "periodType": "month" },
    "groupBy": ["learning_program_id"],
    "sortBy": [{ "field": "numericValue", "direction": "DESC" }],
    "createdBy": "user-admin-uuid",
    "isPublic": true,
    "createdAt": "2026-09-13T18:50:00.000Z",
    "updatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-5", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 6. List Saved Reports
`GET /api/v1/analytics/reports`

Lists saved report configurations available to the caller within the organization.

**Permission**: `analytics:view`

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "rep-99b11a44-8c12-4211-9e45-123456789abc",
      "name": "Academy Placement & Finance Overview",
      "description": "Monthly report tracking placement rate and incoming revenue.",
      "metricIds": ["77a82b99-3c41-4822-a9e1-b841029c7821"],
      "isPublic": true,
      "createdAt": "2026-09-13T18:50:00.000Z"
    }
  ],
  "meta": { "total": 1, "requestId": "req-m11-6", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 7. Execute Saved Report
`POST /api/v1/analytics/reports/:id/execute`

Executes a saved report query configuration, evaluating included metrics and returning grouped result sets scoped to caller's permissions.

**Permission**: `analytics:view`

**Request Body (Optional Overrides)**:
```json
{
  "overrideTimeWindow": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-08-31T23:59:59Z"
  }
}
```

**Response (200 OK)**:
```json
{
  "data": {
    "reportId": "rep-99b11a44-8c12-4211-9e45-123456789abc",
    "reportName": "Academy Placement & Finance Overview",
    "executedAt": "2026-09-13T18:50:00.000Z",
    "results": [
      {
        "metricCode": "KPI_PLACEMENT_RATE",
        "metricName": "Student Placement Rate",
        "groupKey": { "learning_program_id": "prog-fs-eng-uuid" },
        "numericValue": 85.7143,
        "details": { "numeratorCount": 18, "denominatorCount": 21 }
      }
    ]
  },
  "meta": { "requestId": "req-m11-7", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---
*Document frozen for Milestone 11 – Analytics API Contracts.*
