# Database Architecture & Schema — M12 Admin & Platform Management

## Migration Reservation

`012_admin_platform_m12_schema.sql`

*(Architecture reservation only — no migration files are implemented in this architecture milestone).*

All tables follow established DeVoc OS database conventions:
* PostgreSQL UUID primary keys (`gen_random_uuid()`).
* Strict multi-tenant isolation via foreign keys to `organizations(id)` with explicit cascading rules.
* UTC timestamping (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`).
* Relational integrity enforced through foreign keys and composite unique constraints.
* Append-oriented auditability via M10 `audit_logs` without destructive deletion.

---

## 1. Table Reusability vs. New Entity Analysis

M12 is an administrative control plane. It reuses existing M1–M11 tables for operational domains and introduces only three tightly scoped configuration entities:

| Domain Area | Table Name | Status | Rationale |
|-------------|------------|--------|-----------|
| **Platform Settings** | `platform_settings` | **NEW (M12)** | Singleton/key-value store for system-wide platform defaults (e.g., session policies, maintenance flags) |
| **Organization Settings** | `organization_settings` | **NEW (M12)** | Tenant-scoped 1-to-1 operational settings (timezone, locale, date format, default BU, default currency) |
| **Feature Configuration** | `feature_configurations` | **NEW (M12)** | Governed feature toggles supporting platform defaults and organization overrides |
| **Tenant Lifecycle** | `organizations` | **REUSED (M1)** | Governs tenant status (`active`, `suspended`, `archived`) |
| **Business Structure** | `branches`, `business_units`, `departments`, `teams` | **REUSED (M1)** | Governs organizational taxonomy and hierarchy |
| **Identity & Auth** | `users`, `organization_memberships` | **REUSED (M1)** | Governs user credentials, membership status, and admin role |
| **Personnel & Roles** | `people`, `roles`, `person_roles`, `employments` | **REUSED (M2)** | Governs person identity, manager tree, and contextual role bindings |
| **Assignments** | `assignments`, `assignment_history` | **REUSED (M3)** | Governs capacity allocation and project/task responsibility |
| **Work Master Data** | `work_categories` | **REUSED (M5)** | Governs work record categories and active/inactive status |
| **Meeting Master Data** | `meeting_types` | **REUSED (M6)** | Governs meeting types and active/inactive status |
| **Evaluation Master Data** | `evaluation_templates`, `evaluation_criteria` | **REUSED (M8)** | Governs review templates, versions, and criteria |
| **Finance Master Data** | `finance_categories` | **REUSED (M9)** | Governs financial account categories |
| **Audit & Events** | `audit_logs`, `event_outbox`, `event_registry` | **REUSED (M10)** | Governs administrative audit records and outbox event dispatch |

---

## 2. DDL Schema Specifications

### 2.1 Table: `platform_settings`

Stores global, system-wide configuration keys and operational parameters.

```sql
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NULL,
    updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for operational lookup
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);
```

#### Field Specifications

* `key` (VARCHAR(100), PK): Unique namespaced setting key (e.g., `platform.maintenance_mode`, `platform.session_ttl_minutes`, `platform.supported_currencies`).
* `value` (JSONB, NOT NULL): Strongly structured JSON value.
* `description` (TEXT, NULL): Human-readable purpose of the configuration parameter.
* `updated_by` (UUID, FK): References `users(id)` of the platform administrator modifying the setting.
* `created_at` / `updated_at` (TIMESTAMPTZ): Standard audit timestamps.

---

### 2.2 Table: `organization_settings`

Stores tenant-specific operational defaults, display parameters, and localization settings (1:1 with `organizations`).

```sql
CREATE TABLE IF NOT EXISTS organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(20) NOT NULL DEFAULT 'en-US',
    date_format VARCHAR(30) NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(20) NOT NULL DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    default_branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
    default_business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant lookup index
