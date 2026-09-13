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
            'COUNT', 'SUM', 'AVERAGE', 'RATE',
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

Stores computed metric snapshots for historical trend comparisons and pre-calculated aggregations:

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

-- Metric result snapshot indexes
CREATE INDEX IF NOT EXISTS idx_analytics_results_def ON analytics_metric_results(metric_definition_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_results_org_period ON analytics_metric_results(organization_id, period_type, period_start);

-- Saved report indexes
CREATE INDEX IF NOT EXISTS idx_analytics_reports_org ON analytics_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_creator ON analytics_reports(organization_id, created_by);
```

---

## Source Table Index Recommendations

To support high-throughput live analytical aggregations without full table scans, source transactional tables should maintain composite operational indexes:

* `work_logs`: `(organization_id, work_category_id, created_at)`
* `financial_transactions`: `(organization_id, status, direction, created_at)`
* `financial_obligations`: `(organization_id, state, created_at)`
* `enrollments`: `(organization_id, status, created_at)`
* `tasks`: `(organization_id, status, created_at)`
* `evaluations`: `(organization_id, status, evaluation_type_id, created_at)`

---

## Architectural Criteria for Future Warehouse / OLAP Migration

M11 uses PostgreSQL as the unified operational and analytical relational database. A separate analytical data warehouse (e.g., ClickHouse, Snowflake, DuckDB) is **explicitly deferred** until the following empirical performance thresholds are breached:

1. **Transactional Contention**: Analytical queries cause measurable lock contention or CPU degradation affecting primary CRUD response times (e.g. API p99 latency exceeds 500ms).
2. **Table Volume Threshold**: Source transactional tables (e.g., `work_logs`, `audit_logs`) exceed 10 million rows per tenant, rendering live PostgreSQL aggregation inefficient despite composite indexes.
3. **Complex OLAP Requirements**: Requirements demand high-cardinality multi-dimensional OLAP cube slice-and-dice operations spanning multi-year historical datasets that cannot be served within 2 seconds.

When any of these criteria are breached, a future milestone ADR will specify an out-of-band analytical replica or dedicated OLAP store fed asynchronously by the M10 Transactional Outbox.

---
*Document frozen for Milestone 11 – Analytics Database Schema.*
