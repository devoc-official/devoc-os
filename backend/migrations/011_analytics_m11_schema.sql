-- Migration: 011_analytics_m11_schema.sql
-- Description: Milestone 11 schema for Analytics Engine (read-only decision support layer)

-- 1. Table: analytics_metric_definitions
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

-- 2. Table: analytics_metric_results (Immutable append-only snapshots)
CREATE TABLE IF NOT EXISTS analytics_metric_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_definition_id UUID NOT NULL REFERENCES analytics_metric_definitions(id) ON DELETE RESTRICT,
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

-- 3. Table: analytics_reports (Saved report configurations)
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

-- Indexes for performance and isolation
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org ON analytics_metric_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_domain ON analytics_metric_definitions(organization_id, domain_module);

CREATE INDEX IF NOT EXISTS idx_analytics_results_def ON analytics_metric_results(metric_definition_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_results_org_period ON analytics_metric_results(organization_id, period_type, period_start, calculation_version DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_results_run ON analytics_metric_results(calculation_run_id);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_org ON analytics_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_creator ON analytics_reports(organization_id, created_by);
