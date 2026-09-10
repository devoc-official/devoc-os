# REST API Architecture & Contracts — Milestone 1

## Core API Principles

- All endpoints are versioned under `/api/v1/`.
- Success responses use standard data/meta envelope.
- Errors use standard machine-readable error envelope.
- Request tracing uses `X-Request-Id` headers.
- Active organization context is provided via `X-Organization-Id` header.

---

## Envelopes

### Success Response Envelope
```json
{
  "data": { ... },
  "meta": { ... }
}
```

### Error Response Envelope
```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable description",
    "details": { ... },
    "request_id": "req-uuid-123"
  }
}
```

### Error Codes
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_REQUIRED` (401)
- `INVALID_CREDENTIALS` (401)
- `FORBIDDEN` (403)
- `TENANT_CONTEXT_REQUIRED` (400)
- `TENANT_ACCESS_DENIED` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INVALID_STATE_TRANSITION` (422)
- `INTERNAL_ERROR` (500)

---

## Operational Endpoints

### 1. Liveness Health Check
- `GET /api/v1/health`
- Auth: None
- Response (200):
  ```json
  {
    "data": {
      "status": "pass",
      "timestamp": "2026-09-10T14:00:00.000Z"
    }
  }
  ```

### 2. Readiness Check
- `GET /api/v1/readiness`
- Auth: None
- Verifies PostgreSQL database connection.
- Response (200):
  ```json
  {
    "data": {
      "status": "pass",
      "database": "connected",
      "timestamp": "2026-09-10T14:00:00.000Z"
    }
  }
  ```

---

## Authentication Endpoints

### 3. Login
- `POST /api/v1/auth/login`
- Auth: None
- Body:
  ```json
  {
    "email": "user@example.com",
    "password": "SecretPassword123!"
  }
  ```
- Response (200):
  ```json
  {
    "data": {
      "accessToken": "eyJhbGci...",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "fullName": "User Name",
        "isActive": true,
        "isPlatformAdmin": false
      }
    }
  }
  ```

### 4. Logout
- `POST /api/v1/auth/logout`
- Auth: Bearer token

### 5. Current User & Memberships
- `GET /api/v1/auth/me`
- Auth: Bearer token
- Response (200):
  ```json
  {
    "data": {
      "user": { ... },
      "memberships": [
        {
          "membershipId": "uuid",
          "organizationId": "uuid",
          "organizationName": "DeVoc Official",
          "organizationSlug": "devoc-official",
          "role": "org_admin",
          "status": "active"
        }
      ]
    }
  }
  ```

---

## Organization & Tenant Endpoints

### 6. Bootstrap Organization
- `POST /api/v1/organizations/bootstrap`
- Body:
  ```json
  {
    "name": "DeVoc Official",
    "slug": "devoc-official",
    "adminEmail": "admin@devoc.internal",
    "adminPassword": "SecureAdminPassword123!",
    "adminFullName": "Platform Admin"
  }
  ```

### 7. List User Organizations
- `GET /api/v1/organizations`
- Auth: Bearer token

### 8. Get Organization Details
- `GET /api/v1/organizations/:id`
- Headers: `Authorization: Bearer <token>`, `X-Organization-Id: <org_id>`

### 9. Update Organization
- `PATCH /api/v1/organizations/:id`
- Headers: `Authorization: Bearer <token>`, `X-Organization-Id: <org_id>`
- Body: `{ "name": "Updated Org Name" }`

### 10. Update Organization Status
- `POST /api/v1/organizations/:id/status`
- Headers: `Authorization: Bearer <token>`, `X-Organization-Id: <org_id>`
- Body: `{ "status": "suspended" }` (Valid transitions: active -> suspended -> archived)

---

## Organization Memberships Endpoints

### 11. List Memberships
- `GET /api/v1/memberships`
- Headers: `X-Organization-Id: <org_id>`

### 12. Invite / Add Member
- `POST /api/v1/memberships`
- Headers: `X-Organization-Id: <org_id>`
- Body: `{ "userEmail": "newmember@example.com", "role": "org_member" }`

### 13. Update Member Role/Status
- `PATCH /api/v1/memberships/:membershipId`
- Headers: `X-Organization-Id: <org_id>`
- Body: `{ "role": "org_admin", "status": "active" }`

### 14. Remove Member
- `DELETE /api/v1/memberships/:membershipId`
- Headers: `X-Organization-Id: <org_id>`

---

## Structure Endpoints (Branches, BUs, Departments, Teams)

All endpoints require `Authorization: Bearer <token>` and `X-Organization-Id: <org_id>`.

- `GET /api/v1/branches`
- `POST /api/v1/branches` (`{ "name": "HQ", "code": "HQ-01" }`)
- `GET /api/v1/branches/:id`
- `PATCH /api/v1/branches/:id`

- `GET /api/v1/business-units`
- `POST /api/v1/business-units` (`{ "name": "DeVoc Academy", "code": "BU-ACADEMY" }`)
- `GET /api/v1/business-units/:id`
- `PATCH /api/v1/business-units/:id`

- `GET /api/v1/departments`
- `POST /api/v1/departments` (`{ "name": "Engineering", "code": "DEPT-ENG" }`)
- `GET /api/v1/departments/:id`
- `PATCH /api/v1/departments/:id`

- `GET /api/v1/teams`
- `POST /api/v1/teams` (`{ "name": "Core Team", "code": "TEAM-CORE", "isTemporary": false, "departmentId": "uuid", "businessUnitId": "uuid" }`)
- `GET /api/v1/teams/:id`
- `PATCH /api/v1/teams/:id`

---

## Audit Trail Endpoint

- `GET /api/v1/audit-logs`
- Headers: `X-Organization-Id: <org_id>`
- Auth: `org_admin` role required. Returns audit log records recorded via domain event bus.
