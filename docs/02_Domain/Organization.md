# Organization Domain

## Purpose

The Organization Domain defines the tenant-owned organizational structure used throughout DeVoc OS. It provides the stable context for authorization, People, Assignments, Projects, Learning, Work, Finance, and Analytics.

## Core Model

```text
Organization (Tenant)
├── Branch
├── Business Unit
├── Department
└── Team
```

These are configurable organizational objects, not hard-coded DeVoc-specific categories.

---

## Implemented Entities & Specifications (Milestone 1)

### 1. Organization / Tenant
An Organization is the tenant boundary for tenant-owned data.

Rules:
- Every tenant-owned record is scoped to exactly one organization (`organization_id`).
- Organization isolation is mandatory at authentication, authorization, service, repository, and database boundaries.
- A user may belong to multiple organizations through memberships (`organization_memberships`).
- An organization status state machine supports: `active` -> `suspended` -> `archived`.
- Status transitions out of `archived` are invalid and rejected.

### 2. Branch
A Branch represents a physical or operational location.

Rules:
- A branch belongs to one organization.
- Uniqueness constraint: `UNIQUE(organization_id, code)`.
- Status: `active` or `inactive`.

### 3. Business Unit
A Business Unit is a configurable organizational/business area.

Rules:
- A BU belongs to one organization.
- Future BUs must be creatable without changing application code.
- Uniqueness constraint: `UNIQUE(organization_id, code)`.
- Status: `active` or `inactive`.

### 4. Department
A Department is a configurable organizational grouping.

Rules:
- Departments are tenant-scoped.
- Uniqueness constraint: `UNIQUE(organization_id, code)`.
- Status: `active` or `inactive`.

### 5. Team
A Team is a tenant-scoped working group.

Rules:
- Teams support both permanent and temporary usage through the same entity model (`is_temporary: boolean`).
- Optional department (`department_id`) and business unit (`business_unit_id`) associations.
- Uniqueness constraint: `UNIQUE(organization_id, code)`.
- Status: `active` or `inactive`.

---

## Authorization Context & Tenant Resolution

The effective authorization model is:

**Role + Business Unit + Team + Project**

Implemented M1 roles:
- `platform_admin`: System administrator.
- `org_admin`: Full tenant administrative authority.
- `org_member`: Normal tenant member with read-only structure permissions.

Tenant resolution flow:
```text
Authentication → Tenant Resolution → Permission Check → Validation → Domain Service → Business Rules → Database Transaction → Audit → Domain Event → Response
```

---

## Implementation Architecture

- **Specification**: [Milestone 1 Foundation](../01_Implementation/Milestone-01-Foundation.md)
- **Database Schema**: [Database Schema M1](../03_Database/Schema-M1.md)
- **API Contracts**: [API Contracts M1](../04_API/API-Contracts-M1.md)
- **Security & Tenancy**: [Auth & Tenancy Security](../05_Security/Auth-And-Tenancy.md)
- **ADR**: [ADR-005 TypeScript Node Modular Monolith](../10_ADR/ADR-005-TypeScript-Node-Modular-Monolith.md)
