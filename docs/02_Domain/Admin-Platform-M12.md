# Admin & Platform Management Domain — Milestone 12

## 1. Purpose

The **Admin & Platform Management Domain** governs the administrative control plane of DeVoc OS. It defines the operational rules, entity lifecycles, configuration taxonomies, identity management bindings, and security boundaries across the entire system.

M12 acts as a **control layer over existing domain engines** (M1–M11). It does NOT maintain parallel business logic or transactional data.

---

## 2. Core Domain Model

```text
Platform Layer (Global Infrastructure)
   │
   ├── Platform Admin (is_platform_admin = true)
   ├── Platform Settings (platform_settings)
   └── Global Feature Flags (feature_configurations where org_id IS NULL)
        │
        ▼
Organization Layer (Multi-Tenant Boundary)
   │
   ├── Organization Lifecycle (organizations.status: active | suspended | archived)
   ├── Organization Settings (organization_settings: timezone, locale, currency, defaults)
   ├── Organization Admin (organization_memberships.role = 'org_admin')
   ├── Organization Overrides (feature_configurations where org_id = $orgId)
   │
   ├── Business Structure Administration (M1)
   │     ├── Branches (branches)
   │     ├── Business Units (business_units)
   │     ├── Departments (departments)
   │     └── Teams (teams)
   │
   ├── Identity & Access Administration (M1 & M2)
   │     ├── Users (users: credentials, account status)
   │     ├── Memberships (organization_memberships: role, status)
   │     ├── Person Linking (people.user_id = users.id)
   │     └── Contextual Roles (person_roles: role + BU + team + dept)
   │
   └── Governed Master Data Configuration (M2, M4, M5, M6, M7, M8, M9)
         ├── Work Categories (work_categories)
         ├── Meeting Types (meeting_types)
         ├── Evaluation Templates & Criteria (evaluation_templates, evaluation_criteria)
         ├── Finance Categories (finance_categories)
         ├── Skills Taxonomy (skills)
         └── Role Catalog (roles)
```

---

## 3. Administrative Entities & Domain Specifications

### 3.1 Platform Administration Scope

Represents the highest administrative tier in DeVoc OS.

* **Actor**: Authenticated user with `users.is_platform_admin = TRUE`.
* **Scope**: Cross-tenant operational control and infrastructure provisioning.
* **Capabilities**:
  1. Provision new tenant organizations (`organizations`).
  2. Transition organization status (`active` ↔ `suspended` ↔ `archived`).
  3. Manage global platform settings (`platform_settings`).
  4. Define system-wide feature flags (`feature_configurations` where `organization_id IS NULL`).
  5. Inspect platform-wide audit trails and dead-letter event queues.

### 3.2 Organization Administration Scope

Represents the tenant-bounded administrative tier.

* **Actor**: Authenticated user with an active membership in the target organization where `organization_memberships.role = 'org_admin'`.
* **Scope**: Strictly bounded to `organization_id`. Cross-tenant operations return HTTP `404 Not Found`.
* **Capabilities**:
  1. Update organization display information and preferences.
  2. Configure tenant operational settings (`organization_settings`: timezone, currency, date format, default BU).
  3. Administer business structure (`branches`, `business_units`, `departments`, `teams`).
  4. Manage user memberships, invitations, and status (`organization_memberships`).
  5. Link and unlink User accounts with Person identities (`people.user_id`).
  6. Assign contextual roles to personnel (`person_roles`).
  7. Configure and retire tenant master data (work categories, meeting types, evaluation templates, finance categories).
  8. Override tenant-specific feature configurations.

---

## 4. Identity & Access Domain Rules

### 4.1 Strict Invariant: User Identity != Person Identity

DeVoc OS maintains a permanent, non-negotiable architectural boundary between login accounts and physical persons:

```text
┌─────────────────────────────────────────────────────────┐
│                      User Account                       │
│                     (users table)                       │
│   id, email, password_hash, is_platform_admin, is_active│
└────────────────────────────┬────────────────────────────┘
                             │
            1:N via organization_memberships
                             ▼
┌─────────────────────────────────────────────────────────┐
│                Organization Membership                  │
│            (organization_memberships table)             │
│        organization_id, user_id, role, status           │
└────────────────────────────┬────────────────────────────┘
                             │
              1:1 Administrative Binding (Optional)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Person Record                       │
│                     (people table)                      │
│   id, organization_id, user_id (FK), first_name, email  │
└─────────────────────────────────────────────────────────┘
```

#### Rules

1. **Independent Existence**:
   * A `User` can exist without a `Person` (e.g., automated service account, platform administrator).
   * A `Person` can exist without a `User` (e.g., student without portal access, external contractor, archived former employee).
