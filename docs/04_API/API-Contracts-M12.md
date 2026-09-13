# REST API Architecture & Contracts — Milestone 12 Admin & Platform Management

## Status

**Architecture frozen — implementation pending.**

---

## 1. Overview & API Boundary

Milestone 12 defines the administrative API surface of DeVoc OS. It establishes two distinct, non-overlapping administrative namespaces:

```text
/api/v1/platform/...  → Global Platform Administration (Cross-tenant, Platform Admin only)
/api/v1/admin/...     → Organization Administration (Tenant-scoped, Org Admin / Delegated Admin)
```

### Core API Rules & Conventions

1. **Version Prefix**: All endpoints are strictly versioned under `/api/v1/`.
2. **Tenant Scoping**:
   - `/api/v1/platform/...` endpoints are platform-level and do not require tenant scoping headers.
   - `/api/v1/admin/...` endpoints **MUST** include the `X-Organization-Id` header (and/or active JWT tenant context). Cross-tenant access returns HTTP `404 Not Found`.
3. **No Shadow Logic**: Administrative endpoints route mutations to the authoritative underlying domain engines (M1–M11). M12 acts as an authorization, governance, and routing control plane.
4. **Standard Response Envelopes**:
   - Success: `{"data": {...}, "meta": {...}}`
   - Error: `{"error": {"code": "...", "message": "...", "details": {...}, "request_id": "..."}}`
5. **Auditing & Tracing**: Every mutating request generates a correlation ID (`X-Correlation-Id`), traces via `X-Request-Id`, and persists an immutable audit log via M10 `AuditService`.

---

## 2. Platform Administration Namespace (`/api/v1/platform`)

**Access Control**: Authenticated users with `users.is_platform_admin = TRUE`. Any non-platform admin caller receives HTTP `403 Forbidden` (`FORBIDDEN`).

### 2.1 Summary of Platform Endpoints

| Method | Path | Description | Required Role / Permission |
|--------|------|-------------|----------------------------|
| `POST` | `/api/v1/platform/organizations` | Provision a new tenant organization + default settings + initial org admin | `platform:admin` |
| `GET` | `/api/v1/platform/organizations` | List all tenant organizations across the platform (paginated, filtered by status) | `platform:admin` |
| `GET` | `/api/v1/platform/organizations/:id` | Get comprehensive details of a specific organization | `platform:admin` |
| `PATCH` | `/api/v1/platform/organizations/:id/status` | Transition organization lifecycle status (`active`, `suspended`, `archived`) | `platform:admin` |
| `GET` | `/api/v1/platform/settings` | List all global platform settings | `platform:admin` |
| `GET` | `/api/v1/platform/settings/:key` | Get a specific platform setting | `platform:admin` |
| `PUT` | `/api/v1/platform/settings/:key` | Create or update a global platform setting | `platform:admin` |
| `GET` | `/api/v1/platform/features` | List global feature configurations and defaults | `platform:admin` |
| `PUT` | `/api/v1/platform/features/:featureKey` | Set global default toggle and JSON schema config for a feature | `platform:admin` |

---

### 2.2 Platform Endpoint Specifications

#### `POST /api/v1/platform/organizations`
Provisions a new tenant. Executes inside a database transaction: creates `organizations` record, initializes `organization_settings` with defaults, provisions or binds initial user as `org_admin` in `organization_memberships`, records audit log, and emits `organization.provisioned` domain event.

- **Request Body**:
```json
{
  "name": "Acme Global Academy",
  "slug": "acme-academy",
  "adminEmail": "admin@acme.edu",
  "adminName": "Jane Doe",
  "timezone": "America/New_York",
  "currency": "USD",
  "locale": "en-US"
}
```

- **Success Response (201 Created)**:
```json
{
  "data": {
    "organization": {
      "id": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
      "name": "Acme Global Academy",
      "slug": "acme-academy",
      "status": "active",
      "createdAt": "2026-09-14T00:00:00.000Z"
    },
    "settings": {
      "timezone": "America/New_York",
      "locale": "en-US",
      "currency": "USD",
      "dateFormat": "YYYY-MM-DD",
      "timeFormat": "24h"
    },
    "adminUser": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@acme.edu",
      "membershipRole": "org_admin"
    }
  },
  "meta": {
    "requestId": "req-98765-platform-01"
  }
}
```

- **Error Codes**:
  - `400 VALIDATION_ERROR`: Invalid slug format, missing required fields.
  - `403 FORBIDDEN`: Caller is not a platform admin.
  - `409 CONFLICT`: Organization slug or name already exists.

---

