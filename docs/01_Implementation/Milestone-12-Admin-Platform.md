# Milestone 12 — Admin & Platform Management Implementation Specification

## Status

**Architecture frozen — implementation pending.**

---

## 1. Objective

Milestone 12 establishes the unified **Administrative & Platform Management Control Plane** of DeVoc OS. It provides centralized, auditable, and multi-tenant governance over platform infrastructure, organization onboarding, identity and access, organizational business structures, and configurable operational master data across all established operational engines (M1–M11).

M12 is designed as a **control and configuration plane**. It operates across existing operational engines without duplicating their domain models, business logic, or transactional storage.

---

## 2. Conceptual Hierarchy & Architectural Backbone

The administrative model follows a strict top-down governance topology:

```text
Platform
   ↓
Organization
   ↓
Configuration & Settings
   ↓
Identity & Access
   ↓
People
   ↓
Business Structure (Branches, BUs, Departments, Teams)
   ↓
Operational Master Data Configuration
   ↓
Authoritative Business Engines (Work, Meetings, Learning, Evaluation, Finance, Audit/Events, Analytics)
```

### Core Architecture Principles

1. **Control Layer, Not Entity Duplicate**: M12 administers existing engines; it does not replace them. There are no shadow tables such as `admin_people`, `admin_users`, `admin_projects`, `admin_work`, `admin_finance`, or `admin_audit_logs`. Operational engines remain the sole authoritative source of truth.
2. **Two-Tier Administration Model**:
   * **Platform Admin (`is_platform_admin = true`)**: Possesses global, cross-tenant operational authority. Manages tenant provisioning, organization lifecycle states, global platform defaults, and system-wide feature flags.
   * **Organization Admin (`org_admin` membership role)**: Possesses strictly bounded, tenant-scoped authority over a single organization (`organization_id`). Manages organization settings, branches, business units, departments, teams, memberships, role bindings, and tenant master data. Cannot access or mutate other organizations.
3. **Strict Separation of User Identity and Person Identity**:
   * `User Identity` (`users` table): Authenticated login credentials, email, password hash, platform admin status, and global identity.
   * `Person Identity` (`people` table): Physical human being within an organization, employment contracts, manager hierarchy, skills, and organizational assignments.
   * M12 manages the administrative linking (`people.user_id = users.id`) without conflating the two concepts.
4. **Historical Immutability of Master Data**: Operational master data (work categories, meeting types, evaluation criteria, finance categories) referenced by historical records must never be destructively deleted. M12 enforces lifecycle deactivation and retirement (`is_active = false` or `active = false`) to preserve relational integrity.
5. **Contextual Authorization Model**: Administrative authority enforces the established DeVoc OS model: `Role + Business Unit + Team + Project`. Fine-grained administrative boundaries prevent unauthorized cross-unit operations (e.g., BU Heads cannot manage finance categories or platform settings).
6. **Unified Audit & Event Integration**: Every administrative mutation records an immutable audit entry via M10 `AuditService` and emits domain events via M10 `eventBus`. No separate administrative audit system is introduced.
7. **Strict Multi-Tenant Isolation**: Tenant boundaries are enforced across all organization-level administrative endpoints. Cross-tenant access returns HTTP `404 Not Found` to prevent metadata or tenant existence leaks.

---

## 3. Administrative Ownership Matrix

M12 routes administrative operations to authoritative domain engines rather than maintaining parallel state:

