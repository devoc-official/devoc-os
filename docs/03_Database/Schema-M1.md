# Database Schema Architecture — Milestone 1

## Overview

DeVoc OS uses **PostgreSQL 16** as its primary relational database engine. Every transactional table utilizes UUID primary keys (`gen_random_uuid()`) and UTC timestamps (`TIMESTAMPTZ`).

Multi-tenant data isolation is enforced at the database level: all tenant-owned tables contain an `organization_id` foreign key with explicit indexing and tenant-local uniqueness constraints.

## Migration System

Schema migrations live under `migrations/` as raw SQL scripts (e.g. `001_initial_m1_schema.sql`).

Commands:
- Apply forward migrations: `npm run migrate`
- Reset database schema & re-apply: `npm run migrate:reset`

The `schema_migrations` table tracks applied migration files to prevent re-execution.

---

## Entity Relationship Summary

```text
organizations (Tenant Boundary)
  ├── users (Authenticated Identity)
  ├── organization_memberships (User <-> Tenant Bridge)
  ├── branches (Physical/Operational Location)
  ├── business_units (Configurable Business Area)
  ├── departments (Configurable Department Grouping)
  ├── teams (Permanent & Temporary Teams)
  └── audit_logs (Tenant Operational Audit Log)
```

---

## Table Specifications

### 1. `organizations`
Defines tenant boundaries.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique Organization ID |
| `name` | VARCHAR(255) | NOT NULL | Organization name |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | URL-friendly unique tenant slug |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT `'active'` | Status: `active`, `suspended`, `archived` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record update timestamp |

### 2. `users`
Defines authenticated user identities (decoupled from future `Person` domain).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique User ID |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hashed credential |
| `full_name` | VARCHAR(255) | NOT NULL | User full name |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT `TRUE` | Account active state |
| `is_platform_admin` | BOOLEAN | NOT NULL, DEFAULT `FALSE` | Platform administrator flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Update timestamp |

### 3. `organization_memberships`
Bridge connecting users to tenant organizations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Membership ID |
| `organization_id` | UUID | FK `organizations(id)` ON DELETE CASCADE | Tenant ID |
| `user_id` | UUID | FK `users(id)` ON DELETE CASCADE | User ID |
| `role` | VARCHAR(50) | CHECK (`org_admin`, `org_member`) | Tenant authorization role |
| `status` | VARCHAR(50) | DEFAULT `'active'` | Status: `active`, `suspended`, `invited` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Update timestamp |

**Uniqueness Constraint:** `UNIQUE(organization_id, user_id)`

### 4. `branches`
Physical or operational branch locations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Branch ID |
| `organization_id` | UUID | FK `organizations(id)` ON DELETE CASCADE | Tenant ID |
| `name` | VARCHAR(255) | NOT NULL | Branch name |
| `code` | VARCHAR(50) | NOT NULL | Tenant-local branch code |
| `status` | VARCHAR(50) | DEFAULT `'active'` | Status: `active`, `inactive` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Update timestamp |

**Uniqueness Constraint:** `UNIQUE(organization_id, code)`

### 5. `business_units`
Configurable business areas (e.g. Academy, IT Solutions).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Business Unit ID |
| `organization_id` | UUID | FK `organizations(id)` ON DELETE CASCADE | Tenant ID |
| `name` | VARCHAR(255) | NOT NULL | Business Unit name |
| `code` | VARCHAR(50) | NOT NULL | Tenant-local BU code |
| `status` | VARCHAR(50) | DEFAULT `'active'` | Status: `active`, `inactive` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Update timestamp |

**Uniqueness Constraint:** `UNIQUE(organization_id, code)`

### 6. `departments`
Configurable department groupings (e.g. Engineering, Sales).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Department ID |
| `organization_id` | UUID | FK `organizations(id)` ON DELETE CASCADE | Tenant ID |
| `name` | VARCHAR(255) | NOT NULL | Department name |
| `code` | VARCHAR(50) | NOT NULL | Tenant-local department code |
| `status` | VARCHAR(50) | DEFAULT `'active'` | Status: `active`, `inactive` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Update timestamp |

**Uniqueness Constraint:** `UNIQUE(organization_id, code)`

### 7. `teams`
Permanent and temporary teams.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Team ID |
| `organization_id` | UUID | FK `organizations(id)` ON DELETE CASCADE | Tenant ID |
| `name` | VARCHAR(255) | NOT NULL | Team name |
| `code` | VARCHAR(50) | NOT NULL | Tenant-local team code |
| `status` | VARCHAR(50) | DEFAULT `'active'` | Status: `active`, `inactive` |
| `is_temporary` | BOOLEAN | NOT NULL, DEFAULT `FALSE` | Temporary team flag |
| `department_id` | UUID | FK `departments(id)` ON DELETE SET NULL | Optional Department reference |
| `business_unit_id` | UUID | FK `business_units(id)` ON DELETE SET NULL | Optional BU reference |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Update timestamp |

**Uniqueness Constraint:** `UNIQUE(organization_id, code)`

### 8. `audit_logs`
Tenant operational audit history.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Log ID |
| `organization_id` | UUID | FK `organizations(id)` ON DELETE CASCADE | Tenant ID |
| `actor_id` | UUID | FK `users(id)` ON DELETE SET NULL | Performing user ID |
| `action` | VARCHAR(100) | NOT NULL | Action or domain event name |
| `entity_type` | VARCHAR(100) | NOT NULL | Affected entity type |
| `entity_id` | UUID | NULL | Affected entity ID |
| `payload` | JSONB | NULL | Before/after mutation details |
| `request_id` | VARCHAR(100) | NULL | Correlation / Request ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Timestamp |

---

## Indexes

- `idx_orgs_slug`: `organizations(slug)`
- `idx_memberships_user_org`: `organization_memberships(user_id, organization_id)`
- `idx_memberships_org`: `organization_memberships(organization_id)`
- `idx_branches_org`: `branches(organization_id)`
- `idx_bu_org`: `business_units(organization_id)`
- `idx_dept_org`: `departments(organization_id)`
- `idx_team_org`: `teams(organization_id)`
- `idx_audit_org`: `audit_logs(organization_id)`
- `idx_audit_actor`: `audit_logs(actor_id)`
- `idx_audit_entity`: `audit_logs(entity_type, entity_id)`