#### `PATCH /api/v1/platform/organizations/:id/status`
Transitions the lifecycle status of an organization.

- **Request Body**:
```json
{
  "status": "suspended",
  "reason": "Payment default under enterprise contract #4029"
}
```

- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
    "name": "Acme Global Academy",
    "previousStatus": "active",
    "status": "suspended",
    "reason": "Payment default under enterprise contract #4029",
    "updatedAt": "2026-09-14T00:05:00.000Z"
  },
  "meta": {
    "requestId": "req-98765-platform-02"
  }
}
```

- **Error Codes**:
  - `404 NOT_FOUND`: Organization ID does not exist.
  - `422 INVALID_STATE_TRANSITION`: Invalid transition (e.g., from `archived` back to `active` without explicit unarchival procedure).

- **Compatibility Aliases**:
  - `POST /api/v1/platform/organizations/:id/suspend`: Compatibility alias forwarding directly to `PATCH .../status` with `status: "suspended"`.
  - `POST /api/v1/platform/organizations/:id/reactivate`: Compatibility alias forwarding directly to `PATCH .../status` with `status: "active"`.
  - The canonical contract remains `PATCH /api/v1/platform/organizations/:id/status`.

---

#### `PUT /api/v1/platform/settings/:key`
Creates or updates a platform-wide global setting.

- **Request Body**:
```json
{
  "value": {
    "sessionTtlMinutes": 1440,
    "maxFailedLogins": 5,
    "lockoutDurationMinutes": 30
  },
  "description": "Global user authentication and lockout parameters"
}
```

- **Success Response (200 OK)**:
```json
{
  "data": {
    "key": "platform.security.auth_policy",
    "value": {
      "sessionTtlMinutes": 1440,
      "maxFailedLogins": 5,
      "lockoutDurationMinutes": 30
    },
    "description": "Global user authentication and lockout parameters",
    "updatedBy": "110e8400-e29b-41d4-a716-446655440099",
    "updatedAt": "2026-09-14T00:10:00.000Z"
  },
  "meta": {
    "requestId": "req-98765-platform-03"
  }
}
```

---

#### `PUT /api/v1/platform/features/:featureKey`
Sets the global default state and configuration schema for a feature toggle.

- **Request Body**:
```json
{
  "isEnabled": true,
  "configValue": {
    "maxActiveProjects": 50,
    "allowClientPortals": false
  },
  "description": "Platform default for client portal capability"
}
```

- **Success Response (200 OK)**:
```json
{
  "data": {
    "featureKey": "feature.client_portal",
    "organizationId": null,
    "isEnabled": true,
    "configValue": {
      "maxActiveProjects": 50,
      "allowClientPortals": false
    },
    "description": "Platform default for client portal capability",
    "updatedAt": "2026-09-14T00:12:00.000Z"
  },
  "meta": {
    "requestId": "req-98765-platform-04"
  }
}
```

---

## 3. Organization Administration Namespace (`/api/v1/admin`)

**Access Control**: Authenticated users who are active members of the tenant with `role = 'org_admin'` or holding specific delegated administrative permissions.

**Mandatory Header**: `X-Organization-Id: <uuid>`

---

### 3.1 Organization Profile & System Settings

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/admin/organization` | Get organization metadata and general status | `organization:view` or `org_admin` |
| `PATCH` | `/api/v1/admin/organization` | Update organization display name and legal info | `organization:manage` or `org_admin` |
| `GET` | `/api/v1/admin/settings` | Get organization settings (timezone, currency, defaults) | `settings:view` or `org_admin` |
| `PUT` | `/api/v1/admin/settings` | Update organization operational settings | `settings:manage` or `org_admin` |

#### `PUT /api/v1/admin/settings`
Updates tenant-level operational defaults.

- **Request Body**:
```json
{
  "timezone": "Asia/Kolkata",
  "locale": "en-IN",
  "dateFormat": "DD/MM/YYYY",
  "timeFormat": "12h",
  "currency": "INR",
  "defaultBranchId": "330e8400-e29b-41d4-a716-446655440001",
  "defaultBusinessUnitId": "440e8400-e29b-41d4-a716-446655440002",
  "settings": {
    "supportEmail": "help@devoc.internal",
    "allowSelfReview": true
  }
}
```

- **Success Response (200 OK)**:
```json
{
  "data": {
    "organizationId": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
    "timezone": "Asia/Kolkata",
    "locale": "en-IN",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "12h",
    "currency": "INR",
    "defaultBranchId": "330e8400-e29b-41d4-a716-446655440001",
    "defaultBusinessUnitId": "440e8400-e29b-41d4-a716-446655440002",
    "settings": {
      "supportEmail": "help@devoc.internal",
      "allowSelfReview": true
    },
    "updatedAt": "2026-09-14T00:15:00.000Z"
  },
  "meta": {
    "requestId": "req-12345-admin-01"
  }
}
```

