-- Milestone 4: Projects & Tasks Engine Schema

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(50) NOT NULL,
  description TEXT,
  project_type VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'idea',
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  start_at TIMESTAMPTZ,
  target_end_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  created_by_person_id UUID NOT NULL REFERENCES people(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_key_org_unique UNIQUE (organization_id, key),
  CONSTRAINT projects_target_end_check CHECK (
    target_end_at IS NULL OR start_at IS NULL OR target_end_at > start_at
  )
);

CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_org_type ON projects(organization_id, project_type);
CREATE INDEX IF NOT EXISTS idx_projects_org_priority ON projects(organization_id, priority);

-- 2. Project Owners Table
CREATE TABLE IF NOT EXISTS project_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  ownership_type VARCHAR(50) NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_owners_org ON project_owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_owners_project ON project_owners(project_id);
CREATE INDEX IF NOT EXISTS idx_project_owners_person ON project_owners(person_id);

-- 3. Project Business Units Table
CREATE TABLE IF NOT EXISTS project_business_units (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, business_unit_id)
);

CREATE INDEX IF NOT EXISTS idx_project_bu_org ON project_business_units(organization_id);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_key VARCHAR(80) NOT NULL,
  task_type VARCHAR(30) NOT NULL DEFAULT 'task',
  status VARCHAR(30) NOT NULL DEFAULT 'backlog',
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  start_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_person_id UUID NOT NULL REFERENCES people(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_key_project_unique UNIQUE (project_id, task_key),
  CONSTRAINT tasks_due_check CHECK (
    due_at IS NULL OR start_at IS NULL OR due_at >= start_at
  )
);

CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_parent ON tasks(project_id, parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);

-- 5. Task Dependencies Table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_dependency_not_self CHECK (task_id <> depends_on_task_id),
  CONSTRAINT task_dependency_unique UNIQUE (task_id, depends_on_task_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_task_dep_org ON task_dependencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_dep_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dep_depends_on ON task_dependencies(depends_on_task_id);