2. **Administrative Linking**:
   * Admin can link a `Person` to a `User`: `people.user_id = users.id`.
   * Pre-condition: The User must possess an active `organization_memberships` record in the Person's organization.
   * Uniqueness: A User may be linked to at most one Person per organization.
3. **Administrative Unlinking**:
   * Admin can unlink a `Person`: `people.user_id = NULL`.
   * Unlinking does NOT delete the Person, their historical employment records, assignments, work records, evaluations, or audit logs.
4. **Identity Impersonation Prohibition**:
   * User ID must never be used as a Person ID in queries, filters, or analytics.
   * Members attempting to query or compute analytics for a Person ID other than their own resolved identity are rejected with HTTP `403 Forbidden`.

### 4.2 Membership Lifecycle State Machine

```text
┌───────────┐         Accept Invite         ┌───────────┐
│  Invited  ├──────────────────────────────►│  Active   │
└─────┬─────┘                               └───┬───┬───┘
      │                                         │   │
      │ Expire/Revoke               Suspend     │   │ Deactivate
      ▼                                         │   │
┌───────────┐                                   ▼   ▼
│  Revoked  │                             ┌───────────┐
└───────────┘                             │ Suspended │
                                          └─────┬─────┘
                                                │ Reactivate
                                                ▼
                                          ┌───────────┐
                                          │  Active   │
                                          └───────────┘
```

1. **Active**: User can authenticate, access tenant resources, and perform authorized domain actions.
2. **Suspended**: User cannot access the organization. API calls immediately return HTTP `403 Forbidden` (`Membership is suspended`).
3. **Inactive**: User is permanently removed from operational access in the tenant. Historical records created by the user remain intact.

---

## 5. Contextual Authorization Architecture

M12 strictly respects the established DeVoc OS contextual permission model:

$$\text{Effective Permission} = \text{Role} + \text{Business Unit} + \text{Team} + \text{Project}$$

### 5.1 Administrative Role Taxonomy

| Role Level | Context Scope | Permitted Administrative Operations |
|------------|---------------|------------------------------------|
| **Platform Admin** | Global (Cross-Tenant) | Tenant provisioning, global settings, platform features, platform audit |
| **Organization Admin** | Tenant-Wide (`organization_id`) | Organization settings, business structure, membership lifecycle, role bindings, master data, tenant features |
| **Business Unit Head** | Specific BU (`business_unit_id`) | View BU structure, manage teams within BU, view BU personnel, propose BU budgets |
| **Department Lead** | Specific Department (`department_id`) | Manage teams and personnel roles within their departmental boundary |
| **Team Lead** | Specific Team (`team_id`) | Propose team tasks, view team member assignments and work logs |
| **Organization Member** | Individual / Assigned Context | View assigned tasks, submit work logs, participate in meetings, view own reviews |

Administrative boundaries are strictly enforced:
* A Business Unit Head cannot alter organization settings, manage global finance categories, or invite organization administrators.
* A Project Manager cannot modify organization structure or invite users.

---

## 6. Configurable Master Data Governance

Master data configuration defines the shared categories, templates, and taxonomies that operational engines consume.

### 6.1 State Machine: Draft → Active → Inactive (Retired)

```text
┌──────────┐         Publish         ┌──────────┐        Retire         ┌──────────┐
│  Draft   ├────────────────────────►│  Active  ├──────────────────────►│ Inactive │
└──────────┘                         └──────────┘                       │ (Retired)│
                                           │                            └──────────┘
                                           │ New Transactions Allowed         │
                                           │ Historical Reports Allowed       │ Immutable
                                                                              │ NO New Transactions
                                                                              │ Historical Reports Intact
```

### 6.2 Governed Master Data Rules

1. **Work Categories (`work_categories`)**:
   * Admin can create new categories with unique `(organization_id, code)`.
   * Admin can update name, description, and `active` flag.
   * Deactivation (`active = false`): Prevents selection in new `work_records`. Existing records retain historical reference.
   * Physical deletion is rejected if referenced by any `work_records`.
2. **Meeting Types (`meeting_types`)**:
   * Admin can create types with unique `(organization_id, code)`.
   * Admin can update name, description, and `is_active` flag.
   * Deactivation (`is_active = false`): Prevents scheduling new meetings of this type.
   * Physical deletion is rejected if referenced by any `meetings`.
