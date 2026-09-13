# Analytics Engine Domain Specification — Milestone 11

## Domain Overview

The **Analytics Engine** is a downstream, read-oriented decision support domain for DeVoc OS. It defines, computes, and renders metrics, key performance indicators (KPIs), trends, and saved reports across all operational domains (Organization, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit/Events).

The Analytics Engine does not own operational transactional state. It provides a structured, multi-tenant framework to extract analytical insights safely and consistently.

---

## Core Domain Entities

```text
┌────────────────────────────────┐       1 : N       ┌────────────────────────────────┐
│       MetricDefinition         ├──────────────────►│          MetricResult          │
│ (Declarative JSON Aggregation) │                   │  (Computed Live or Snapshot)   │
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
* `metricType`: Aggregation type (`COUNT`, `SUM`, `AVERAGE`, `RATE`, `PERCENTAGE`, `WEIGHTED_AGGREGATION`, `TREND`).
* `calculationSpec`: Declarative JSON structure defining target tables, columns, filter rules, numerator/denominator references, or weights.
* `supportedDimensions`: Array of allowed dimension codes (e.g., `["organization_id", "business_unit_id", "learning_program_id", "time_period"]`).
* `createdBy`: User ID initiating metric creation (UUID).
* `isActive`: Boolean flag indicating if metric is available for queries.
* `createdAt` / `updatedAt`: Standard UTC timestamps (`TIMESTAMPTZ`).

### 2. `MetricResult`
Represents a calculated metric output instance (live calculation result or persisted snapshot):
* `id`: Primary key (UUID).
* `organizationId`: Tenant owner ID (UUID).
* `metricDefinitionId`: Reference to source `MetricDefinition` (UUID).
* `periodType`: Aggregation window type (`day`, `week`, `month`, `quarter`, `year`, `custom`).
* `periodStart` / `periodEnd`: Window boundary timestamps (UTC `TIMESTAMPTZ`).
* `dimensionValues`: JSON object of dimension key-value pairs (e.g., `{"business_unit_id": "bu-123"}`).
* `numericValue`: Main calculated numeric result (e.g., `87.5000`).
* `details`: Supplementary breakdown metadata (e.g., `{ "numeratorCount": 35, "denominatorCount": 40 }`).
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
* `isPublic`: Visibility flag (false = private to creator; true = shared across tenant).
* `createdAt` / `updatedAt`: Standard UTC timestamps (`TIMESTAMPTZ`).

---

## Metric Calculation Specifications

Metric definitions use structured, declarative JSON contracts. Direct SQL string concatenation, unsafe query injection, and dynamic runtime scripts are strictly forbidden.

### 1. `COUNT`
Counts source entities matching conditions:
```json
{
  "metricType": "COUNT",
  "sourceEntity": "work_logs",
  "filter": {
    "status": "completed",
    "work_category_code": "STRATEGY"
  }
}
```

### 2. `SUM`
Sums a specific numeric column:
```json
{
  "metricType": "SUM",
  "sourceEntity": "financial_transactions",
  "targetColumn": "amount",
  "filter": {
    "direction": "INCOMING",
    "status": "POSTED"
  }
}
```

### 3. `AVERAGE`
Calculates arithmetic mean:
```json
{
  "metricType": "AVERAGE",
  "sourceEntity": "evaluation_criterion_results",
  "targetColumn": "score",
  "filter": {
    "evaluation_type": "INTERNSHIP_REVIEW"
  }
}
```

### 4. `RATE` / `PERCENTAGE`
Calculates ratio of two sub-metric calculations:
```json
{
  "metricType": "PERCENTAGE",
  "numerator": {
    "sourceEntity": "enrollments",
    "filter": { "status": "completed", "is_placed": true }
  },
  "denominator": {
    "sourceEntity": "enrollments",
    "filter": { "status": "completed" }
  }
}
```

### 5. `WEIGHTED_AGGREGATION`
Calculates weighted mean using a designated weight column:
```json
{
  "metricType": "WEIGHTED_AGGREGATION",
  "sourceEntity": "evaluation_criterion_results",
  "targetColumn": "score",
  "weightColumn": "weight",
  "filter": {
    "evaluation_type": "PERFORMANCE_REVIEW"
  }
}
```

### 6. `TREND` / `TIMESERIES`
Computes comparative delta over adjacent time periods:
```json
{
  "metricType": "TREND",
  "baseMetricCode": "KPI_REVENUE",
  "comparisonType": "PERIOD_OVER_PERIOD",
  "bucketInterval": "month"
}
```

---

## Supported Dimensions Matrix

The Analytics Engine maps analytical dimensions across operational domain engines:

| Dimension Code | Target Column / Relationship | Supported Modules |
|----------------|------------------------------|-------------------|
| `organization_id` | `organization_id` | All Modules (Mandatory Tenant Scope) |
| `branch_id` | `branch_id` | Organization, People, Work, Finance |
| `business_unit_id` | `business_unit_id` | Organization, Projects, Work, Learning, Finance |
| `department_id` | `department_id` | Organization, People, Finance |
| `team_id` | `team_id` | Organization, People, Projects |
| `person_id` | `person_id` / `actor_person_id` | People, Assignments, Work, Meetings, Learning, Evaluation |
| `role_id` | `role_id` | People, Assignments |
| `project_id` | `project_id` | Projects, Work, Finance |
| `task_id` | `task_id` | Projects, Work |
| `learning_program_id` | `learning_program_id` | Learning, Evaluation |
| `evaluation_template_id` | `evaluation_template_id` | Evaluation |
| `finance_category_id` | `category_id` | Finance |
| `time_period` | `created_at` / `start_at` / `period_start` | All Modules |

---

## Domain Business Rules & Security Constraints

1. **Read-Only Non-Authoritative Engine**: Analytics operations must never mutate operational source data. Derived analytical metrics cannot be written back to transactional tables as primary state.
2. **Declarative Spec Execution Safety**: Metric specifications must parse strictly into structured SQL parameters. Dynamic raw SQL execution or arbitrary script invocation is strictly prohibited.
3. **Mandatory Tenant Scoping**: All metric definition lookups, query evaluations, snapshot retrievals, and report executions must enforce `organization_id = $1`. Cross-tenant queries return HTTP `404 Not Found`.
4. **Contextual Scope-Bound Authorization**:
   * Viewing metrics (`analytics:view`) is constrained by the caller's organizational scope (`Role + Business Unit + Team + Project`).
   * A Manager for BU-A cannot execute metrics or saved reports that expose BU-B financial data or employee performance reviews without explicit permission.
5. **Standardized Time Boundaries**: All source filters operate on UTC timestamps. Time bucket truncations occur at UTC period boundaries.
6. **Immutable Result Snapshots**: Persisted rows in `analytics_metric_results` represent historical snapshots. Updates to existing snapshots are prohibited; recalculations append new snapshot rows.

---

## Cross-Domain Integration Mapping

Analytics acts as a downstream consumer of all operational domains:

```text
  ┌──────────────────────┐
  │ Organization Engine  ├──────────┐
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │    People Engine     ├──────────┤
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │  Assignment Engine   ├──────────┤
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │Projects/Tasks Engine ├──────────┤
  └──────────────────────┘          │
  ┌──────────────────────┐          ├───► ┌──────────────────────────┐
  │     Work Engine      ├──────────┤     │    Analytics Engine      │
  └──────────────────────┘          │     │  (Metric & Report Query) │
  ┌──────────────────────┐          │     └──────────────────────────┘
  │   Meetings Engine    ├──────────┤
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │   Learning Engine    ├──────────┤
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │  Evaluation Engine   ├──────────┤
  └──────────────────────┘          │
  ┌──────────────────────┐          │
  │    Finance Engine    ├──────────┘
  └──────────────────────┘
```

* **Organization Engine**: Provides organizational structure metadata (`branches`, `business_units`, `departments`, `teams`).
* **People Engine**: Source for headcount, employment types, skill inventory, manager reporting chains.
* **Assignment Engine**: Source for resource allocation, capacity utilization, person-to-project assignments.
* **Projects & Tasks Engine**: Source for project velocity, task completion timelines, status distribution.
* **Work Engine**: Source for hours logged, category distribution, outcome delivery, founder strategy work.
* **Meetings Engine**: Source for meeting volume, decision tracking, operational time spend.
* **Learning Engine**: Source for enrollment growth, milestone completion speed, reviews, competency tracking.
* **Evaluation Engine**: Source for performance score distributions, mentor ratings, evaluation completion.
* **Finance Engine**: Source for revenue, obligation settlement, budget utilization, payment balances.
* **Audit & Events Engine**: Source for system activity timeline; consumes `eventBus` events for metric cache invalidation when configured.

---
*Document frozen for Milestone 11 — Analytics Engine Architecture.*
