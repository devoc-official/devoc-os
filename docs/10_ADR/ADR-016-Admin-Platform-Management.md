# ADR-016 — Admin & Platform Management Architecture

## Status

**Accepted**

## Date

2026-09-14

---

## Context and Problem Statement

Following the completion of Milestones 1 through 11 (Foundation, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance, Audit & Events, Analytics), DeVoc OS requires a unified administrative and platform control plane.

System administrators, platform operators, and organization managers must be able to:
1. Provision, configure, and monitor multi-tenant organizations across their lifecycle.
2. Govern identity, organization memberships, invitations, and the association between authenticated users and physical personnel.
3. Manage organizational business structures (branches, business units, departments, and teams) dynamically without code changes.
4. Configure operational master data (work categories, meeting types, evaluation criteria, finance categories, and skills) across existing business engines.
5. Control feature toggles and platform/tenant operational parameters (timezones, locales, currencies, default units).
6. Ensure auditable governance over administrative actions while preserving strict multi-tenant isolation.

The architectural challenge is providing comprehensive administrative governance without:
* Creating redundant, parallel "admin" tables (e.g., `admin_people`, `admin_users`, `admin_projects`) that would lead to dual-write anomalies and divergent business logic.
* Conflating User Identity (login credentials) with Person Identity (organizational entity).
* Destructively deleting historical master data referenced by past transactional records.
* Bypassing contextual authorization or tenant boundaries.
* Inventing a separate permission engine, event bus, or audit logging mechanism.

---

## Decision Drivers

1. **Single Source of Truth**: Each operational engine (M1–M11) must remain the sole authoritative source of truth for its domain entities and transactional state.
2. **Two-Tier Administration Model**: Clear architectural separation between Platform Administrators (`users.is_platform_admin = TRUE`, cross-tenant platform control) and Organization Administrators (`organization_memberships.role = 'org_admin'`, tenant-bounded control).
3. **Identity Separation Invariant**: Permanent architectural separation of User Identity (`users`) and Person Identity (`people`). M12 coordinates the binding (`people.user_id = users.id`) without merging or duplicating the tables.
4. **Non-Destructive Historical Master Data Governance**: Operational master data referenced by historical records (work records, meetings, evaluations, finance obligations) must be retired (`is_active = FALSE` or `active = FALSE`), never physically deleted.
5. **Contextual Authorization Model**: Administrative permissions adhere to `Role + Business Unit + Team + Project`, preventing unauthorized cross-unit operations.
6. **Controlled Configuration & Feature Flag Model**: Avoid unvalidated key-value blobs; use strongly typed, namespaced settings with hierarchical inheritance (Platform Default → Organization Override).
7. **Cross-Cutting Audit & Event Reuse**: Reuse M10 `AuditService` and `eventBus` for all administrative mutations without introducing duplicate logging or messaging infrastructure.
8. **Strict Multi-Tenant Isolation**: Enforce tenant boundaries across all organization administration APIs; cross-tenant operations return HTTP `404 Not Found`.

---

## Considered Options

### Option 1: Monolithic Administrative Shadow Architecture
Introduce a separate administrative subsystem with its own shadow database tables (`admin_organizations`, `admin_users`, `admin_people`, `admin_projects`, `admin_work`).
* *Cons*: Directly violates `AGENTS.md` core principles; creates dual sources of truth, severe data synchronization failure risks, schema divergence, and massive maintenance overhead.
* *Verdict*: **Rejected**.

### Option 2: Unstructured Arbitrary Key/Value Configuration Store
Store all administrative settings, metadata, structures, and feature flags in a single generic `configurations(key, value)` table.
* *Cons*: Complete loss of relational integrity, inability to enforce foreign keys to branches or business units, no schema validation, fragile queries, and high risk of runtime errors.
* *Verdict*: **Rejected**.