3. **Evaluation Templates & Criteria (`evaluation_templates`, `evaluation_criteria`)**:
   * Templates support semantic versioning (`version INT`).
   * When evaluations exist against a template version, criteria cannot be altered or deleted.
   * Admin must draft a new template version (`version = version + 1`) to alter criteria.
   * Deactivation (`is_active = false`) retires the template from future evaluations.
4. **Finance Categories (`finance_categories`)**:
   * Admin can create hierarchical categories (`category_type IN ('income', 'expense', 'asset', 'liability', 'equity')`).
   * Deactivation (`is_active = false`): Prevents allocating new obligations or transactions to this category.
   * Physical deletion is prohibited if referenced in `financial_obligations` or `financial_transactions`.

---

## 7. Organization & Platform Settings Model

### 7.1 Separation of Concerns

* **Platform Defaults**: System-level fallbacks defined in `platform_settings` (e.g., standard platform session TTL, base maintenance window).
* **Organization Settings**: Tenant-level operational parameters in `organization_settings` (e.g., timezone, currency, date format).
* **User Preferences**: Personal UI settings stored in user profile metadata, NOT in organization settings.

### 7.2 Settings Validation Constraints

* **Timezone**: Must be a valid IANA timezone string (e.g., `Asia/Kolkata`, `UTC`, `America/New_York`). Validated against standard timezone list.
* **Locale**: Must be a valid BCP 47 locale code (e.g., `en-US`, `en-GB`).
* **Currency**: Must be a recognized ISO 4217 3-letter currency code (e.g., `USD`, `INR`, `EUR`).
* **Default Branch / Business Unit**: Foreign keys to `branches(id)` and `business_units(id)` belonging to the same tenant.

---

## 8. Controlled Feature Configuration Engine

Feature flags control module availability and behavioral variants across tenants without code deployments.

### 8.1 Resolution Logic

$$\text{Active Config}(K, O) = \begin{cases} \text{OrgOverride}(K, O), & \text{if exists} \\ \text{PlatformDefault}(K), & \text{if exists} \\ \text{SystemHardcodedDefault}(K), & \text{otherwise} \end{cases}$$

### 8.2 Standard Feature Key Taxonomy

* `module.finance.enabled` (Boolean): Master toggle for Finance Engine.
* `module.learning.enabled` (Boolean): Master toggle for Learning Engine.
* `module.analytics.enabled` (Boolean): Master toggle for Analytics Engine.
* `work.evidence_mandatory` (Boolean): Enforces evidence attachment on work record completion.
* `evaluation.min_reviews_required` (Integer): Required reviewer approvals before milestone sign-off.
* `security.mfa_enforced` (Boolean): Mandatory multi-factor authentication policy.

---

## 9. Administrative Audit & Domain Events

### 9.1 Audit Trail Invariant

All M12 administrative mutations write to M10 `audit_logs` atomically within the database transaction:

```text
Admin Request ──► Authorization ──► Validation ──► DB Transaction ──┬──► Domain State Update
                                                                    ├──► AuditService.recordLog
                                                                    └──► eventBus.publish (Outbox)
```

Audit entries capture:
* `actor_id`: User ID initiating the mutation.
* `actor_person_id`: Resolved Person ID (if linked).
* `organization_id`: Tenant context.
* `action`: Standardized administrative action verb.
* `entity_type`: Target entity name.
* `entity_id`: UUID of the mutated entity.
* `payload`: Structured before/after diff metadata.

### 9.2 Domain Events Catalog

M12 publishes canonical domain events via `eventBus`:

| Event Name | Trigger | Key Payload Attributes |
|------------|---------|------------------------|
| `admin.organization.provisioned` | Platform admin creates tenant | `organization_id`, `name`, `slug`, `admin_user_id` |
| `admin.organization.status_changed` | Tenant status transition | `organization_id`, `old_status`, `new_status`, `reason` |
| `admin.organization.settings_updated` | Settings changed | `organization_id`, `updated_keys`, `actor_id` |
| `admin.structure.business_unit_created`| New BU created | `organization_id`, `business_unit_id`, `name`, `code` |
| `admin.structure.team_created` | New Team created | `organization_id`, `team_id`, `department_id`, `business_unit_id` |
| `admin.identity.user_invited` | New user invitation | `organization_id`, `email`, `role`, `invited_by` |
| `admin.identity.membership_updated` | Role or status change | `organization_id`, `user_id`, `role`, `status` |
| `admin.identity.person_linked` | User linked to Person | `organization_id`, `user_id`, `person_id` |
| `admin.master_data.retired` | Master data deactivated | `organization_id`, `entity_type`, `entity_id`, `code` |
| `admin.feature_flag.updated` | Feature configuration mutated | `organization_id`, `feature_key`, `is_enabled` |
