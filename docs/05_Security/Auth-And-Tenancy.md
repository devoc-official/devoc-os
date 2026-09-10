# Authentication, Tenant Resolution & Security — Milestone 1

## Overview

DeVoc OS uses a two-tier security model:
1. **Authentication**: Authenticates user identity via JWT Bearer tokens.
2. **Tenant Resolution & Membership Verification**: Scopes requests strictly to an authorized organization context.

Authentication identity (`users`) is decoupled from organization authorization (`organization_memberships`) and future person identities (`Person`).

---

## Authentication Flow

```text
HTTP Request (Header: Authorization: Bearer <JWT>)
  ↓
1. Auth Middleware (`src/auth/auth.middleware.ts`)
   - Verifies JWT signature using JWT_SECRET
   - Loads user record from database
   - Verifies user account is active (`is_active = true`)
   - Attaches `req.user = UserIdentity`
```

- Password storage uses `bcryptjs` with salt round 10.
- Passwords, access tokens, and secrets are NEVER logged.

---

## Tenant Resolution Flow

```text
HTTP Request (Header: X-Organization-Id: <org_uuid>)
  ↓
2. Tenant Resolution Middleware (`src/tenant/tenant.middleware.ts`)
   - Extracts requested organization ID
   - Verifies user has active membership in target organization
   - Rejects unauthorized requests with 403 `TENANT_ACCESS_DENIED`
   - Rejects missing headers with 400 `TENANT_CONTEXT_REQUIRED`
   - Attaches `req.tenantContext = { organizationId, role, status }`
```

---

## Contextual Authorization Model

Effective permission model:

**Role + Business Unit + Team + Project**

M1 establishes the foundational tenant roles:
- `platform_admin`: Can perform cross-tenant system administration and organization bootstrap.
- `org_admin`: Full administrative control within their tenant (`organization_id`). Can manage org metadata, branches, business units, departments, teams, memberships.
- `org_member`: Read-only access within their tenant context.

---

## Cross-Tenant Data Isolation Enforcement

To prevent cross-tenant data leakage:
1. Client-supplied organization IDs are NEVER trusted blindly.
2. Every database query for tenant-owned entities enforces `WHERE organization_id = $tenant_id AND id = $resource_id`.
3. If User A attempts to probe a UUID belonging to Organization B using Organization A context, the database query returns no rows and the API responds with `404 NOT_FOUND`, preventing resource existence disclosure.
4. All database mutation operations (`INSERT`, `UPDATE`, `DELETE`) write strictly using resolved server-side tenant context (`req.tenantContext.organizationId`).

---

## Verification Suite

Cross-tenant isolation is verified by automated test suite `tests/tenant-isolation/tenant-isolation.test.ts` covering:
- Single-organization users accessing authorized tenant data.
- Single-organization users blocked from accessing other tenants.
- Resource ID probe rejection with 404 NOT_FOUND.
- Mutation containment to active tenant context.
- Dual-membership users switching active tenant context via `X-Organization-Id` headers.
