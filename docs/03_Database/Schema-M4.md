# Database Architecture & Schema — M4

## Principles

PostgreSQL, UUID primary keys, UTC timestamps, tenant-owned records with `organization_id`, explicit foreign keys where the target table exists, and service-level validation for cross-domain assignment targets.

## projects

```sql
CREATE TABLE projects (
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
```

Recommended indexes:

- organization_id
- organization_id + status
- organization_id + project_type
- organization_id + priority

## project_owners

```sql
CREATE TABLE project_owners (
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
```

The application/service layer must verify project, person, and organization agreement.

## project_business_units

```sql
CREATE TABLE project_business_units (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, business_unit_id)
);
```

Organization agreement must be validated before insertion.

## tasks

```sql
CREATE TABLE tasks (
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
```

The service layer must verify parent task belongs to the same project and organization.

Recommended indexes:

- organization_id
- project_id
- project_id + status
- project_id + parent_task_id
- organization_id + status
- due_at

## task_dependencies

```sql
CREATE TABLE task_dependencies (
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
```

The application/domain service must reject dependency cycles and cross-project/cross-tenant task relationships unless future architecture explicitly permits them.

## Ownership and deletion

Normal APIs must preserve meaningful history. Project/task deletion is not a general-purpose lifecycle operation. Foreign-key cascades must not be used to erase historical records such as assignment history or audit records.

## Transaction boundaries

Project creation plus initial BU/owner relationships should be transactional. Task creation plus validated parent/dependency changes should be transactional. Lifecycle transitions and related history/audit writes should occur atomically.
