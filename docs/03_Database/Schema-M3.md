# Database Schema — Milestone 3

## assignments

```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    target_type VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,
    assignment_type VARCHAR(100) NOT NULL,
    role_context VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    capacity_type VARCHAR(50),
    capacity_value NUMERIC,
    capacity_unit VARCHAR(50),
    authority_type VARCHAR(50) NOT NULL,
    assigned_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Recommended indexes:

- `organization_id`
- `person_id`
- `(target_type, target_id)`
- `status`
- `start_at`
- `end_at`
- `(organization_id, person_id, status)`
- `(organization_id, target_type, target_id)`

## assignment_history

```sql
CREATE TABLE assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    reason TEXT,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Recommended indexes:

- `organization_id`
- `assignment_id`
- `changed_at`
- `(organization_id, assignment_id, changed_at)`

## Constraints and rules

- Every record is tenant-scoped.
- `person_id` references `people`.
- `target_id` is intentionally not a database foreign key because targets are polymorphic and may belong to future domains.
- Target ownership and existence are validated in the domain/service layer through the target registry.
- UUIDs are used by default.
- Timestamps are UTC.
- `end_at`, when present, must be later than `start_at`.
- Lifecycle transitions are enforced by the application/domain service rather than arbitrary status mutation.
- Important historical changes are append-only in `assignment_history`.

## Duplicate policy

The application prevents duplicate active assignments for the same organization, person, target, and assignment type. A database uniqueness constraint is not used for this rule because assignment history and temporal semantics make a simple unique constraint insufficient.

## Migration requirements

The M3 migration must be reversible where practical, safe for existing M1/M2 data, and accompanied by schema-level and service-level tests. No Project, Task, Learning Program, Student, Work, Evaluation, Finance, or Analytics tables are introduced by M3.