| Administrative Domain | Source of Truth (Authoritative Engine) | Physical Tables | M12 Responsibility |
|-----------------------|-----------------------------------------|-----------------|--------------------|
| **Platform Control** | Platform Engine (M12) | `platform_settings`, `feature_configurations` | Global system defaults, cross-tenant organization provisioning, global feature governance |
| **Organization Lifecycle** | Organization Engine (M1) | `organizations`, `organization_settings` | Organization onboarding, status transition (active/suspended/archived), tenant settings (timezone, currency, locale) |
| **Business Structure** | Organization Engine (M1) | `branches`, `business_units`, `departments`, `teams` | Branch operations, BU lifecycle, department taxonomy, permanent/temporary team configuration |
| **User Identity & Access** | Auth & Identity (M1) | `users`, `organization_memberships` | User invitation, membership activation/suspension, global user deactivation |
| **Role & Permission Governance** | People Engine (M2) & Auth (M1) | `roles`, `person_roles` | Role taxonomy administration, contextual role assignment (BU/Team/Dept binding), permission audit |
| **People Administration** | People Engine (M2) | `people`, `employments`, `skills`, `person_skills` | Person ↔ User linking, employment contract management, manager hierarchy, skills taxonomy |
| **Assignment Governance** | Assignment Engine (M3) | `assignments`, `assignment_history` | Assignment oversight, administrative capacity adjustments, organizational target allocation |
| **Project Master Data** | Projects & Tasks Engine (M4) | `projects`, `project_business_units` | Project type taxonomy, priority configuration, multi-BU project associations |
| **Work Configuration** | Work Engine (M5) | `work_categories` | Work category taxonomy, activation/deactivation/retirement |
| **Meeting Configuration** | Meetings Engine (M6) | `meeting_types` | Meeting type taxonomy, mandatory agenda templates, lifecycle |
| **Learning Master Data** | Learning Engine (M7) | `learning_programs`, `learning_program_milestones` | Program lifecycle administration, milestone requirement governance |
| **Evaluation Configuration** | Evaluation Engine (M8) | `evaluation_templates`, `evaluation_criteria` | Evaluation template versioning, scoring dimension configuration, retirement rules |
| **Finance Master Data** | Finance Engine (M9) | `finance_categories`, `financial_budgets` | Chart of accounts/categories taxonomy, budget period configuration |
| **Audit & Event Oversight** | Audit & Events Engine (M10) | `audit_logs`, `event_outbox`, `event_registry` | Administrative audit trail inspection, outbox dead-letter monitoring |
| **Analytics Governance** | Analytics Engine (M11) | `analytics_metric_definitions`, `analytics_reports` | Reusable metric registration, executive saved report governance |

---

## 4. Platform Administration Architecture

Platform Administration governs cross-tenant infrastructure and tenant lifecycle.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Platform Administrator                   │
│                 (is_platform_admin = true)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌─────────────────┐
│ Organization │       │   Platform   │       │  Global Feature │
│ Provisioning │       │   Settings   │       │  Configurations │
└──────┬───────┘       └──────┬───────┘       └────────┬────────┘
       │                      │                        │
       ▼                      ▼                        ▼
 organizations        platform_settings      feature_configurations
(tenant boundary)   (global defaults/ops)   (platform-wide flags)
```

### 4.1 Organization Provisioning & Lifecycle

Platform administrators provision and govern organizations through an explicit state machine:

```text
[Provisioned / Active] ──► [Suspended] ──► [Deactivated] ──► [Archived]
         ▲                     │
         └─────────────────────┘