CREATE INDEX IF NOT EXISTS idx_org_settings_org ON organization_settings(organization_id);
```

#### Field Specifications

* `organization_id` (UUID, PK, FK): Foreign key referencing `organizations(id)` on cascade delete. Enforces strict 1:1 relationship per tenant.
* `timezone` (VARCHAR(50), NOT NULL): Canonical IANA timezone identifier (e.g., `Asia/Kolkata`, `UTC`, `America/New_York`).
* `locale` (VARCHAR(20), NOT NULL): BCP 47 language/locale tag (e.g., `en-US`, `en-GB`).
* `date_format` (VARCHAR(30), NOT NULL): Standard date presentation mask (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`).
* `time_format` (VARCHAR(20), NOT NULL): Time display convention (`12h` or `24h`).
* `currency` (VARCHAR(10), NOT NULL): ISO 4217 standard 3-letter currency code (e.g., `USD`, `INR`, `EUR`).
* `default_branch_id` (UUID, NULL, FK): Fallback branch for new personnel, referencing `branches(id)`.
* `default_business_unit_id` (UUID, NULL, FK): Fallback business unit for new projects/work, referencing `business_units(id)`.
* `settings` (JSONB, NOT NULL): Extensible dictionary for organization preferences (support contact, custom branding names).
* `created_at` / `updated_at` (TIMESTAMPTZ): Standard audit timestamps.

---

### 2.3 Table: `feature_configurations`

Stores governed feature switches and module toggles supporting platform defaults and organization overrides.

```sql
CREATE TABLE IF NOT EXISTS feature_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NULL,
    updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index for platform defaults (organization_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_config_platform_default
    ON feature_configurations (feature_key)
    WHERE organization_id IS NULL;

-- Unique composite index for organization-level overrides
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_config_org_override
    ON feature_configurations (organization_id, feature_key)
    WHERE organization_id IS NOT NULL;

-- Query indexing
CREATE INDEX IF NOT EXISTS idx_feature_config_lookup
    ON feature_configurations (feature_key, organization_id);
```

#### Field Specifications

* `id` (UUID, PK): Unique surrogate key.
* `organization_id` (UUID, NULL, FK):
  * `NULL`: Represents a **Platform Default** applicable to all tenants unless overridden.
  * `UUID`: Represents a **Tenant-Specific Override** for that specific organization.
* `feature_key` (VARCHAR(100), NOT NULL): Canonical namespaced feature key (e.g., `module.finance.enabled`, `work.evidence_mandatory`).
* `is_enabled` (BOOLEAN, NOT NULL): Primary boolean toggle.
* `config_value` (JSONB, NOT NULL): Structured feature parameters (e.g., threshold limits, feature variant options).
* `description` (TEXT, NULL): Operational description.
* `updated_by` (UUID, NULL, FK): User ID of the administrator who performed the update.
* `created_at` / `updated_at` (TIMESTAMPTZ): Standard audit timestamps.

---

## 3. Relational Integrity & Cross-Tenant Constraint Rules

1. **Foreign Key Boundaries**:
   * `organization_settings.default_branch_id` must belong to the same tenant (`branches.organization_id = organization_settings.organization_id`). Enforced in application domain service prior to persistence.
   * `organization_settings.default_business_unit_id` must belong to the same tenant (`business_units.organization_id = organization_settings.organization_id`).
2. **Cascading Semantics**:
   * Deleting an organization cascades to its `organization_settings` and `feature_configurations`.
   * Deleting/retiring a branch or business unit sets the default reference in `organization_settings` to `NULL` (`ON DELETE SET NULL`), avoiding orphaned pointers.
3. **Master Data Non-Destructive Retirement**:
   * In `work_categories`, `meeting_types`, `evaluation_templates`, `finance_categories`, existing foreign keys use `ON DELETE RESTRICT`. Physical deletion is rejected by PostgreSQL foreign key constraints if referenced by transactional history.

---

## 4. Migration Execution Sequence

When Milestone 12 is scheduled for implementation:

```text
001_initial_m1_schema.sql           (M1: organizations, users, memberships, branches, BUs, teams)
002_people_m2_schema.sql            (M2: people, roles, person_roles, employments, skills)
003_assignments_m3_schema.sql       (M3: assignments, assignment_history)
004_projects_tasks_m4_schema.sql    (M4: projects, project_business_units, tasks)
005_work_m5_schema.sql              (M5: work_categories, work_records, work_evidence)
006_meetings_m6_schema.sql          (M6: meeting_types, meetings, targets)
007_learning_m7_schema.sql          (M7: learning_programs, enrollments, assessments)
008_evaluation_m8_schema.sql        (M8: evaluation_templates, criteria, evaluations)
009_finance_m9_schema.sql           (M9: finance_categories, obligations, transactions, budgets)
010_audit_events_m10_schema.sql     (M10: audit_logs, event_outbox, event_registry)
011_analytics_m11_schema.sql        (M11: analytics_metric_definitions, metric_results, reports)
012_admin_platform_m12_schema.sql   (M12: platform_settings, organization_settings, feature_configurations)
```

No existing M1–M11 tables require schema modification. M12 tables integrate seamlessly alongside previous milestones.
