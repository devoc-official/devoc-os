-- Migration: 002_people_m2_schema.sql
-- Description: Milestone 2 schema foundation for People Engine, Roles, Employments, and Skills

-- 1. People (Physical Human Identity)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_person_email UNIQUE (organization_id, email)
);

-- 2. Roles (Configurable Organizational Roles)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_role_code UNIQUE (organization_id, code)
);

-- 3. Person Roles (Contextual Role Assignments)
CREATE TABLE IF NOT EXISTS person_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
  department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
  team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Employments (Employment Contracts & Manager Hierarchy)
CREATE TABLE IF NOT EXISTS employments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  employment_type VARCHAR(50) NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('probation', 'active', 'suspended', 'terminated', 'resigned')),
  job_title VARCHAR(255) NOT NULL,
  department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
  business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
  branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
  manager_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Employment History (Append-only Audit Log of Employment Status/Title Changes)
CREATE TABLE IF NOT EXISTS employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  change_reason TEXT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Skills (Configurable Skill Taxonomy)
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  category VARCHAR(50) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_skill_code UNIQUE (organization_id, code)
);

-- 7. Person Skills (Person Skill Proficiency Assignments)
CREATE TABLE IF NOT EXISTS person_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(50) NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_person_skill UNIQUE (person_id, skill_id)
);

-- Indexes for optimal lookup performance & tenant isolation
CREATE INDEX IF NOT EXISTS idx_people_org ON people(organization_id);
CREATE INDEX IF NOT EXISTS idx_people_user ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_person ON person_roles(person_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_org ON person_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_employments_person ON employments(person_id);
CREATE INDEX IF NOT EXISTS idx_employments_manager ON employments(manager_id);
CREATE INDEX IF NOT EXISTS idx_employments_org ON employments(organization_id);
CREATE INDEX IF NOT EXISTS idx_emphist_emp ON employment_history(employment_id);
CREATE INDEX IF NOT EXISTS idx_skills_org ON skills(organization_id);
CREATE INDEX IF NOT EXISTS idx_person_skills_person ON person_skills(person_id);
