-- Migration 007: Milestone 7 — Learning Engine Schema
-- Scope: Learning Programs, Program Milestones, Activity Definitions, Enrollments, Enrollment Milestones, Learning Activities, Activity References, Learning Reviews, Review Changes, Assessments, Assessment Attempts.

CREATE TABLE IF NOT EXISTS learning_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_learning_programs_org_code UNIQUE (organization_id, code)
);

CREATE INDEX idx_learning_programs_org ON learning_programs(organization_id);
CREATE INDEX idx_learning_programs_status ON learning_programs(organization_id, status);

CREATE TABLE IF NOT EXISTS learning_program_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    learning_program_id UUID NOT NULL REFERENCES learning_programs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence INTEGER NOT NULL DEFAULT 1,
    required BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_program_milestones_program ON learning_program_milestones(learning_program_id);
CREATE INDEX idx_program_milestones_org ON learning_program_milestones(organization_id);

CREATE TABLE IF NOT EXISTS learning_activity_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES learning_program_milestones(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100) NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 1,
    required BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_defs_milestone ON learning_activity_definitions(milestone_id);
CREATE INDEX idx_activity_defs_org ON learning_activity_definitions(organization_id);

CREATE TABLE IF NOT EXISTS learning_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    learning_program_id UUID NOT NULL REFERENCES learning_programs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'withdrawn', 'cancelled')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    expected_end_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_enrollments_org ON learning_enrollments(organization_id);
CREATE INDEX idx_learning_enrollments_person ON learning_enrollments(organization_id, person_id);
CREATE INDEX idx_learning_enrollments_program ON learning_enrollments(organization_id, learning_program_id);
CREATE INDEX idx_learning_enrollments_status ON learning_enrollments(organization_id, status);

CREATE TABLE IF NOT EXISTS enrollment_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES learning_enrollments(id) ON DELETE CASCADE,
    source_milestone_id UUID REFERENCES learning_program_milestones(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrollment_milestones_enrollment ON enrollment_milestones(enrollment_id);
CREATE INDEX idx_enrollment_milestones_org ON enrollment_milestones(organization_id);

CREATE TABLE IF NOT EXISTS learning_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    enrollment_milestone_id UUID NOT NULL REFERENCES enrollment_milestones(id) ON DELETE CASCADE,
    source_activity_id UUID REFERENCES learning_activity_definitions(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100) NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_activities_milestone ON learning_activities(enrollment_milestone_id);
CREATE INDEX idx_learning_activities_org ON learning_activities(organization_id);

CREATE TABLE IF NOT EXISTS learning_activity_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    learning_activity_id UUID NOT NULL REFERENCES learning_activities(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('project', 'task')),
    reference_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_refs_activity ON learning_activity_references(learning_activity_id);
CREATE INDEX idx_activity_refs_target ON learning_activity_references(organization_id, reference_type, reference_id);

CREATE TABLE IF NOT EXISTS learning_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES learning_enrollments(id) ON DELETE CASCADE,
    reviewer_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    review_type VARCHAR(100) NOT NULL DEFAULT 'weekly',
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    summary TEXT NOT NULL,
    feedback TEXT,
    progress_value NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_reviews_enrollment ON learning_reviews(enrollment_id);
CREATE INDEX idx_learning_reviews_org ON learning_reviews(organization_id);
CREATE INDEX idx_learning_reviews_reviewer ON learning_reviews(reviewer_person_id);

CREATE TABLE IF NOT EXISTS learning_review_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES learning_reviews(id) ON DELETE CASCADE,
    change_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_changes_review ON learning_review_changes(review_id);
CREATE INDEX idx_review_changes_org ON learning_review_changes(organization_id);

CREATE TABLE IF NOT EXISTS learning_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES learning_enrollments(id) ON DELETE CASCADE,
    learning_activity_id UUID REFERENCES learning_activities(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_type VARCHAR(100) NOT NULL DEFAULT 'practical',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    max_score NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_assessments_enrollment ON learning_assessments(enrollment_id);
CREATE INDEX idx_learning_assessments_activity ON learning_assessments(learning_activity_id);
CREATE INDEX idx_learning_assessments_org ON learning_assessments(organization_id);

CREATE TABLE IF NOT EXISTS learning_assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES learning_assessments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'passed', 'failed')),
    score NUMERIC,
    qualitative_result TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    evidence_metadata JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_person_attempt UNIQUE (assessment_id, person_id, attempt_number)
);

CREATE INDEX idx_assessment_attempts_assessment ON learning_assessment_attempts(assessment_id);
CREATE INDEX idx_assessment_attempts_person ON learning_assessment_attempts(organization_id, person_id);
CREATE INDEX idx_assessment_attempts_org ON learning_assessment_attempts(organization_id);
