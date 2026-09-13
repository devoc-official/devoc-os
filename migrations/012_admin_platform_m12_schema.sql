-- Migration: 012_admin_platform_m12_schema.sql
-- Description: Milestone 12 Administrative & Platform Management Schema

-- 1. Platform Settings (Global singleton / key-value configuration)
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NULL,
    updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- 2. Organization Settings (Tenant-specific operational defaults, 1:1 with organizations)
CREATE TABLE IF NOT EXISTS organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(20) NOT NULL DEFAULT 'en-US',
    date_format VARCHAR(30) NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(20) NOT NULL DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    default_branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
    default_business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_settings_org ON organization_settings(organization_id);

-- 3. Feature Configurations (Governed feature toggles with platform defaults & tenant overrides)
CREATE TABLE IF NOT EXISTS feature_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NULL,
    updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index for platform defaults (organization_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_config_platform_default
    ON feature_configurations (feature_key)
    WHERE organization_id IS NULL;

-- Unique composite index for organization-level overrides
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_config_org_override
    ON feature_configurations (organization_id, feature_key)
    WHERE organization_id IS NOT NULL;

-- Fast operational lookup index
CREATE INDEX IF NOT EXISTS idx_feature_config_lookup
    ON feature_configurations (feature_key, organization_id);