- **Error Codes**:
  - `400 VALIDATION_ERROR`: Invalid IANA timezone, unsupported currency code, or invalid date format.
  - `404 NOT_FOUND`: `defaultBranchId` or `defaultBusinessUnitId` does not exist in this tenant.

---

### 3.2 Business Structure Administration (Organization Engine M1)

M12 routes all business structure mutations directly to the M1 Organization Engine.

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `POST` | `/api/v1/admin/branches` | Create an operational branch | `structure:manage` or `org_admin` |
| `GET` | `/api/v1/admin/branches` | List branches (filter: `is_active`, `limit`, `offset`) | `structure:view` or `org_admin` |
| `PATCH` | `/api/v1/admin/branches/:id` | Update branch name, location, or toggle `is_active` | `structure:manage` or `org_admin` |
| `POST` | `/api/v1/admin/business-units` | Create a new Business Unit | `structure:manage` or `org_admin` |
| `GET` | `/api/v1/admin/business-units` | List Business Units (filter: `is_active`) | `structure:view` or `org_admin` |
| `PATCH` | `/api/v1/admin/business-units/:id` | Update BU name, Head of BU, or toggle `is_active` | `structure:manage` or `org_admin` |
| `POST` | `/api/v1/admin/departments` | Create a department | `structure:manage` or `org_admin` |
| `GET` | `/api/v1/admin/departments` | List departments | `structure:view` or `org_admin` |
| `PATCH` | `/api/v1/admin/departments/:id` | Update department details | `structure:manage` or `org_admin` |
| `POST` | `/api/v1/admin/teams` | Create an operational team | `structure:manage` or `org_admin` |
| `GET` | `/api/v1/admin/teams` | List teams (filter by `business_unit_id`, `is_active`) | `structure:view` or `org_admin` |
| `PATCH` | `/api/v1/admin/teams/:id` | Update team details, lead, or active status | `structure:manage` or `org_admin` |

#### `POST /api/v1/admin/business-units`
- **Request Body**:
```json
{
  "name": "Enterprise Solutions",
  "code": "BU-ENT",
  "headPersonId": "660e8400-e29b-41d4-a716-446655440011",
  "description": "Client software engineering and enterprise consulting unit"
}
```

- **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440088",
    "organizationId": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
    "name": "Enterprise Solutions",
    "code": "BU-ENT",
    "headPersonId": "660e8400-e29b-41d4-a716-446655440011",
    "isActive": true,
    "createdAt": "2026-09-14T00:20:00.000Z"
  },
  "meta": {
    "requestId": "req-12345-admin-02"
  }
}
```

---

### 3.3 Identity & Membership Administration (Auth M1 & People M2)

Maintains the explicit separation: `User Identity != Person Identity`.

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `POST` | `/api/v1/admin/invitations` | Invite a user to join the tenant organization | `membership:manage` or `org_admin` |
| `GET` | `/api/v1/admin/members` | List organization memberships (filter: `role`, `status`) | `membership:view` or `org_admin` |
| `PATCH` | `/api/v1/admin/members/:userId/role` | Change member organization role (`org_admin` ↔ `member`) | `membership:manage` or `org_admin` |
| `PATCH` | `/api/v1/admin/members/:userId/status` | Suspend or reactivate member access (`active` ↔ `suspended`) | `membership:manage` or `org_admin` |
| `DELETE` | `/api/v1/admin/members/:userId` | Revoke organization membership | `membership:manage` or `org_admin` |
| `POST` | `/api/v1/admin/people/:personId/link-user` | Link an existing `Person` record to an authenticated `User` account | `people:admin` or `org_admin` |
| `POST` | `/api/v1/admin/people/:personId/unlink-user` | Sever the link between `Person` and `User` account | `people:admin` or `org_admin` |
| `POST` | `/api/v1/admin/people/:personId/roles` | Assign contextual role (`person_roles`) with BU/Team/Dept scope | `roles:manage` or `org_admin` |
| `DELETE` | `/api/v1/admin/people/:personId/roles/:personRoleId` | Revoke a contextual role assignment | `roles:manage` or `org_admin` |

#### `POST /api/v1/admin/people/:personId/link-user`
Binds a physical `Person` record to a login `User` account.

- **Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

- **Validation Rules**:
  1. `personId` must exist in caller's tenant (`people.organization_id = $orgId`).
  2. `userId` must exist in `users` and have an active membership in caller's tenant.
  3. `userId` must not already be linked to another `Person` within the same organization (`1:1 per tenant`).
  4. `personId` must not already have a linked `user_id`.

- **Success Response (200 OK)**:
```json
{
  "data": {
    "personId": "660e8400-e29b-41d4-a716-446655440011",
    "organizationId": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "linkedAt": "2026-09-14T00:25:00.000Z"
  },
  "meta": {
    "requestId": "req-12345-admin-03"
  }
}
```

- **Error Codes**:
  - `404 NOT_FOUND`: Person or User not found in this organization.
  - `409 CONFLICT`: User or Person is already linked.

---

#### `POST /api/v1/admin/people/:personId/roles`
Assigns a contextual role to a Person within a specific organizational scope.

- **Request Body**:
```json
{
  "roleId": "220e8400-e29b-41d4-a716-446655440022",
  "businessUnitId": "440e8400-e29b-41d4-a716-446655440002",
  "teamId": "550e8400-e29b-41d4-a716-446655440055",
  "departmentId": null,
  "validFrom": "2026-09-14T00:00:00.000Z",
  "validTo": null
}
```

- **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440077",
    "personId": "660e8400-e29b-41d4-a716-446655440011",
    "roleId": "220e8400-e29b-41d4-a716-446655440022",
    "businessUnitId": "440e8400-e29b-41d4-a716-446655440002",
    "teamId": "550e8400-e29b-41d4-a716-446655440055",
    "departmentId": null,
    "validFrom": "2026-09-14T00:00:00.000Z",
    "validTo": null,
    "createdAt": "2026-09-14T00:30:00.000Z"
  },
  "meta": {
    "requestId": "req-12345-admin-04"
  }
}
```

