# Database Architecture & Schema M2 — People & Employment Engine

This document details the PostgreSQL schema introduced in Milestone 2 for the People Engine, Roles, Person Roles, Employment lifecycle, and Skills.

## Overview & Tenancy

All tenant-scoped tables (`people`, `roles`, `person_roles`, `employments`, `employment_history`, `skills`, `person_skills`) contain `organization_id NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.

Multi-tenant queries MUST include `organization_id = $1` to enforce tenant isolation.

---

## 1. `people` Table

Stores person records, linked optionally to a user identity (`user_id`).

```sql
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  bio TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email)
);

CREATE INDEX idx_people_org_id ON people(organization_id);
CREATE INDEX idx_people_user_id ON people(user_id);
```

---

## 2. `roles` Table

Configurable roles within an organization (e.g., Founder, Employee, Student, Trainer, Mentor, Reviewer, Freelancer).

```sql
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_roles_org_id ON roles(organization_id);
```

---

## 3. `person_roles` Table

Contextual role assignments for a person (e.g. Business Unit, Department, Team scoping).

```sql
CREATE TABLE IF NOT EXISTS person_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_person_roles_org_id ON person_roles(organization_id);
CREATE INDEX idx_person_roles_person_id ON person_roles(person_id);
```

---

## 4. `employments` Table

Employment contracts and status tracking for people in an organization.

State Machine: `probation` -> `active` -> `suspended` -> `terminated` / `resigned`

```sql
CREATE TABLE IF NOT EXISTS employments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  employment_type VARCHAR(50) NOT NULL, -- e.g. full_time, part_time, contract, internship
  job_title VARCHAR(150) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'probation',
  start_date DATE NOT NULL,
  end_date DATE,
  manager_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employments_org_id ON employments(organization_id);
CREATE INDEX idx_employments_person_id ON employments(person_id);
CREATE INDEX idx_employments_manager_id ON employments(manager_person_id);
```

---

## 5. `employment_history` Table

Append-only record of employment status transitions and reporting manager changes.

```sql
CREATE TABLE IF NOT EXISTS employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employment_history_org_id ON employment_history(organization_id);
CREATE INDEX idx_employment_history_employment_id ON employment_history(employment_id);
```

---

## 6. `skills` Table

Taxonomy of skills within an organization.

```sql
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_skills_org_id ON skills(organization_id);
```

---

## 7. `person_skills` Table

Skill proficiency mappings for a person.

```sql
CREATE TABLE IF NOT EXISTS person_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(50) NOT NULL DEFAULT 'intermediate', -- e.g. beginner, intermediate, advanced, expert
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (person_id, skill_id)
);

CREATE INDEX idx_person_skills_org_id ON person_skills(organization_id);
CREATE INDEX idx_person_skills_person_id ON person_skills(person_id);
```
