-- Migration: 013_recruitment_m13_schema.sql
-- Description: Milestone 13 Recruitment & Talent Acquisition Schema

-- 1. Table: recruitment_positions
CREATE TABLE IF NOT EXISTS recruitment_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
    department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
    team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
    target_role_id UUID NULL REFERENCES roles(id) ON DELETE SET NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'full_time',
    openings_count INT NOT NULL DEFAULT 1 CHECK (openings_count >= 1),
    hired_count INT NOT NULL DEFAULT 0 CHECK (hired_count >= 0 AND hired_count <= openings_count),
    hiring_manager_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    recruiter_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    description TEXT NULL,
    requirements TEXT NULL,
    min_salary NUMERIC(12, 2) NULL CHECK (min_salary IS NULL OR min_salary >= 0),
    max_salary NUMERIC(12, 2) NULL CHECK (max_salary IS NULL OR max_salary >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    target_start_date DATE NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    opened_at TIMESTAMPTZ NULL,
    closed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_recruitment_positions_org_code UNIQUE (organization_id, code),
    CONSTRAINT chk_recruitment_positions_salary_range CHECK (
        min_salary IS NULL OR max_salary IS NULL OR min_salary <= max_salary
    ),
    CONSTRAINT chk_recruitment_positions_status CHECK (
        status IN ('draft', 'open', 'paused', 'closed', 'archived')
    ),
    CONSTRAINT chk_recruitment_positions_employment_type CHECK (
        employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'mentor', 'freelance')
    )
);

CREATE INDEX IF NOT EXISTS idx_recruitment_positions_org_status 
    ON recruitment_positions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_positions_bu 
    ON recruitment_positions(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_positions_target_role 
    ON recruitment_positions(target_role_id);

-- 2. Table: recruitment_candidates
CREATE TABLE IF NOT EXISTS recruitment_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'other',
    source_details TEXT NULL,
    resume_url TEXT NULL,
    portfolio_url TEXT NULL,
    skills TEXT[] NOT NULL DEFAULT '{}',
    profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    internal_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    converted_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_candidates_status CHECK (
        status IN ('active', 'hired', 'archived')
    ),
    CONSTRAINT chk_recruitment_candidates_source CHECK (
        source IN ('career_page', 'job_board', 'referral', 'campus', 'agency', 'internal', 'direct', 'other')
    )
);

CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_org_email 
    ON recruitment_candidates(organization_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_org_status 
    ON recruitment_candidates(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_internal_person 
    ON recruitment_candidates(internal_person_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_converted_person 
    ON recruitment_candidates(converted_person_id);

-- 3. Table: recruitment_pipeline_stages
CREATE TABLE IF NOT EXISTS recruitment_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    stage_type VARCHAR(50) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_recruitment_pipeline_stages_org_code UNIQUE (organization_id, stage_code),
    CONSTRAINT chk_recruitment_pipeline_stage_type CHECK (
        stage_type IN ('applied', 'screening', 'assessment', 'interview', 'trial', 'decision', 'offer', 'hired')
    )
);

CREATE INDEX IF NOT EXISTS idx_recruitment_pipeline_stages_org_order 
    ON recruitment_pipeline_stages(organization_id, order_index ASC);

-- 4. Table: recruitment_applications
CREATE TABLE IF NOT EXISTS recruitment_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES recruitment_positions(id) ON DELETE RESTRICT,
    current_stage_id UUID NOT NULL REFERENCES recruitment_pipeline_stages(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'applied',
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rejection_reason TEXT NULL,
    rejected_at TIMESTAMPTZ NULL,
    withdrawn_reason TEXT NULL,
    withdrawn_at TIMESTAMPTZ NULL,
    hired_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_applications_status CHECK (
        status IN ('applied', 'screening', 'assessment', 'interview', 'trial', 'decision', 'offered', 'hired', 'rejected', 'withdrawn')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recruitment_applications_active_candidate_pos 
    ON recruitment_applications(candidate_id, position_id)
    WHERE status NOT IN ('rejected', 'withdrawn', 'hired');

CREATE INDEX IF NOT EXISTS idx_recruitment_applications_org_status 
    ON recruitment_applications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_pos_stage 
    ON recruitment_applications(position_id, current_stage_id);

-- 5. Table: recruitment_application_stages
CREATE TABLE IF NOT EXISTS recruitment_application_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES recruitment_pipeline_stages(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    evaluator_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    evaluation_id UUID NULL,
    meeting_id UUID NULL,
    notes TEXT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_app_stage_status CHECK (
        status IN ('scheduled', 'in_progress', 'passed', 'failed', 'skipped')
    )
);

CREATE INDEX IF NOT EXISTS idx_recruitment_app_stages_app 
    ON recruitment_application_stages(application_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_app_stages_eval 
    ON recruitment_application_stages(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_app_stages_meeting 
    ON recruitment_application_stages(meeting_id);

-- 6. Table: recruitment_trials
CREATE TABLE IF NOT EXISTS recruitment_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    objectives TEXT NULL,
    deliverables_summary TEXT NULL,
    outcome_notes TEXT NULL,
    mentor_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    assignment_id UUID NULL,
    evaluation_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_trials_dates CHECK (start_date <= end_date),
    CONSTRAINT chk_recruitment_trials_status CHECK (
        status IN ('scheduled', 'active', 'completed', 'terminated')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recruitment_trials_active_app 
    ON recruitment_trials(application_id) 
    WHERE status IN ('scheduled', 'active');

CREATE INDEX IF NOT EXISTS idx_recruitment_trials_org_status 
    ON recruitment_trials(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_trials_assignment 
    ON recruitment_trials(assignment_id);

-- 7. Table: recruitment_offers
CREATE TABLE IF NOT EXISTS recruitment_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES recruitment_positions(id) ON DELETE RESTRICT,
    proposed_role_id UUID NULL REFERENCES roles(id) ON DELETE SET NULL,
    employment_type VARCHAR(50) NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL CHECK (base_salary >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    compensation_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
    proposed_start_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    issued_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    responded_at TIMESTAMPTZ NULL,
    response_notes TEXT NULL,
    terms_conditions TEXT NULL,
    financial_obligation_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_offers_status CHECK (
        status IN ('draft', 'issued', 'accepted', 'rejected', 'rescinded', 'expired')
    ),
    CONSTRAINT chk_recruitment_offers_freq CHECK (
        compensation_frequency IN ('hourly', 'monthly', 'annual', 'milestone')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recruitment_offers_active_app 
    ON recruitment_offers(application_id) 
    WHERE status IN ('draft', 'issued');

CREATE INDEX IF NOT EXISTS idx_recruitment_offers_org_status 
    ON recruitment_offers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_offers_obligation 
    ON recruitment_offers(financial_obligation_id);