### Option 3: Unified Control Plane over Existing Engines with Dedicated Configuration Entities (Selected)
Establish M12 as an administrative control layer that:
* Directs administrative operations to existing authoritative domain engines (M1–M11).
* Introduces only three tightly scoped, strongly typed configuration tables: `platform_settings`, `organization_settings`, and `feature_configurations`.
* Enforces two distinct administrative API boundaries (`/api/v1/platform/...` and `/api/v1/admin/...`).
* Reuses existing authentication, authorization, audit, and event mechanisms.
* *Pros*: 100% compliant with DeVoc OS architecture, zero entity duplication, robust relational integrity, non-destructive historical preservation, and clean extensibility.
* *Verdict*: **Accepted**.

---

## Decision Details

### 1. Conceptual Governance Topology

The control plane follows a strict hierarchical delegation flow:
```text
Platform Layer (Global Infrastructure)
   │
   ├── Platform Admin (is_platform_admin = true)
   ├── Platform Settings (platform_settings)
   └── Global Feature Flags (feature_configurations where org_id IS NULL)
        │
        ▼
Organization Layer (Tenant Boundary)
   │
   ├── Organization Lifecycle (organizations: active | suspended | archived)
   ├── Organization Settings (organization_settings: timezone, locale, currency)
   ├── Organization Admin (organization_memberships.role = 'org_admin')
   ├── Organization Overrides (feature_configurations where org_id = $orgId)
   │
   ├── Business Structure (M1: branches, business_units, departments, teams)
   ├── Identity & Access (M1/M2: users, memberships, people.user_id, person_roles)
   └── Master Data Configuration (M2/M5/M6/M8/M9: work, meetings, evaluations, finance)
```

### 2. Entity Ownership Matrix

| Administrative Domain | Authoritative Engine | Authoritative Physical Tables | M12 Responsibility |
|-----------------------|----------------------|--------------------------------|--------------------|
| **Platform Settings** | Platform (M12) | `platform_settings` | Global defaults and system policies |
| **Organization Lifecycle** | Organization (M1) | `organizations`, `organization_settings` | Tenant provisioning, status transitions, settings |
| **Feature Configuration** | Platform (M12) | `feature_configurations` | Governed feature toggles and overrides |
| **Business Structure** | Organization (M1) | `branches`, `business_units`, `departments`, `teams` | Structure configuration and lifecycle |
| **User & Membership** | Auth & Identity (M1) | `users`, `organization_memberships` | Invitations, role changes, suspensions |
| **People & Linking** | People Engine (M2) | `people`, `employments`, `skills` | User-to-person linking, employment status |
| **Contextual Roles** | People Engine (M2) | `roles`, `person_roles` | Scoped role assignments (`role + BU + team`) |
| **Work Master Data** | Work Engine (M5) | `work_categories` | Work category taxonomy & retirement |
| **Meeting Master Data** | Meetings Engine (M6) | `meeting_types` | Meeting types taxonomy & retirement |
| **Evaluation Master Data**| Evaluation Engine (M8)| `evaluation_templates`, `evaluation_criteria` | Template drafting, activation & archiving |
| **Finance Master Data** | Finance Engine (M9) | `finance_categories` | Account categories taxonomy & retirement |
| **Audit & Events** | Audit & Events (M10) | `audit_logs`, `event_outbox`, `event_registry` | Audit trail queries & event emission |

### 3. Database Architecture & Schema Reservation

Milestone 12 reserves migration `012_admin_platform_m12_schema.sql` (docs-only in this milestone) introducing three new tables:

1. **`platform_settings`**:
   - Primary key: `key VARCHAR(100)`
   - Columns: `value JSONB NOT NULL`, `description TEXT`, `updated_by UUID REFERENCES users(id)`, standard timestamps.
   - Purpose: System-wide platform configurations.

2. **`organization_settings`**:
   - Primary key: `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE` (1:1 with tenant).
   - Columns: `timezone`, `locale`, `date_format`, `time_format`, `currency`, `default_branch_id REFERENCES branches(id) ON DELETE SET NULL`, `default_business_unit_id REFERENCES business_units(id) ON DELETE SET NULL`, `settings JSONB`, standard timestamps.
   - Purpose: Tenant operational defaults.

