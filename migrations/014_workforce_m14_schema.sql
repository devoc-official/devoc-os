-- Migration 014: Workforce Onboarding & Lifecycle Engine (M14) Schema

-- 1. Onboarding Master Templates
CREATE TABLE IF NOT EXISTS workforce_onboarding_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workforce_onboarding_templates_code UNIQUE (organization_id, code)
);

-- 2. Onboarding Template Tasks
CREATE TABLE IF NOT EXISTS workforce_onboarding_template_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES workforce_onboarding_templates(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    assigned_role_context VARCHAR(100) NULL,
    due_offset_days INT NOT NULL DEFAULT 7,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Onboarding Template Items / Requirements Definition
CREATE TABLE IF NOT EXISTS workforce_onboarding_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES workforce_onboarding_templates(id) ON DELETE CASCADE,
    template_task_id UUID NULL REFERENCES workforce_onboarding_template_tasks(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('document_reference', 'policy_acknowledgement', 'equipment_receipt', 'access_confirmation', 'compliance_verification', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    sequence_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Onboarding Plans (Instance per M2 Employment)
CREATE TABLE IF NOT EXISTS workforce_onboarding_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    template_id UUID NULL REFERENCES workforce_onboarding_templates(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'initiated', 'in_progress', 'completed', 'cancelled')),
    initiated_at TIMESTAMPTZ NULL,
    target_completion_date DATE NULL,
    actual_completion_date DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workforce_onboarding_plans_employment UNIQUE (organization_id, employment_id)
);

-- 5. Onboarding Tasks (Concrete instances)
CREATE TABLE IF NOT EXISTS workforce_onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES workforce_onboarding_plans(id) ON DELETE CASCADE,
    template_task_id UUID NULL REFERENCES workforce_onboarding_template_tasks(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    assigned_role_context VARCHAR(100) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    due_date DATE NULL,
    completed_at TIMESTAMPTZ NULL,
    meeting_id UUID NULL REFERENCES meetings(id) ON DELETE SET NULL,
    learning_program_id UUID NULL REFERENCES learning_programs(id) ON DELETE SET NULL,
    evaluation_id UUID NULL REFERENCES evaluations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Onboarding Requirements / Items (Concrete instances)
CREATE TABLE IF NOT EXISTS workforce_onboarding_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES workforce_onboarding_plans(id) ON DELETE CASCADE,
    task_id UUID NULL REFERENCES workforce_onboarding_tasks(id) ON DELETE SET NULL,
    template_item_id UUID NULL REFERENCES workforce_onboarding_template_items(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('document_reference', 'policy_acknowledgement', 'equipment_receipt', 'access_confirmation', 'compliance_verification', 'other')),
    title VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'rejected', 'skipped')),
    item_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_by_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Workforce Transfer Workflows
CREATE TABLE IF NOT EXISTS workforce_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    source_business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
    target_business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
    source_department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
    target_department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
    source_team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
    target_team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
    source_manager_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    target_manager_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending_review', 'pending_approval', 'approved', 'executed', 'rejected', 'cancelled')),
    reason TEXT NULL,
    effective_date DATE NOT NULL,
    submitted_at TIMESTAMPTZ NULL,
    reviewed_at TIMESTAMPTZ NULL,
    approved_at TIMESTAMPTZ NULL,
    approved_by_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    executed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Workforce Promotion Workflows
CREATE TABLE IF NOT EXISTS workforce_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    source_job_title VARCHAR(150) NOT NULL,
    target_job_title VARCHAR(150) NOT NULL,
    source_person_role_id UUID NULL REFERENCES person_roles(id) ON DELETE SET NULL,
    target_person_role_id UUID NULL REFERENCES roles(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending_review', 'pending_approval', 'approved', 'executed', 'rejected', 'cancelled')),
    reason TEXT NULL,
    effective_date DATE NOT NULL,
    submitted_at TIMESTAMPTZ NULL,
    reviewed_at TIMESTAMPTZ NULL,
    approved_at TIMESTAMPTZ NULL,
    approved_by_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    executed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Workforce Offboarding Workflows
CREATE TABLE IF NOT EXISTS workforce_offboardings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    exit_reason VARCHAR(50) NOT NULL CHECK (exit_reason IN ('resignation', 'termination', 'contract_end', 'retirement', 'other')),
    status VARCHAR(30) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'clearance_in_progress', 'cleared', 'completed', 'cancelled')),
    exit_date DATE NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workforce_offboardings_employment UNIQUE (organization_id, employment_id)
);

-- 10. Workforce Offboarding Clearances
CREATE TABLE IF NOT EXISTS workforce_offboarding_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    offboarding_id UUID NOT NULL REFERENCES workforce_offboardings(id) ON DELETE CASCADE,
    clearance_type VARCHAR(50) NOT NULL CHECK (clearance_type IN ('it_access', 'equipment_return', 'financial_settlement', 'knowledge_handover', 'other')),
    department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
    verifier_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    financial_obligation_id UUID NULL REFERENCES financial_obligations(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'waived')),
    notes TEXT NULL,
    cleared_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workforce_onboarding_templates_org ON workforce_onboarding_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_workforce_onboarding_template_tasks_tpl ON workforce_onboarding_template_tasks(organization_id, template_id);
CREATE INDEX IF NOT EXISTS idx_workforce_onboarding_template_items_tpl ON workforce_onboarding_template_items(organization_id, template_id);
CREATE INDEX IF NOT EXISTS idx_workforce_onboarding_plans_org_emp ON workforce_onboarding_plans(organization_id, employment_id);
CREATE INDEX IF NOT EXISTS idx_workforce_onboarding_plans_person ON workforce_onboarding_plans(organization_id, person_id);
CREATE INDEX IF NOT EXISTS idx_workforce_onboarding_tasks_plan ON workforce_onboarding_tasks(organization_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_workforce_onboarding_items_plan ON workforce_onboarding_items(organization_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_workforce_transfers_org_emp ON workforce_transfers(organization_id, employment_id);
CREATE INDEX IF NOT EXISTS idx_workforce_promotions_org_emp ON workforce_promotions(organization_id, employment_id);
CREATE INDEX IF NOT EXISTS idx_workforce_offboardings_org_emp ON workforce_offboardings(organization_id, employment_id);
CREATE INDEX IF NOT EXISTS idx_workforce_offboarding_clearances_offboard ON workforce_offboarding_clearances(organization_id, offboarding_id);
CREATE INDEX IF NOT EXISTS idx_workforce_offboarding_clearances_fin_obl ON workforce_offboarding_clearances(organization_id, financial_obligation_id);
