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
2. **Reconciled Source Entity Accuracy**: Analytics queries must operate directly against established physical PostgreSQL table names (`work_logs`, `criterion_results`, `learning_enrollments`, `learning_programs`, `financial_obligations`, `financial_transactions`, `financial_parties`, `finance_categories`, `financial_budgets`, `people`, `employments`, `assignments`, `projects`, `tasks`, `meetings`, `audit_logs`).
3. **Declarative Metric Safety & Allowlist Model**: Metric specifications must be structured JSON contracts validated against an explicit Analytics Source Registry (allowed entities, fields, operators, dimensions, joins, aggregations). Direct SQL string concatenation, raw SQL strings, arbitrary table/column references, and runtime script evaluation (`eval()`) are prohibited. All query execution resolves through a controlled parameter-bound query builder.
4. **Multi-Tenancy & Per-Execution Contextual Authorization**: Analytics must enforce `organization_id` isolation and reuse the existing DeVoc OS permission model (`Role + Business Unit + Team + Project`). Setting `isPublic = true` on a saved report shares the report template configuration, NOT data access. Every report execution independently re-evaluates the executing user's authorized scope against every underlying metric and physical source table.
5. **Immutable Snapshot Versioning**: Persisted rows in `analytics_metric_results` are append-only. Historical snapshot rows are never updated in place. Recalculations write a new snapshot row with `calculation_version = previous_version + 1` and a distinct `calculation_run_id`.
6. **Architectural Simplicity**: DeVoc OS is built as a production-grade modular monolith. Introducing external OLAP data warehouses, distributed streaming buses, or separate microservices for V1 analytics adds unnecessary operational complexity.

---

## Considered Options

* **Option 1: Dynamic Unsafe SQL / Scripting Engine**: Allow administrators to write raw SQL snippets or JavaScript functions for metrics. (*Rejected*: Poses catastrophic SQL injection, security, and tenant isolation risks).
* **Option 2: External Data Warehouse & ETL Pipeline (ClickHouse / Snowflake + Kafka)**: Asynchronously stream all operational data to an external OLAP database. (*Rejected*: Premature infrastructure complexity; operational dataset fits well within PostgreSQL).
* **Option 3: Declarative Read-Only Analytics Engine within Modular Monolith**: Declarative JSON metric definitions validated against an Analytics Source Registry, live query evaluation over indexed PostgreSQL tables, immutable versioned snapshots for trend comparisons, strict multi-tenant and per-execution contextual authorization scoping. (*Selected*).

---

## Decision Outcome

**Chosen Option: Option 3 — Declarative Read-Only Analytics Engine within Modular Monolith.**

### Key Architectural Decisions:

1. **Read-Only Downstream Integration**: The Analytics Engine reads directly from M1–M10 physical PostgreSQL tables. It does not duplicate operational entities or own primary business state.
2. **Analytics Source Registry Allowlist**: Metric definitions are validated against an explicit allowlist registry before execution. The query builder constructs parameter-bound SQL queries exclusively for registered entities, fields, operators, joins, and aggregations.
3. **Hybrid Computation & Immutable Versioned Snapshots**:
   * **Live Query Computation**: Primary mode for real-time dashboards and reports. Executed against composite-indexed source tables.
   * **Stored Metric Snapshots**: `analytics_metric_results` table stores periodic append-only snapshots (`day`, `week`, `month`, `quarter`, `year`) with `calculation_version` and `calculation_run_id` for historical trend comparisons. In-place updates to snapshot rows are strictly prohibited.
4. **Per-Execution Contextual Scope Security**: Every report execution independently evaluates `Role + Business Unit + Team + Project` for the executing user against every underlying metric. `isPublic = true` shares template layout metadata only and does not bypass data access controls.
5. **Leveraging M10 Infrastructure**: Metric/report configuration mutations use `AuditService` and publish `eventBus` events for operational auditability.
6. **Triggers for Future Architecture Review**: PostgreSQL remains the unified relational engine. Introducing an analytical warehouse (ClickHouse, Snowflake) is deferred until empirical thresholds (>10M rows per tenant, p99 latency >500ms, multi-year multi-dimensional OLAP cube) trigger a **Future Architecture Review**, rather than acting as automatic migration rules.

---

## Consequences

### Positive
* **Zero Infrastructure Bloat**: Operates entirely within the existing Node.js/PostgreSQL modular monolith.
* **100% Security & Tenancy Guarantee**: Inherits existing DeVoc OS tenant isolation and per-execution contextual scope authorization.
* **Safe Extensibility**: New KPIs (e.g. Placement Rate, Founder Contribution, Revenue) can be added declaratively without modifying core domain code or risking SQL injection.
* **Auditability**: All metric and report configuration changes are auditable via M10 `AuditService`.

### Negative / Trade-offs
* **PostgreSQL Aggregation Load**: Heavy analytical queries on very large datasets will consume database CPU. (Mitigated by composite operational indexes and versioned `analytics_metric_results` snapshots).
* **No Real-Time OLAP Cube**: Complex multi-dimensional slice-and-dice across historical gigabytes is bounded by relational query limits until a future architecture review trigger is reached.

---

## Cross-Domain Integration Architecture (Reconciled Physical Entities)

```text
 ┌────────────────────────────────────────────────────────┐
 │            Operational Monolith (M1–M10)               │
 │ work_logs, criterion_results, learning_enrollments,    │
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
