# DeVoc OS — Security & Tenant Isolation Audit

## 1. Scope & Objective

This document details the comprehensive security audit performed on DeVoc OS across the complete modular monolith backend (M1–M15) and Next.js frontend experience layer (F1.2–F6). The audit focused on tenant isolation, contextual authorization, authentication resilience, input validation, polymorphic reference integrity, and secret hygiene.

---

## 2. Multi-Tenant Isolation Architecture

### 2.1 Tenant Resolution Flow
Tenant resolution follows a strict, defense-in-depth pipeline executed prior to any business logic:

```text
Request
  ↓
[Authentication Middleware] → Extracts JWT, verifies signature & expiry, maps user ID
  ↓
[Tenant Resolution Middleware]
  ├── Validates X-Organization-Id header UUID format
  ├── Checks membership: confirms user belongs to requested organization
  ├── Verifies URL organization context (e.g. /organizations/:organizationId)
  └── Enforces strict equality: if both header and path context are present, mismatch returns HTTP 403
  ↓
[Authorization Middleware] → Enforces role and contextual permissions within tenant
  ↓
[Domain Service] → Automatically scopes all queries with WHERE organization_id = $tenantId
```

### 2.2 Attack Surface Testing & Results

| Attack Vector | Test Scenario | Expected Outcome | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Missing Tenant Header** | Request mutation without `X-Organization-Id` | HTTP 400 Bad Request / 401 Unauthorized | HTTP 400 (`Missing or invalid tenant header`) | **VERIFIED** |
| **Malformed Tenant Header** | Non-UUID string passed as `X-Organization-Id` | HTTP 400 Bad Request | HTTP 400 (`Invalid tenant identifier`) | **VERIFIED** |
| **Cross-Tenant ID Substitution** | User in Org A attempts to access Org B resource by UUID | HTTP 403 Forbidden or 404 Not Found | HTTP 403 Forbidden (`TenantAccessDeniedError`) | **VERIFIED** |
| **Header / Path Mismatch** | Org A header passed with Org B path parameter | HTTP 403 Forbidden | HTTP 403 (`Tenant context mismatch`) | **VERIFIED (SEC-P0-01)** |
| **Foreign Key Traversal** | Querying task in Project B using Org A context | HTTP 404 Not Found | Empty set / 404 (query filtered by `organization_id`) | **VERIFIED** |
| **Polymorphic Reference Leak** | Assignment linking to target entity belonging to different tenant | Rejected by validation service | Validation fails: Target not found in tenant | **VERIFIED** |

---

## 3. Authorization & Access Control

### 3.1 Principle of Contextual Authorization
In DeVoc OS:
$$\text{Effective Permission} = \text{Role} + \text{Business Unit} + \text{Team} + \text{Project}$$

A user possessing a global role (e.g. `mentor` or `employee`) cannot mutate resources outside their assigned organizational boundaries.

### 3.2 Endpoint Protection Matrix

| Domain Engine | Endpoint Route | Required Role / Context | Unauthenticated | Wrong Org | Unauthorized Role | Authorized |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization (M1)** | `POST /organizations` | `platform_admin` | 401 | 403 | 403 | 201 |
| **People (M2)** | `POST /people` | `org_admin` | 401 | 403 | 403 | 201 |
| **Finance (M9)** | `POST /finance/obligations` | `org_admin` | 401 | 403 | 403 (SEC-P1-01) | 201 |
| **Finance (M9)** | `GET /finance/obligations` | `org_admin`, `org_member` | 401 | 403 | 403 | 200 |
| **Audit (M10)** | `GET /audit` | `org_admin` | 401 | 403 | 403 (SEC-P1-02) | 200 |
| **Audit (M10)** | `POST /audit/outbox/:id/retry` | `org_admin` | 401 | 403 | 403 (SEC-P1-02) | 200 |
| **Evaluation (M8)** | `POST /evaluations/templates` | `org_admin` | 401 | 403 | 403 (SEC-P1-03) | 201 |
| **Evaluation (M8)** | `POST /evaluations` | `org_admin`, `org_member` | 401 | 403 | 403 | 201 |
| **Learning (M7)** | `POST /learning/programs` | `org_admin` | 401 | 403 | 403 (SEC-P2-01) | 201 |
| **Work (M5)** | `POST /work` | `org_admin`, `org_member` | 401 | 403 | 403 | 201 |

---

## 4. Authentication & Session Resilience

### 4.1 Token Handling
- Authentication utilizes stateless cryptographic JSON Web Tokens (JWT).
- Access tokens contain minimal required claims (`userId`, `email`, standard `exp`/`iat`).
- Tokens are verified cryptographically; tampering with signature or claims results in immediate HTTP 401 rejection.
- Expired tokens cannot be refreshed without valid re-authentication.

### 4.2 Client-Side Security Hygiene
- **Zero Client Authority**: Frontend state, local storage, URL route parameters, and client role cookies are treated as untrusted rendering hints. The backend independently validates token identity, organization membership, and role permissions on every API request.
- **Hidden UI is Not Security**: Navigation route guards on the frontend provide responsive UX. If a user manually circumvents the UI or navigates to `/admin` without permissions, the backend rejects API requests with HTTP 403.

---

## 5. Input Validation & Injection Mitigation

### 5.1 Strong Schema Validation
- All API inputs are strictly validated at the controller boundary using Zod schemas.
- Invalid payload schemas (missing required properties, out-of-range numeric fields, invalid enum values, negative currency amounts) are rejected with HTTP 400 and structured validation detail objects.

### 5.2 SQL Injection Prevention
- All database queries across all 15 modules utilize parameterized query arguments (`$1, $2, ...`).
- Dynamic SQL string concatenation is strictly prohibited in the codebase.
- In-memory database test double mirrors PostgreSQL parameterized semantics to ensure tests exercise actual parameter binding behavior.

---

## 6. Secret & Configuration Hygiene

- **Repository Cleanliness**: Scanned entire repository for sensitive keys, database passwords, JWT private secrets, and third-party tokens. Zero production secrets exist in source code.
- **Environment Separation**: Configuration is driven by environment variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`). Default development fallbacks are restricted to non-production environments.
- **Next.js Bundle Sanitization**: Audited frontend bundle builds; no server secrets or database connection strings are exposed to client JavaScript bundles. Only public environment variables prefixed with `NEXT_PUBLIC_` are exposed.