```

1. **Provisioned / Active**: Organization is operational. Tenant users can authenticate, and all enabled engines process transactions.
2. **Suspended**: Operational suspension (e.g., non-payment, compliance hold). Authentication to the organization is immediately rejected with HTTP `403 Forbidden` (`Organization is suspended`). Background jobs and async event delivery for this tenant are paused.
3. **Deactivated**: Administrative shutdown. No active memberships may authenticate. Data is preserved for audit and compliance.
4. **Archived**: Read-only archival. Tenant data is retained in cold storage/historical tables, non-queryable by operational endpoints.

### 4.2 Platform Settings

Global platform defaults apply across all tenants unless explicitly overridden:
* Default password complexity and session expiration policies.
* Global system maintenance windows (setting platform in read-only mode).
* Supported currencies and timezones registry.
* Maximum upload limits and attachment retention policies.

---

## 5. Organization Administration Architecture

Organization Administration operates strictly within a single tenant boundary (`organization_id`).

### 5.1 Organization Settings (`organization_settings`)

Every organization maintains a dedicated configuration record:
* `timezone`: Canonical IANA timezone string (default: `UTC`).
* `locale`: BCP 47 locale code (default: `en-US`).
* `dateFormat`: Standard display format (default: `YYYY-MM-DD`).
* `timeFormat`: Time display (`12h` or `24h`, default: `24h`).
* `currency`: ISO 4217 currency code (default: `USD`).
* `defaultBranchId`: Foreign key to `branches(id)`.
* `defaultBusinessUnitId`: Foreign key to `business_units(id)`.
* `settings`: Validated JSONB for organization preferences (branding display names, support email, notification defaults).

### 5.2 Business Structure Administration

Respects the M1 Organization Engine domain model:
* **Branches**: Physical or operational locations (`branches`). Can be created, updated, and deactivated.
* **Business Units**: Functional business operations (`business_units`). Configurable without modifying core system code. Supports linking a BU Head (Person), budget references (Finance), and KPIs (Analytics). Projects can belong to multiple BUs (`project_business_units`).
* **Departments**: Functional divisions (`departments`) grouping teams within or across BUs.
* **Teams**: Collaboration squads (`teams`) mapped to a department and business unit. Configured as permanent or temporary.

---

## 6. Identity & Access Control Plane

M12 provides administrative interfaces over the established M1 Auth and M2 People domains.

### 6.1 User Provisioning & Membership Lifecycle

1. **User Invitation**:
   * Admin creates an invitation for an email address.
   * If user exists in `users`, an `organization_memberships` record is created in status `active`.
   * If user does not exist, an account invitation token is generated. Upon acceptance, `users` record is created alongside `organization_memberships`.
2. **Membership Status Transitions**:
   * `active`: User can authenticate and switch context into the organization.
   * `suspended`: User cannot access the organization; API requests return HTTP `403 Forbidden`.
   * `inactive`: Membership terminated. Contextual roles and assignments are concluded.

### 6.2 Person ↔ User Identity Linking

* A `Person` represents the employee, contractor, trainer, mentor, or student in the People Engine.
* A `User` represents the authentication account.
* **Linking**: Admin links `people.user_id = users.id`. Validates that the Person and User belong to the same organization membership.
* **Unlinking**: Admin sets `people.user_id = NULL`. The Person's historical employment records, assignments, work records, evaluations, and audit history remain 100% intact.

### 6.3 Contextual Role Assignment

Role assignments use the M2 People Engine:
* `person_roles`: Binds a `person_id` to a `role_id` within a contextual scope:
  * Optional `business_unit_id`
  * Optional `department_id`
  * Optional `team_id`
* M12 administrators can assign, update, and end role bindings with explicit `start_date` and `end_date`.

---

## 7. Configurable Master Data Governance

Master data configuration governs the foundational taxonomies consumed by business engines.

### 7.1 Master Data Lifecycle & Retirement Rules

To safeguard relational and historical integrity across M1–M11:

```text
┌─────────┐        Activate        ┌─────────┐       Deactivate/Retire      ┌──────────┐
│  Draft  ├───────────────────────►│  Active ├─────────────────────────────►│ Retired  │
└─────────┘                        └─────────┘                              └──────────┘
                                        │                                         │
                                        │ New transactions allowed                │ Immutable:
                                        │ Historical reports allowed              │ NO new transactions
                                        │                                         │ Historical reports preserved
