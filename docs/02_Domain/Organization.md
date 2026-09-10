# Organization Domain

## Purpose

The Organization Domain defines the tenant-owned organizational structure used throughout DeVoc OS. It provides the stable context for authorization, People, Assignments, Projects, Learning, Work, Finance, and Analytics.

## Core model

```text
Organization (Tenant)
├── Branch
├── Business Unit
├── Department
└── Team
```

These are configurable organizational objects, not hard-coded DeVoc-specific categories.

## Organization / Tenant

An Organization is the tenant boundary for tenant-owned data.

Rules:

- Every tenant-owned record is scoped to exactly one organization unless a documented exception exists.
- Organization isolation is mandatory at authentication, authorization, service, repository, and database boundaries.
- A user may belong to multiple organizations through memberships.
- An organization may be Active, Suspended, or Archived.
- Organization deletion is not part of the initial implementation.

## Branch

A Branch represents a physical or operational location.

Rules:

- A branch belongs to one organization.
- A branch does not imply that every Business Unit exists at that location.
- Branches are configurable and tenant-scoped.

## Business Unit

A Business Unit is a configurable organizational/business area.

Rules:

- A BU belongs to one organization.
- Future BUs must be creatable without changing application code.
- A BU can later have a Head, Budget, KPIs, and Team through other domains/modules.
- A project may belong to multiple BUs in the Project domain.

Examples for DeVoc include Academy, IT Solutions, Labs, Platform, Analytics, Finance, HR, Learning, and Projects, but these are product configuration rather than schema-level assumptions.

## Department

A Department is a configurable organizational grouping.

Rules:

- Departments are tenant-scoped.
- Departments are optional within an organization's structure.
- Future departments such as Sales, Marketing, and Finance must be possible without architectural changes.

## Team

A Team is a tenant-scoped working group.

Teams support both permanent and temporary usage through the same entity model.

Team membership and person-to-team assignments belong to the People/Assignment architecture; the Organization domain should not duplicate the generic Assignment Engine.

## Authorization context

The effective authorization model is:

**Role + Business Unit + Team + Project**

Project context is supplied by the Project domain. Organization provides the organizational context used by permission policies.

A global `is_admin` flag is not the authorization architecture.

## Tenant resolution

Tenant resolution must occur before authorization and domain logic.

```text
Authentication
→ Tenant Resolution
→ Permission Check
→ Validation
→ Domain Service
→ Business Rules
→ Database Transaction
→ Audit
→ Domain Event
→ Response
```

Client-supplied organization IDs must never be trusted as proof of tenant access.

## M1 implementation scope

Milestone 1 implements the foundational Organization Engine resources:

- Organization
- Organization Membership
- Branch
- Business Unit
- Department
- Team

It also establishes the tenant-isolation, authentication, authorization, migration, audit, and API conventions required by later domains.

See [Milestone 1 implementation specification](../01_Implementation/Milestone-01-Foundation.md).

## Future extensions

The Organization Domain is intentionally designed to support:

- Multiple branches per organization.
- Different BUs across different branches.
- Department hierarchies/configuration.
- Permanent and temporary teams.
- BU Heads.
- Budgets and KPIs.
- Contextual permissions.
- Project-to-multiple-BU relationships.
- Additional organizational objects without changing the tenant model.
