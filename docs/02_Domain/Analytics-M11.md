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
* `calculationSpec`: Declarative JSON structure defining source entities, fields, filter rules, numerator/denominator references, or weights from the Analytics Source Registry.
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

### Allowlist Schema Registry Specifications:

1. **Allowed Source Entities**:
   * `work_logs`, `work_categories`, `work_outcomes`, `work_evidence`
   * `projects`, `project_business_units`, `project_owners`, `tasks`, `task_dependencies`
   * `learning_programs`, `learning_program_milestones`, `learning_enrollments`, `enrollment_milestones`, `learning_reviews`, `assessments`, `assessment_attempts`
   * `evaluation_templates`, `evaluation_criteria`, `evaluations`, `criterion_results`, `evaluation_outcomes`
   * `finance_categories`, `financial_parties`, `financial_obligations`, `financial_transactions`, `financial_allocations`, `financial_budgets`
   * `people`, `user_identities`, `employments`, `skills`, `assignments`, `meetings`, `audit_logs`

2. **Allowed Filter Operators**:
   * `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `between`, `is_null`, `is_not_null`

3. **Allowed Aggregations**:
   * `COUNT`, `SUM`, `AVERAGE`, `MIN`, `MAX`, `RATE`, `PERCENTAGE`, `WEIGHTED_AGGREGATION`, `TREND`

4. **Allowed Relationships & Joins**:
   * `learning_enrollments -> people` via `person_id`
   * `learning_enrollments -> learning_programs` via `learning_program_id`
   * `criterion_results -> evaluations` via `evaluation_id`
   * `evaluations -> evaluation_templates` via `template_id`
   * `evaluations -> people` via `subject_id`
   * `financial_obligations -> finance_categories` via `category_id`
   * `financial_transactions -> financial_parties` via `party_id`
   * `work_logs -> work_categories` via `work_category_id`
   * `work_logs -> projects` via `project_id`
   * `tasks -> projects` via `project_id`
   * `employments -> people` via `person_id`

---

## Declarative Calculation Specification Examples

### 1. `COUNT` Metric
```json
{
  "metricType": "COUNT",
  "sourceEntity": "work_logs",
  "filter": {
    "work_category_id": "cat-strategy-uuid"
  }
}
```

### 2. `SUM` Metric
```json
{
  "metricType": "SUM",
  "sourceEntity": "financial_transactions",
  "targetColumn": "amount",
  "filter": {
    "direction": "inflow",
    "state": "Posted"
  }
}
```

### 3. `AVERAGE` Metric
```json
{
  "metricType": "AVERAGE",
  "sourceEntity": "criterion_results",
  "targetColumn": "value",
  "join": {
    "targetEntity": "evaluations",
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
    "sourceEntity": "learning_enrollments",
    "filter": { "status": "completed" }
  },
  "denominator": {
    "sourceEntity": "learning_enrollments",
    "filter": { "status": ["completed", "withdrawn", "cancelled"] }
  }
}
```

---

## Supported Dimensions Matrix (Reconciled)

| Dimension Code | Reconciled Physical Source Column | Supported Operational Modules |
|----------------|-----------------------------------|-------------------------------|
| `organization_id` | `organization_id` | All Modules (Mandatory Tenant Scope) |
| `branch_id` | `branch_id` | Organization, People, Work, Finance |
| `business_unit_id` | `business_unit_id` | Organization, Projects, Work, Learning, Finance |
| `department_id` | `department_id` | Organization, People, Finance |
| `team_id` | `team_id` | Organization, People, Projects |
| `person_id` | `person_id` / `subject_id` | People, Assignments, Work, Meetings, Learning, Evaluation |
| `role_id` | `role_id` | People, Assignments |
| `project_id` | `project_id` | Projects, Work, Finance |
| `task_id` | `task_id` | Projects, Work |
| `learning_program_id` | `learning_program_id` | Learning, Evaluation |
| `evaluation_template_id` | `template_id` | Evaluation |
| `category_id` | `category_id` / `work_category_id` | Work, Finance |
| `time_period` | `created_at` / `posted_at` / `started_at` | All Modules |

---

## Domain Business Rules & Security Constraints

1. **Read-Only Non-Authoritative Engine**: Analytics operations must never mutate operational source data. Derived analytical metrics cannot be written back to transactional tables as primary state.
2. **Allowlist Spec Execution Safety**: Metric specifications must parse strictly against the Analytics Source Registry. Dynamic raw SQL execution or arbitrary script invocation is strictly prohibited.
3. **Mandatory Tenant Scoping**: All metric definition lookups, query evaluations, snapshot retrievals, and report executions must enforce `organization_id = $1`. Cross-tenant queries return HTTP `404 Not Found`.
4. **Per-Execution Contextual Scope Security**:
   * Viewing metrics (`analytics:view`) is constrained by the caller's organizational scope (`Role + Business Unit + Team + Project`).
   * `isPublic = true` on a saved report shares report layout metadata only.
   * Every report execution independently re-evaluates the executing user's `Role + Business Unit + Team + Project` against every underlying metric and physical source table. A report creator cannot expose restricted data to unauthorized users by setting `isPublic = true`.
5. **Standardized Time Boundaries**: All source filters operate on UTC timestamps. Time bucket truncations occur at UTC period boundaries.
6. **Immutable Snapshot Versioning**: Rows in `analytics_metric_results` are append-only. Recalculations write a new snapshot row with `calculation_version = previous_version + 1` and a distinct `calculation_run_id`. Updates to historical rows in place are strictly prohibited.

---

## Cross-Domain Integration Mapping (Reconciled Physical Entities)

```text
  ┌──────────────────────┐
  │ Organization Engine  ├──────────┐ (organizations, branches, business_units, departments, teams)
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │    People Engine     ├──────────┤ (people, user_identities, employments, skills)
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │  Assignment Engine   ├──────────┤ (assignments)
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │Projects/Tasks Engine ├──────────┤ (projects, tasks, task_dependencies)
  └──────────────────────┘          │
  ┌──────────────────────┐          ├───► ┌──────────────────────────┐
  │     Work Engine      ├──────────┤     │    Analytics Engine      │
  └──────────────────────┘          │     │  (Metric & Report Query) │
  ┌──────────────────────┐          │     └──────────────────────────┘
  │   Meetings Engine    ├──────────┤ (meetings, meeting_participants)
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │   Learning Engine    ├──────────┤ (learning_programs, learning_enrollments, assessments)
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │  Evaluation Engine   ├──────────┤ (evaluations, evaluation_templates, criterion_results)
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │    Finance Engine    ├──────────┘ (financial_obligations, financial_transactions, financial_budgets)
  └──────────────────────┘
```

---
*Document frozen for Milestone 11 — Analytics Engine Architecture.*