```

1. **Active**: Available for selection in new transactions and operational records.
2. **Retired / Inactive**: Prohibited from being selected in new operational records. All existing historical transactions (work records, meetings, evaluations, finance obligations) retain their foreign keys.
3. **No Destructive Deletion**: Hard deletion (`DELETE FROM ...`) is blocked whenever foreign key references exist. APIs reject deletion requests with HTTP `409 Conflict` and advise deactivation.

### 7.2 Governed Master Data Taxonomies

| Domain | Configurable Entity | Table | Key Attributes | Retirement Effect |
|--------|---------------------|-------|----------------|-------------------|
| **Work** | Work Category | `work_categories` | `name`, `code`, `active` | Cannot log new work records with this category; existing logs intact |
| **Meetings** | Meeting Type | `meeting_types` | `name`, `code`, `is_active` | Cannot schedule new meetings with this type; past meetings intact |
| **Evaluation** | Evaluation Template | `evaluation_templates` | `name`, `version`, `is_active` | Cannot create new evaluations from this template; completed reviews intact |
| **Evaluation** | Evaluation Criterion | `evaluation_criteria` | `name`, `weight`, `criterion_type` | Immutable once an evaluation uses it. Modifications require a new template version |
| **Finance** | Finance Category | `finance_categories` | `name`, `code`, `category_type`, `is_active` | Cannot allocate new obligations/transactions; existing journal intact |
| **People** | Skills Taxonomy | `skills` | `name`, `code`, `category`, `status` | Cannot assign skill to new personnel; existing proficiencies intact |
| **People** | Organizational Roles | `roles` | `name`, `code`, `is_system`, `status` | System roles cannot be modified. Custom roles can be deactivated |

---

## 8. Controlled Feature Configuration Engine

M12 introduces a structured, governed feature configuration model avoiding unconstrained key-value stores.

### 8.1 Inheritance Hierarchy

Feature configuration resolves hierarchically:

```text
Platform Default (feature_configurations where organization_id IS NULL)
        ↓
Organization Override (feature_configurations where organization_id = $orgId)
```

If an organization override exists, it takes precedence. Otherwise, the platform default applies.

### 8.2 Feature Configuration Schema & Governance

* `feature_key`: Standard namespaced identifier (e.g., `module.finance.enabled`, `work.evidence_mandatory`, `learning.self_paced_mode`).
* `is_enabled`: Boolean master switch.
* `config_value`: Structured, validated JSONB configuration payload.
* `description`: Documentation of the feature flag purpose and impact.

---

## 9. Administrative Audit & Event Emission

All M12 administrative mutations are strictly auditable through M10 primitives:

### 9.1 Audit Actions Recorded via `AuditService.recordLog`

* `PLATFORM_ORGANIZATION_PROVISIONED`
* `PLATFORM_ORGANIZATION_STATUS_UPDATED`
* `PLATFORM_SETTINGS_UPDATED`
* `ORGANIZATION_SETTINGS_UPDATED`
* `ADMIN_BRANCH_CREATED`, `ADMIN_BRANCH_UPDATED`
* `ADMIN_BUSINESS_UNIT_CREATED`, `ADMIN_BUSINESS_UNIT_UPDATED`
* `ADMIN_DEPARTMENT_CREATED`, `ADMIN_DEPARTMENT_UPDATED`
* `ADMIN_TEAM_CREATED`, `ADMIN_TEAM_UPDATED`
* `ADMIN_USER_INVITED`, `ADMIN_MEMBERSHIP_STATUS_UPDATED`, `ADMIN_MEMBERSHIP_ROLE_UPDATED`
* `ADMIN_PERSON_USER_LINKED`, `ADMIN_PERSON_USER_UNLINKED`
* `ADMIN_ROLE_CREATED`, `ADMIN_ROLE_UPDATED`, `ADMIN_PERSON_ROLE_ASSIGNED`, `ADMIN_PERSON_ROLE_REVOKED`
* `ADMIN_MASTER_DATA_CREATED`, `ADMIN_MASTER_DATA_RETIRED`
* `ADMIN_FEATURE_FLAG_CONFIGURED`

### 9.2 Domain Events Emitted via `eventBus.publish`

* `admin.organization.provisioned`
* `admin.organization.status_changed`
* `admin.organization.settings_updated`
* `admin.structure.branch_changed`
* `admin.structure.business_unit_changed`
* `admin.structure.team_changed`
* `admin.identity.membership_changed`
* `admin.identity.person_linked`
* `admin.identity.role_bound`
* `admin.master_data.retired`
* `admin.feature.updated`

---

## 10. Non-Goals

M12 strictly excludes:
* Payroll calculation or direct disbursement engines.
* External payment gateway or bank account aggregation integrations.
* Calendar sync connectors (Google Calendar, Outlook).
* External HRMS connectors (Workday, BambooHR).
* AI/ML administrative scoring or automated organizational restructuring.
* Replacement engines for People, Assignments, Projects, Work, Meetings, Learning, Evaluation, Finance, Audit, or Analytics.
* User-facing end-client portals or frontend dashboard implementations.