3. **`feature_configurations`**:
   - Primary key: `id UUID DEFAULT gen_random_uuid()`
   - Columns: `organization_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE`, `feature_key VARCHAR(100)`, `is_enabled BOOLEAN`, `config_value JSONB`, `description TEXT`, `updated_by UUID REFERENCES users(id)`, standard timestamps.
   - Constraints: Unique index on `feature_key` where `organization_id IS NULL` (platform default); unique composite index on `(organization_id, feature_key)` where `organization_id IS NOT NULL` (tenant override).
   - Purpose: Controlled, hierarchical feature governance.

### 4. API Architecture & Namespaces

- **`/api/v1/platform/...`**:
  - Requires `users.is_platform_admin = TRUE`.
  - Manages tenant provisioning (`POST /api/v1/platform/organizations`), lifecycle status (`PATCH /api/v1/platform/organizations/:id/status`), global settings (`PUT /api/v1/platform/settings/:key`), and global features (`PUT /api/v1/platform/features/:featureKey`).
- **`/api/v1/admin/...`**:
  - Requires `X-Organization-Id` header and caller authorization (`org_admin` or delegated capability).
  - Routes organization settings, branches, business units, departments, teams, invitations, member status, person-user linking, contextual role assignment, and master data retirement directly to the underlying domain engines.

### 5. Non-Destructive Master Data Retirement

To preserve the historical integrity of past work records, meetings, evaluations, and financial obligations:
* Destructive `DELETE` queries on active or historically referenced master data are prohibited.
* Entities transition via lifecycle flags:
  - `work_categories`: `is_active = FALSE`
  - `meeting_types`: `is_active = FALSE`
  - `evaluation_templates`: `status = 'archived'`
  - `finance_categories`: `is_active = FALSE`
  - `skills`: `is_active = FALSE`
* PostgreSQL foreign keys maintain `ON DELETE RESTRICT` where referenced by historical transactions.

---

## Consequences

### Positive
* **Zero Duplication**: Operational engines remain the sole source of truth; no dual-write synchronization bugs.
* **Preserved Historical Integrity**: Retires master data safely without breaking referential integrity or historical reporting.
* **Strict Security & Isolation**: Two-tier admin model cleanly separates platform operators from tenant administrators.
* **High Extensibility**: Future business units, departments, master data categories, and feature modules can be added dynamically via configuration without architectural redesign.
* **Unified Observability**: All administrative actions produce standardized M10 audit logs and emit outbox domain events.

### Negative / Trade-offs
* **Administrative Routing Overhead**: Admin controllers must delegate across multiple domain services rather than executing direct SQL updates on shadow tables.
* **Referential Constraints**: Deleting an organizational branch or business unit requires cascading or nullifying default references in `organization_settings`.

---

## Compliance Statement

* `M12 duplicates People`: **NO** (delegates to M2 People Engine).
* `M12 duplicates Users`: **NO** (delegates to M1 Auth / Users).
* `M12 duplicates Roles`: **NO** (delegates to M2 Roles & Person Roles).
* `M12 duplicates Assignments`: **NO** (delegates to M3 Assignment Engine).
* `M12 duplicates Projects / Tasks`: **NO** (delegates to M4 Projects Engine).
* `M12 duplicates Work`: **NO** (delegates to M5 Work Engine).
* `M12 duplicates Meetings`: **NO** (delegates to M6 Meetings Engine).
* `M12 duplicates Learning`: **NO** (delegates to M7 Learning Engine).
* `M12 duplicates Evaluation`: **NO** (delegates to M8 Evaluation Engine).
* `M12 duplicates Finance`: **NO** (delegates to M9 Finance Engine).
* `M12 duplicates Audit`: **NO** (delegates to M10 Audit Engine).
* `M12 duplicates Analytics`: **NO** (delegates to M11 Analytics Engine).
* `Existing authorization reused`: **YES** (`Role + BU + Team + Project`).
* `Existing audit/event infrastructure reused`: **YES** (M10 `AuditService` & `eventBus`).
* `Tenant isolation preserved`: **YES** (strict `organization_id` scoping, 404 on cross-tenant access).
* `User != Person preserved`: **YES** (strict distinction maintained).

---

*Prepared for Milestone 12 – Admin & Platform Management Architecture.*
