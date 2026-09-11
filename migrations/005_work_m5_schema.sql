-- Milestone 5: Work Engine Schema

-- 1. Work Categories Table
CREATE TABLE IF NOT EXISTS work_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT work_categories_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_work_categories_org ON work_categories(organization_id);

-- 2. Work Records Table
CREATE TABLE IF NOT EXISTS work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  target_type VARCHAR(50),
  target_id UUID,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES work_categories(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL,
  created_by_person_id UUID NOT NULL REFERENCES people(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT work_records_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT work_records_timestamps_check CHECK (
    ended_at IS NULL OR started_at IS NULL OR ended_at > started_at
  ),
  CONSTRAINT work_records_target_pair_check CHECK (
    (target_type IS NULL AND target_id IS NULL) OR (target_type IS NOT NULL AND target_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_work_records_org_person ON work_records(organization_id, person_id, started_at);
CREATE INDEX IF NOT EXISTS idx_work_records_org_status ON work_records(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_work_records_org_target ON work_records(organization_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_work_records_org_assignment ON work_records(organization_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_work_records_org_category ON work_records(organization_id, category_id);

-- 3. Work Evidence Table
CREATE TABLE IF NOT EXISTS work_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_record_id UUID NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  reference_uri TEXT,
  provider VARCHAR(100),
  external_id VARCHAR(255),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_evidence_work ON work_evidence(organization_id, work_record_id);

-- 4. Outcomes Table
CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outcome_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  measurable_value NUMERIC,
  measurable_unit VARCHAR(50),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_person_id UUID NOT NULL REFERENCES people(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_org ON outcomes(organization_id);

-- 5. Work Outcomes Table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS work_outcomes (
  work_record_id UUID NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES outcomes(id) ON DELETE CASCADE,
  contribution_type VARCHAR(50),
  contribution_value NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (work_record_id, outcome_id)
);

CREATE INDEX IF NOT EXISTS idx_work_outcomes_outcome ON work_outcomes(outcome_id);