---

### 3.4 Configurable Master Data Administration

Enforces non-destructive retirement over hard deletion. If an operational record has ever referenced a master data entry, `is_active = false` / `active = false` must be used.

| Method | Path | Target Engine | Description | Permissions |
|--------|------|---------------|-------------|-------------|
| `GET` | `/api/v1/admin/master-data/work-categories` | Work (M5) | List work categories (filter: `include_inactive=true`) | `masterdata:view` or `org_admin` |
| `POST` | `/api/v1/admin/master-data/work-categories` | Work (M5) | Create a work category | `masterdata:manage` or `org_admin` |
| `PATCH` | `/api/v1/admin/master-data/work-categories/:id` | Work (M5) | Update name/description or deactivate/retire | `masterdata:manage` or `org_admin` |
| `GET` | `/api/v1/admin/master-data/meeting-types` | Meetings (M6) | List meeting types (filter: `include_inactive=true`) | `masterdata:view` or `org_admin` |
| `POST` | `/api/v1/admin/master-data/meeting-types` | Meetings (M6) | Create a meeting type | `masterdata:manage` or `org_admin` |
| `PATCH` | `/api/v1/admin/master-data/meeting-types/:id` | Meetings (M6) | Update name/description or deactivate/retire | `masterdata:manage` or `org_admin` |
| `GET` | `/api/v1/admin/master-data/evaluation-templates` | Evaluation (M8) | List evaluation templates and versions | `masterdata:view` or `org_admin` |
| `POST` | `/api/v1/admin/master-data/evaluation-templates` | Evaluation (M8) | Create a new evaluation template draft or version | `masterdata:manage` or `org_admin` |
| `PATCH` | `/api/v1/admin/master-data/evaluation-templates/:id` | Evaluation (M8) | Transition template state (`draft` → `active` → `archived`) | `masterdata:manage` or `org_admin` |
| `GET` | `/api/v1/admin/master-data/finance-categories` | Finance (M9) | List financial categories | `masterdata:view` or `org_admin` |
| `POST` | `/api/v1/admin/master-data/finance-categories` | Finance (M9) | Create a finance category (`fee`, `salary`, `operational`) | `finance:admin` or `org_admin` |
| `PATCH` | `/api/v1/admin/master-data/finance-categories/:id` | Finance (M9) | Update or retire finance category | `finance:admin` or `org_admin` |
| `GET` | `/api/v1/admin/master-data/skills` | People (M2) | List skills taxonomy | `masterdata:view` or `org_admin` |
| `POST` | `/api/v1/admin/master-data/skills` | People (M2) | Add skill to organization catalog | `masterdata:manage` or `org_admin` |
| `PATCH` | `/api/v1/admin/master-data/skills/:id` | People (M2) | Update skill or deactivate | `masterdata:manage` or `org_admin` |

