# Milestone 11 — Analytics Engine Implementation Specification

## Status

**Architecture frozen — implementation pending.**

## Objective

Milestone 11 establishes a read-only, extensible, multi-tenant **Analytics Engine** for DeVoc OS. It provides decision-support insights, performance metrics, key performance indicators (KPIs), and saved reports across all established operational domains (Organization, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit/Events) without duplicating operational entities or altering domain state.

M11 is a read-oriented analytical milestone. It does NOT introduce external data warehouses (e.g., ClickHouse, Snowflake), message brokers (e.g., Kafka, RabbitMQ), BI platforms, microservices, AI/ML predictions, or dynamic SQL execution. It operates cleanly as a modular-monolith engine within PostgreSQL, using declarative metric specifications and contextual authorization.

---

## Core Architectural Principles

```text
               ┌─────────────────────────────────────────────────────────┐
               │    Operational Source of Truth (M1–M10 PostgreSQL)     │
               │  people, assignments, projects, work, learning, finance │
               └────────────────────────────┬────────────────────────────┘
                                            │
                                            │ Read-Only Queries (Tenant Scoped)
                                            ▼
               ┌─────────────────────────────────────────────────────────┐
               │              Analytics Computation Engine               │
               │        (Declarative Spec Evaluator & Aggregator)         │
               └──────────────┬───────────────────────────┬──────────────┘
                              │                           │
              Live Aggregation│                           │ Pre-computed Snapshot
                              ▼                           ▼
               ┌─────────────────────────────┐  ┌─────────────────────────┐
               │    Live Metric Result       │  │ analytics_metric_results│
               │  (Calculated On-Demand)     │  │   (Historical Trend)   │
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
2. **Declarative Metric Specifications**: Metrics are defined via safe JSON calculation rules (`COUNT`, `SUM`, `AVERAGE`, `RATE`, `PERCENTAGE`, `WEIGHTED_AGGREGATION`, `TREND`). Unsafe string concatenation, dynamic raw SQL execution, and runtime code evaluation (`eval()`) are strictly prohibited.
3. **Strict Multi-Tenant Scoping**: Every metric definition, metric result, snapshot, and saved report is bound to an `organization_id`. Cross-tenant queries return HTTP `404 Not Found`.
4. **Contextual Scope-Bound Security**: Analytics access reuses the established DeVoc OS authorization model: `Role + Business Unit + Team + Project`. Users can only query metrics spanning domain resources to which they have authorized access.
5. **Hybrid Computation Strategy**: Live query evaluation on indexed PostgreSQL tables is the primary execution path. Pre-computed snapshots (`analytics_metric_results`) are used exclusively for historical trend comparison and period-over-period snapshotting.
6. **Auditability & Domain Event Consumption**: Changes to metric definitions and saved report configurations emit standard M10 domain events and produce immutable audit entries via `AuditService`. Analytics reads operational data but does not replace domain event logging.

---

## Domain Coverage & Source Mapping

The Analytics Engine maps read-only queries across all operational engines:

| Analytics Domain | Source Domain Entities | Key Analytical Scope |
|------------------|------------------------|----------------------|
| **People Analytics** | `people`, `user_identities`, `employments`, `skills` | Headcount, employment categories, skill distribution, manager ratios |
| **Work Analytics** | `work_logs`, `work_categories`, `work_outcomes`, `work_evidence` | Hours logged, work category breakdown, outcome delivery rates, founder strategy hours |
| **Project Analytics** | `projects`, `tasks`, `task_dependencies`, `project_owners` | Project completion velocity, task lead time, open vs closed tasks, milestone adherence |
| **Learning Analytics** | `learning_programs`, `enrollments`, `learning_milestones`, `competencies`, `learning_reviews` | Enrollment rates, milestone completion speed, review approval rates, competency acquisition |
| **Evaluation Analytics** | `evaluations`, `evaluation_templates`, `evaluation_criterion_results` | Qualitative score distributions, evaluation completion rates, mentor vs student ratings |
| **Finance Analytics** | `financial_obligations`, `financial_transactions`, `financial_allocations`, `financial_budgets` | Revenue, collection rate, budget utilization, outstanding fee balances, refund rates |
| **Organization Analytics** | `organizations`, `branches`, `business_units`, `departments`, `teams` | Business unit capacity allocation, department headcount, cross-BU project participation |

---

## KPI Framework Specifications

KPIs are represented as declarative `analytics_metric_definitions` entries. The system natively supports DeVoc core KPIs without hard-coded domain models:

### 1. Placement Rate (Academy KPI)
* **Code**: `KPI_PLACEMENT_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Graduated Students Placed / Count of Completed Enrollments) * 100`
* **Source Tables**: `enrollments`, `employments`
* **Supported Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 2. Internship Rate (Academy KPI)
* **Code**: `KPI_INTERNSHIP_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Active Students Assigned to Internships / Count of Active Enrollments) * 100`
* **Source Tables**: `enrollments`, `assignments`
* **Supported Dimensions**: `organization_id`, `learning_program_id`, `business_unit_id`, `time_period`

### 3. Student Satisfaction (Academy KPI)
* **Code**: `KPI_STUDENT_SATISFACTION`
* **Domain**: `evaluation`
* **Formula Spec**: `Average rating score across completed Student/Mentorship Evaluations`
* **Source Tables**: `evaluations`, `evaluation_criterion_results`
* **Supported Dimensions**: `organization_id`, `learning_program_id`, `person_id` (mentor), `time_period`

### 4. Completion Rate (Academy KPI)
* **Code**: `KPI_COMPLETION_RATE`
* **Domain**: `learning`
* **Formula Spec**: `(Count of Completed Enrollments / Count of Total Closed Enrollments) * 100`
* **Source Tables**: `enrollments`
* **Supported Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 5. Alumni Success (Academy KPI)
* **Code**: `KPI_ALUMNI_SUCCESS`
* **Domain**: `people`
* **Formula Spec**: `Count of Active Employment Assignments for Alumni / Total Alumni Count`
* **Source Tables**: `people`, `employments`, `enrollments`
* **Supported Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 6. Student Growth (Academy KPI)
* **Code**: `KPI_STUDENT_GROWTH`
* **Domain**: `learning`
* **Formula Spec**: `((Current Period Enrollments - Previous Period Enrollments) / Previous Period Enrollments) * 100`
* **Source Tables**: `enrollments`
* **Supported Dimensions**: `organization_id`, `learning_program_id`, `time_period`

### 7. Revenue (Finance KPI)
* **Code**: `KPI_REVENUE`
* **Domain**: `finance`
* **Formula Spec**: `Sum of Posted Financial Transactions where Direction = 'INCOMING'`
* **Source Tables**: `financial_transactions`
* **Supported Dimensions**: `organization_id`, `business_unit_id`, `department_id`, `finance_category_id`, `time_period`

### 8. Founder Contribution (Work KPI)
* **Code**: `KPI_FOUNDER_CONTRIBUTION`
* **Domain**: `work`
* **Formula Spec**: `Sum of Work Hours logged by Founders categorized as Strategy/Vision/Partnerships`
* **Source Tables**: `work_logs`, `people`, `employments`
* **Supported Dimensions**: `organization_id`, `business_unit_id`, `work_category_id`, `time_period`

---

## Time Standardization & Aggregation Windows

1. **Storage Standardization**: All timestamp filtering and metric calculation boundaries operate in UTC (`TIMESTAMPTZ`).
2. **Aggregation Intervals**:
   * `DAY`: Truncated to `YYYY-MM-DD 00:00:00Z`.
   * `WEEK`: Truncated to Monday `00:00:00Z`.
   * `MONTH`: Truncated to first day of month `00:00:00Z`.
   * `QUARTER`: Truncated to start of Q1/Q2/Q3/Q4 `00:00:00Z`.
   * `YEAR`: Truncated to `YYYY-01-01 00:00:00Z`.
   * `CUSTOM`: Bounded by exact `start_date` and `end_date` inputs.
3. **Timezone Parameters**: API requests may supply a `timezone` offset parameter (e.g. `Asia/Kolkata` or `+05:30`) used strictly for formatting bucket labels in JSON responses.

---

## Saved Reports Specification

A Saved Report (`analytics_reports`) captures reusable query configurations:

```json
{
  "name": "Q3 Academy Placement & Revenue Performance",
  "description": "Cross-domain evaluation of placement rates and incoming course fees for Q3.",
  "metricIds": ["metric-placement-rate-id", "metric-revenue-id"],
  "dimensions": ["business_unit_id", "learning_program_id"],
  "filters": {
    "business_unit_id": "bu-academy-uuid",
    "status": "active"
  },
  "timeWindow": {
    "periodType": "quarter",
    "startDate": "2026-07-01T00:00:00Z",
    "endDate": "2026-09-30T23:59:59Z"
  },
  "groupBy": ["learning_program_id"],
  "sortBy": [{ "field": "numericValue", "direction": "DESC" }],
  "isPublic": false
}
```

---

## Implementation Sequence (For Future Milestone Execution)

When implementation is unlocked in a future milestone, execution will proceed in the following order:

1. Migration `011_analytics_m11_schema.sql` (Metric definitions, metric results snapshot table, saved reports table, indexes).
2. Analytics Domain Model & Expression Evaluator (`src/modules/analytics/domain`).
3. Core Metric Calculation Services (`src/modules/analytics/application`).
4. Saved Reports Service & Query Engine (`src/modules/analytics/application/report.service.ts`).
5. REST Controller & Router (`/api/v1/analytics`).
6. Unit, API Integration & Multi-Tenant Security Tests (`tests/api/analytics-api.test.ts`).

---
*Document frozen for Milestone 11 — Analytics Engine Architecture.*
