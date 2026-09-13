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

The architectural challenge is providing flexible, multi-tenant analytics without mutating operational state, violating tenant isolation, creating security loopholes, or introducing heavy external data warehouses (e.g., ClickHouse, Snowflake, Kafka, BI microservices) prematurely.

---

## Decision Drivers

1. **Operational Domain Integrity**: Domain engines M1–M10 are the sole authoritative transactional source of truth. Analytics must be strictly read-oriented.
2. **Declarative Spec Safety**: Metric definitions must be configurable, structured JSON specifications. SQL injection risks and unvetted code execution (`eval()`, string-concatenated SQL) are unacceptable.
3. **Multi-Tenancy & Contextual Authorization**: Analytics must enforce `organization_id` isolation and reuse the existing DeVoc OS permission model (`Role + Business Unit + Team + Project`). Users must not see analytics outside their authorized scope.
4. **Architectural Simplicity**: DeVoc OS is built as a production-grade modular monolith. Introducing external OLAP data warehouses, distributed streaming buses, or separate microservices for V1 analytics adds unnecessary operational complexity.

---

## Considered Options

* **Option 1: Dynamic Unsafe SQL / Scripting Engine**: Allow administrators to write raw SQL snippets or JavaScript functions for metrics. (*Rejected*: Poses catastrophic SQL injection, security, and tenant isolation risks).
* **Option 2: External Data Warehouse & ETL Pipeline (ClickHouse / Snowflake + Kafka)**: Asynchronously stream all operational data to an external OLAP database. (*Rejected*: Premature infrastructure complexity; operational dataset fits well within PostgreSQL).
* **Option 3: Declarative Read-Only Analytics Engine within Modular Monolith**: Declarative JSON metric definitions, live query evaluation over indexed PostgreSQL tables, pre-computed snapshots for trend comparisons, strict multi-tenant and contextual authorization scoping. (*Selected*).

---

## Decision Outcome

**Chosen Option: Option 3 — Declarative Read-Only Analytics Engine within Modular Monolith.**

### Key Architectural Decisions:

1. **Read-Only Downstream Integration**: The Analytics Engine reads directly from M1–M10 PostgreSQL tables. It does not duplicate operational entities or own primary business state.
2. **Declarative Metric Specifications**: Metrics are stored in `analytics_metric_definitions` as structured JSON contracts (`COUNT`, `SUM`, `AVERAGE`, `RATE`, `PERCENTAGE`, `WEIGHTED_AGGREGATION`, `TREND`). The computation engine converts specs safely into parameter-bound SQL queries.
3. **Hybrid Computation Strategy**:
   * **Live Query Computation**: Primary mode for real-time dashboards and reports. Executed against composite-indexed source tables.
   * **Stored Metric Snapshots**: `analytics_metric_results` table stores periodic snapshots (`day`, `week`, `month`, `quarter`, `year`) for historical trend comparisons without re-aggregating massive raw datasets.
4. **Multi-Tenancy & Scope Security**: Every metric, result, and report mandates `organization_id`. Source queries apply tenant boundaries and user contextual scope (`Role + BU + Team + Project`).
5. **Leveraging M10 Infrastructure**: Metric/report configuration mutations use `AuditService` and publish `eventBus` events for operational auditability.
6. **Data Warehouse Deferral**: PostgreSQL remains the unified relational engine. An external data warehouse (e.g. ClickHouse) is deferred until source transactional tables exceed 10 million rows or live queries cause measurable CPU contention on transactional workloads.

---

## Consequences

### Positive
* **Zero Infrastructure Bloat**: Operates entirely within the existing Node.js/PostgreSQL modular monolith.
* **100% Security & Tenancy Guarantee**: Inherits existing DeVoc OS tenant isolation and contextual scope authorization.
* **Safe Extensibility**: New KPIs (e.g. Placement Rate, Founder Contribution, Revenue) can be added declaratively without modifying core domain code.
* **Auditability**: All metric and report configuration changes are auditable via M10 `AuditService`.

### Negative / Trade-offs
* **PostgreSQL Aggregation Load**: Heavy analytical queries on very large datasets will consume database CPU. (Mitigated by composite operational indexes and pre-computed `analytics_metric_results` snapshots).
* **No Real-Time OLAP Cube**: Complex multi-dimensional slice-and-dice across historical gigabytes is bounded by relational query limits until a future OLAP migration threshold is reached.

---

## Cross-Domain Integration Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │            Operational Monolith (M1–M10)               │
 │  Organization, People, Assignments, Projects, Work,   │
 │  Meetings, Learning, Evaluation, Finance, Audit        │
 └───────────────────────────┬────────────────────────────┘
                             │
                             │ Read-Only SQL (Parameter Bound)
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