#### `PATCH /api/v1/admin/master-data/work-categories/:id`
Deactivates or updates a work category. Physical DELETE is strictly disallowed if the category has historical `work_records`.

- **Request Body**:
```json
{
  "isActive": false,
  "retirementReason": "Merged into Engineering Delivery category"
}
```

- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440088",
    "organizationId": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
    "name": "Legacy Tech Support",
    "isActive": false,
    "retirementReason": "Merged into Engineering Delivery category",
    "updatedAt": "2026-09-14T00:35:00.000Z"
  },
  "meta": {
    "requestId": "req-12345-admin-05"
  }
}
```

- **Error Codes**:
  - `404 NOT_FOUND`: Category does not exist in caller's tenant.
  - `409 CONFLICT`: If hard delete is attempted while foreign key references exist in `work_records`.

---

### 3.5 Feature Configuration Overrides (`/api/v1/admin/features`)

Allows tenant administrators to configure organization-specific feature overrides or inspect effective feature states resolved against global defaults.

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/admin/features` | List effective feature flags (resolves tenant override + platform default) | `features:view` or `org_admin` |
| `GET` | `/api/v1/admin/features/:featureKey` | Get effective state and configuration for a specific feature | `features:view` or `org_admin` |
| `PUT` | `/api/v1/admin/features/:featureKey` | Set organization-level feature override | `features:manage` or `org_admin` |
| `DELETE` | `/api/v1/admin/features/:featureKey` | Delete organization override (revert back to platform default) | `features:manage` or `org_admin` |

#### `GET /api/v1/admin/features`
Returns resolved feature configurations for the caller's organization.

- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "featureKey": "module.finance.enabled",
      "isEnabled": true,
      "configValue": { "allowCustomCurrencies": false },
      "source": "platform_default"
    },
    {
      "featureKey": "work.evidence_mandatory",
      "isEnabled": false,
      "configValue": { "gracePeriodDays": 7 },
      "source": "organization_override",
      "updatedAt": "2026-09-14T00:38:00.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "requestId": "req-12345-admin-06"
  }
}
```

#### `PUT /api/v1/admin/features/:featureKey`
Creates or updates an organization override.

- **Request Body**:
```json
{
  "isEnabled": false,
  "configValue": { "gracePeriodDays": 7 },
  "description": "Disable strict evidence mandate for early stage startup sprint"
}
```

- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440099",
    "organizationId": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
    "featureKey": "work.evidence_mandatory",
    "isEnabled": false,
    "configValue": { "gracePeriodDays": 7 },
    "description": "Disable strict evidence mandate for early stage startup sprint",
    "source": "organization_override",
    "updatedAt": "2026-09-14T00:40:00.000Z"
  },
  "meta": {
    "requestId": "req-12345-admin-07"
  }
}
```

---

### 3.6 Administrative Audit Trail (`/api/v1/admin/audit-logs`)

Delegates directly to the M10 Audit Engine, pre-filtered for administrative events within caller's tenant.

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/admin/audit-logs` | Query administrative audit trail (filter by `action`, `actorId`, `dateRange`) | `audit:view` or `org_admin` |

- **Query Parameters**:
  - `action`: e.g., `ORGANIZATION_SETTINGS_UPDATED`, `PERSON_USER_LINKED`, `BUSINESS_UNIT_CREATED`, `MASTER_DATA_RETIRED`
  - `actorId`: User UUID
  - `startDate`: ISO 8601 string
  - `endDate`: ISO 8601 string
  - `limit`: Default 50, max 100
  - `offset`: Default 0

---

## 4. Standard Error Responses

### 4.1 Cross-Tenant Access (`404 Not Found`)
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested administrative resource was not found.",
    "request_id": "req-12345-err-01"
  }
}
```

### 4.2 Insufficient Permissions (`403 Forbidden`)
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Caller does not possess the required administrative capabilities for this operation.",
    "details": {
      "requiredPermission": "masterdata:manage",
      "currentRole": "member"
    },
    "request_id": "req-12345-err-02"
  }
}
```

### 4.3 Validation Error (`400 Bad Request`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters.",
    "details": {
      "timezone": "Invalid IANA timezone identifier 'Mars/Olympus_Mons'."
    },
    "request_id": "req-12345-err-03"
  }
}
```

### 4.4 Conflict / Non-Destructive Integrity Violation (`409 Conflict`)
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot delete master data record because it is referenced by historical transactional records. Deactivate the entity instead.",
    "details": {
      "referencedTable": "work_records",
      "referencingCount": 42
    },
    "request_id": "req-12345-err-04"
  }
}
```

---

*Prepared for Milestone 12 – Admin & Platform Management REST API Contracts.*
