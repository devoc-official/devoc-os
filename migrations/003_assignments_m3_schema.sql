-- Milestone 3: Assignment Engine Schema

-- 1. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  assignment_type VARCHAR(50) NOT NULL,
  role_context VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  capacity_type VARCHAR(50) NOT NULL DEFAULT 'allocation',
  capacity_value NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  capacity_unit VARCHAR(50) NOT NULL DEFAULT 'percentage',
  authority_type VARCHAR(50) NOT NULL DEFAULT 'org_admin',
  assigned_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_org_id ON assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_person_id ON assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_assignments_target ON assignments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON assignments(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_assignments_org_person_status ON assignments(organization_id, person_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_org_target ON assignments(organization_id, target_type, target_id);

-- 2. Assignment History Table
CREATE TABLE IF NOT EXISTS assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for Assignment History
CREATE INDEX IF NOT EXISTS idx_assignment_history_org ON assignment_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assignment ON assignment_history(assignment_id);
