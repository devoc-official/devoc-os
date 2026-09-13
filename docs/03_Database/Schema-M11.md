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

## Source Table Index Recommendations (Reconciled Physical Entities)

To support high-throughput live analytical aggregations without full table scans, source transactional tables should maintain composite operational indexes:

* `work_records`: `(organization_id, work_category_id, created_at)`
* `financial_transactions`: `(organization_id, status, transaction_type, transaction_date)`
* `financial_obligations`: `(organization_id, status, due_date)`
* `learning_enrollments`: `(organization_id, status, created_at)`
* `tasks`: `(organization_id, status, created_at)`
* `evaluations`: `(organization_id, status, template_id, created_at)`
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

