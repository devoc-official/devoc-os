# Milestone 1 — Project Foundation, Database, Authentication & Multi-Tenant Organization

**Status:** Ready for implementation  
**Milestone:** M1  
**Scope:** Foundation → Database → Authentication → Tenant Resolution → Organization Engine  
**Primary goal:** Establish the production-grade application foundation and the minimum organization/tenant model required by every later domain.

---

## 1. Purpose

Milestone 1 creates the executable foundation of DeVoc OS. It must establish:

1. A maintainable modular-monolith project structure.
2. Environment/configuration management.
3. PostgreSQL database connectivity and migrations.
4. Authentication and authenticated user identity.
5. Multi-tenant organization resolution and isolation.
6. The initial Organization Engine: Organization, Branch, Business Unit, Department, and Team.
7. Foundational permission/context handling sufficient to protect M1 operations.
8. Consistent API, validation, error, transaction, audit, and test conventions.
9. Developer documentation and automated validation so later milestones can build on a stable contract.

M1 is intentionally foundational. It must not implement People, Assignments, Projects, Learning, Finance, or Analytics beyond the minimal references/interfaces required to establish clean boundaries.

---

## 2. Architectural Constraints

The implementation MUST follow these established decisions:

- Multi-tenant architecture is mandatory.
- PostgreSQL is the V1 transactional database.
- UUIDs are the default identifier strategy.
- V1 API style is REST under `/api/v1/`.
- V1 is a modular monolith; do not introduce microservices.
- Domain/application services own business logic.
- Controllers/routes remain thin.
- Tenant resolution occurs before authorization and business logic.
- Tenant-owned records are isolated by `organization_id`.
- Authentication and authorization are separate concerns.
- Effective authorization is contextual: Role + Business Unit + Team + Project.
- Important state changes are explicit and validated.
- Auditability is a first-class concern.
- Secrets must remain outside source control.
- Tests must cover tenant isolation and authorization.

Relevant source documents:

- `AGENTS.md`
- `docs/Architecture-Index.md`
- `docs/10_ADR/ADR-001-Multi-Tenant.md`
- `docs/10_ADR/ADR-002-Organization-Model.md`
- `docs/02_Domain/Organization.md`
- `docs/02_Domain/People.md`

If implementation discovers a conflict with these documents, stop and follow the Architecture Conflict Protocol in `AGENTS.md`; do not silently redesign the system.

---

## 3. Non-Goals

Do NOT implement in M1:

- Full People/Employment domain.
- Generic Assignment Engine.
- Project/Task domains.
- Work Logs or Meetings.
- Learning journeys or reviews.
- Evaluation.
- Finance.
- Analytics dashboards.
- Complex enterprise SSO unless already required by the selected authentication foundation.
- Distributed services/event bus.
- Premature caching infrastructure.
- Generic workflow engines.
- Full admin UI if the repository does not yet have a UI foundation; API/domain correctness takes priority.

M1 may create extension points for these areas but must not prematurely implement them.

---

## 4. Target Repository Structure

Preserve the modular-monolith direction. The exact framework-specific files may differ, but the logical boundaries should be equivalent to:

```text
src/
  modules/
    organization/
  auth/
  permissions/
  audit/
  events/
  database/
  shared/

migrations/                 # or framework-equivalent migration location
tests/
docs/
.env.example
```

The implementation should establish the top-level conventions needed for future modules without creating empty, speculative business logic in every future module.

---

## 5. Configuration & Environment

Create a typed/validated application configuration layer.

At minimum support configuration for:

- Application environment.
- Application host/port where applicable.
- PostgreSQL connection.
- Authentication secrets/keys through environment variables.
- Allowed origins/CORS where applicable.
- Logging level.

Requirements:

- `.env.example` contains variable names and safe example values only.
- Real secrets are never committed.
- Application startup must fail clearly when required configuration is invalid or missing.
- Production configuration must not depend on development defaults for secrets.
- Configuration must be consumed through the configuration layer rather than reading environment variables throughout business code.

---

## 6. Database Foundation

### 6.1 Database

Use PostgreSQL.

Create a migration system and establish a repeatable workflow for:

- Creating migrations.
- Applying migrations.
- Rolling back where supported by the selected framework.
- Running migrations in CI/test environments.
- Resetting/rebuilding a development database safely.

### 6.2 Common database conventions

Unless a documented domain exception exists:

- UUID primary keys.
- UTC timestamps.
- Explicit foreign keys for relational integrity.
- `created_at` and `updated_at` on mutable operational entities.
- `organization_id` on tenant-owned entities.
- Appropriate uniqueness constraints.
- Explicit indexes based on access patterns.

Do not add `deleted_at` to every table automatically.

### 6.3 Initial tables

M1 should establish the following transactional entities.

#### organizations

Suggested fields:

- `id` UUID PK
- `name` string, required
- `slug` string, required, tenant-unique
- `status` enum/status, required
- `created_at`
- `updated_at`

Recommended initial organization status:

- `active`
- `suspended`
- `archived`

Only explicitly valid transitions are allowed.

#### users / authenticated identities

The exact authentication table shape depends on the selected auth implementation, but the model must support:

- Stable UUID identity.
- Login identifier/email as appropriate.
- Secure password credential representation if password authentication is used.
- Active/inactive state.
- Created/updated timestamps.

Do not duplicate the future `Person` domain into the authentication table. Authentication identity and Person are separate concepts.

#### organization_memberships

This is the minimum bridge between an authenticated user and a tenant.

Suggested fields:

- `id` UUID PK
- `organization_id` FK
- `user_id` FK
- `status`
- membership role/reference needed for M1 authorization
- `created_at`
- `updated_at`

A user may belong to multiple organizations in the platform.

A membership must never allow access to an organization other than its own `organization_id`.

#### branches

Suggested fields:

- `id` UUID PK
- `organization_id` FK
- `name`
- `code` or tenant-local identifier where useful
- `status`
- `created_at`
- `updated_at`

A branch is a physical or operational location. A branch does not imply that every Business Unit exists there.

#### business_units

Suggested fields:

- `id` UUID PK
- `organization_id` FK
- `name`
- `code` or tenant-local identifier where useful
- `status`
- optional `branch_id` only if the finalized Organization architecture requires a direct branch relationship
- `created_at`
- `updated_at`

Do not hard-code DeVoc's current BUs into database schema or application logic.

#### departments

Suggested fields:

- `id` UUID PK
- `organization_id` FK
- `name`
- `code` or tenant-local identifier where useful
- `status`
- organizational parent/reference as finalized by the Organization domain
- `created_at`
- `updated_at`

Departments must be configurable for future units such as Sales, Marketing, and Finance.

#### teams

Suggested fields:

- `id` UUID PK
- `organization_id` FK
- `name`
- `code` or tenant-local identifier where useful
- `status`
- relevant organizational parent references
- `created_at`
- `updated_at`

Teams must support both permanent and temporary team usage. Do not encode a permanent/temporary team as separate table types.

### 6.4 Tenant-safe constraints and indexes

At minimum evaluate indexes for:

- `organization_id` on every tenant-owned table.
- Membership lookup by `(user_id, organization_id)`.
- Tenant-local unique organization slug.
- Tenant-local lookup of organization objects by code/name where product rules require uniqueness.
- Common foreign keys.
- Status fields only where operational query patterns justify an index.

Do not create speculative indexes.

Where a uniqueness rule is tenant-local, enforce it at the database level using the tenant key (for example, `(organization_id, code)`).

---

## 7. Authentication

Implement a secure authentication foundation using an established, maintained authentication/cryptography library appropriate to the selected backend framework.

### Required capabilities

- Login/authentication.
- Secure credential verification if password authentication is selected.
- Authenticated identity retrieval.
- Logout/session or token invalidation behavior appropriate to the chosen auth model.
- Current-user endpoint such as `GET /api/v1/auth/me`.
- Authentication middleware/guard.

### Rules

- Never implement custom password hashing/cryptography.
- Never store plaintext passwords.
- Never log passwords, access tokens, refresh tokens, or secrets.
- Authentication credentials must not contain tenant authorization decisions.
- A valid authenticated user is not automatically authorized for every organization.
- Organization membership must be resolved separately.

The exact token/session strategy may be selected during implementation only if it does not conflict with existing architecture. If a foundational choice materially changes security architecture, document it as an ADR before proceeding.

---

## 8. Tenant Resolution

Tenant resolution is mandatory for every tenant-scoped request.

Recommended flow:

```text
Request
  ↓
Authentication
  ↓
Tenant Resolution
  ↓
Permission Check
  ↓
Validation
  ↓
Domain Service
  ↓
Business Rules
  ↓
DB Transaction
  ↓
Audit / Event
  ↓
Response
```

### Requirements

- The active organization context must be derived from trusted server-side context and/or a validated tenant-selection mechanism.
- A client-supplied `organization_id` must never be trusted as proof of access.
- If the user belongs to multiple organizations, the active organization must be selected through an explicit, validated mechanism.
- Every tenant-scoped repository/service operation must require organization context or be structurally incapable of bypassing it.
- Cross-tenant object IDs must not resolve successfully.
- Missing tenant context must fail before domain logic executes.
- Invalid/inaccessible tenant context must not leak whether another tenant's object exists.

### Tenant isolation acceptance rule

Given two organizations A and B:

- User authorized in A can access A's tenant-owned records.
- The same user cannot access B unless explicitly authorized through a B membership.
- A valid object UUID from B must not return B data to an A-scoped request.
- Create/update/delete operations must always write using the resolved tenant context rather than a client-provided tenant ID.

---

## 9. Authorization & M1 Permissions

M1 establishes the authorization foundation, not the complete permission matrix for every future domain.

### Context model

The system must be designed around:

**Role + Business Unit + Team + Project**

Project context will be added by later milestones. M1 must not replace this model with a global `is_admin` architecture.

### M1 minimum authorization roles

Implement the smallest role model necessary to operate the organization foundation. It must support at least the concept of:

- Platform-level administrator.
- Organization administrator/owner.
- Organization member/user.

Names may differ if the chosen authorization implementation uses a role/permission model, but the semantic capabilities must exist.

### Minimum capabilities

An authorized organization administrator should be able to:

- Read organization details.
- Update allowed organization settings.
- Create/read/update branches.
- Create/read/update business units.
- Create/read/update departments.
- Create/read/update teams.
- Manage organization membership as defined by M1.

A normal organization member should have read access only where explicitly granted.

Platform-level operations must be rare and clearly separated from tenant operations.

Do not use a single global `is_admin` boolean as the authorization architecture.

---

## 10. Organization Engine

M1 implements the first complete slice of the Organization Engine.

### Organization

Capabilities:

- Create organization through a controlled onboarding/bootstrap path.
- Read organization.
- Update organization metadata.
- Suspend/archive according to valid state transitions and authorization.

Rules:

- Organization slug is unique according to the platform's tenant uniqueness rule.
- Archived/suspended organizations cannot perform ordinary active operations unless an explicit recovery/admin operation permits it.
- Organization deletion is not part of M1.

### Branch

Capabilities:

- Create.
- List.
- Read.
- Update.
- Activate/deactivate according to explicit transitions.

Rules:

- Branch belongs to exactly one organization.
- Branch names/codes must respect tenant-local uniqueness rules where configured.
- A branch does not automatically contain every BU.

### Business Unit

Capabilities:

- Create.
- List.
- Read.
- Update.
- Activate/deactivate.

Rules:

- BU belongs to exactly one organization.
- BUs are configuration/data, not code-level enum assumptions.
- Future BUs can be created without code changes.
- A BU may later have Head, Budget, KPIs, and Team; M1 may create extension-safe structure but must not implement the later business modules.

### Department

Capabilities:

- Create.
- List.
- Read.
- Update.
- Activate/deactivate.

Rules:

- Department belongs to exactly one organization.
- Department structure must remain extensible.

### Team

Capabilities:

- Create.
- List.
- Read.
- Update.
- Activate/deactivate.

Rules:

- Team belongs to exactly one organization.
- Permanent and temporary teams use the same entity model.
- Team membership assignment belongs to the later People/Assignment architecture unless M1 requires a minimal membership bridge for authorization; do not duplicate the Assignment Engine.

---

## 11. API Contract

All V1 endpoints live under `/api/v1/`.

Use the standard success envelope:

```json
{
  "data": {},
  "meta": {}
}
```

Use a consistent error envelope containing at minimum:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message",
    "details": {},
    "request_id": "..."
  }
}
```

`details` may be omitted when not applicable.

### Authentication endpoints

At minimum:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

If the selected authentication approach requires additional endpoints, document them without changing the core API conventions.

### Tenant/organization context

Provide a secure mechanism for selecting/listing organizations available to the authenticated identity where multi-membership exists.

A possible shape is:

- `GET /api/v1/organizations`
- `GET /api/v1/organizations/:organizationId`

If active tenant context is represented through a request header, session, or another mechanism, document that contract explicitly and ensure it cannot bypass membership authorization.

### Organization resources

Recommended REST resources:

- `/api/v1/branches`
- `/api/v1/business-units`
- `/api/v1/departments`
- `/api/v1/teams`
- `/api/v1/memberships`

Tenant context should normally come from the resolved request context rather than from the URL alone.

If organization IDs appear in URLs for navigation, authorization must still be checked against resolved tenant context.

### API validation

Validate:

- Required fields.
- String length/format.
- UUID format.
- Enum/status values.
- Uniqueness constraints.
- Relationship ownership.
- State transitions.

Never accept arbitrary status changes without a transition rule.

---

## 12. Domain Services & Persistence Boundaries

Use thin controllers/routes and domain/application services.

A logical organization module may contain:

```text
organization/
  domain/
  application/
  infrastructure/
  api/
```

Exact framework structure may vary.

### Rules

- API layer maps requests/responses.
- Application/domain services enforce business rules.
- Repositories/data-access code enforces tenant scoping structurally.
- Controllers must not construct complex multi-step workflows.
- Cross-domain imports should be minimized.
- Shared utilities must not become a dumping ground for business logic.

---

## 13. Transactions

Use database transactions for operations that modify multiple related records or where atomicity is a business requirement.

Examples:

- Organization bootstrap + initial membership.
- Membership changes that require multiple writes.
- State transitions with audit records where atomic persistence is required.

A failed transaction must not leave partial organization state.

---

## 14. Audit Foundation

M1 should establish the reusable audit mechanism even if the complete Audit Engine is delivered later.

At minimum, important M1 actions should be capable of recording:

- Actor/user ID.
- Organization ID where applicable.
- Action.
- Entity type.
- Entity ID.
- Timestamp.
- Request/correlation ID where available.
- Before/after values where appropriate and safe.

Recommended initial audited actions:

- Organization created/updated/status changed.
- Membership created/changed/removed.
- Branch created/updated/status changed.
- Business Unit created/updated/status changed.
- Department created/updated/status changed.
- Team created/updated/status changed.

Audit records must themselves respect tenant isolation, except for explicitly authorized platform-level audit records.

Do not build the full future analytics/event infrastructure in M1.

---

## 15. Domain Events Foundation

Establish a small internal domain-event abstraction only where it improves future extensibility.

Candidate events:

- `OrganizationCreated`
- `OrganizationUpdated`
- `OrganizationStatusChanged`
- `MembershipCreated`
- `MembershipChanged`
- `BranchCreated`
- `BusinessUnitCreated`
- `DepartmentCreated`
- `TeamCreated`

Events should remain in-process for V1 unless an existing architecture explicitly requires asynchronous infrastructure.

Do not introduce Kafka, RabbitMQ, or another distributed broker in M1.

If reliable asynchronous delivery later becomes necessary, use a transactional/outbox approach and an ADR.

---

## 16. Observability & Error Handling

Establish foundational structured logging/error handling.

Requirements:

- Generate or propagate a request/correlation ID.
- Include request ID in API errors where possible.
- Never log secrets or credentials.
- Avoid logging unnecessary personal data.
- Log authorization failures at an appropriate level without exposing tenant data.
- Distinguish validation, authentication, authorization, not-found, conflict, and internal errors.
- Do not leak stack traces or internal database details in production responses.

Recommended error categories:

- `VALIDATION_ERROR`
- `AUTHENTICATION_REQUIRED`
- `INVALID_CREDENTIALS`
- `FORBIDDEN`
- `TENANT_CONTEXT_REQUIRED`
- `TENANT_ACCESS_DENIED`
- `NOT_FOUND`
- `CONFLICT`
- `INVALID_STATE_TRANSITION`
- `INTERNAL_ERROR`

Exact naming can be adjusted to the framework conventions but should remain consistent.

---

## 17. Health & Readiness

Add minimal operational endpoints appropriate to the deployment model, such as:

- Liveness/health endpoint.
- Readiness endpoint that verifies required infrastructure such as PostgreSQL connectivity.

Health endpoints must not expose secrets, credentials, or sensitive configuration.

---

## 18. Testing Specification

Testing is part of M1, not a later task.

### Unit tests

Cover:

- Organization state transitions.
- Tenant context validation.
- Organization/branch/BU/department/team business rules.
- Authorization policy decisions.
- Validation rules.

### Integration tests

Cover:

- Database migrations.
- Repository tenant scoping.
- Authenticated request flow.
- Organization creation and membership.
- Organization resource CRUD.
- Transaction rollback behavior where relevant.

### Critical tenant-isolation tests

Create at least two organizations:

```text
Organization A
Organization B
```

Create equivalent resources in both.

Verify:

1. A user authorized for A can read A.
2. A user authorized for A cannot read B.
3. B object IDs cannot be used to retrieve B data from an A-scoped request.
4. A create operation cannot force data into B using a client-supplied `organization_id`.
5. Update/delete operations cannot cross tenant boundaries.
6. A user without membership cannot select/access the organization.
7. A user with memberships in A and B can access only the currently selected authorized context.

### Authentication tests

Verify:

- Invalid credentials fail.
- Inactive identity cannot authenticate/use protected APIs.
- Protected endpoints reject unauthenticated requests.
- Logout/session invalidation behaves as designed.
- Credentials/tokens are never returned in logs.

### Authorization tests

Verify both allowed and denied cases for each M1 resource.

Do not rely solely on frontend restrictions.

### API contract tests

Verify:

- Success envelope.
- Error envelope.
- Validation responses.
- Correct HTTP status semantics.
- UUID validation.
- Request ID behavior.

---

## 19. Seed / Bootstrap Requirements

Provide a safe development/test bootstrap mechanism.

It may create:

- One development organization.
- One initial organization administrator.
- Minimal example branch/BU/department/team data where useful.

Rules:

- Seed data must never contain real credentials or secrets.
- Production deployment must not accidentally run destructive development seed logic.
- Bootstrap/onboarding logic must be idempotent where practical.
- Test fixtures must not contain real personal data.

---

## 20. Documentation Deliverables

During implementation, update/create documentation as behavior becomes established.

At minimum M1 should result in:

- This implementation specification.
- Updated Organization domain documentation.
- Authentication/authorization documentation.
- Database architecture documentation covering the M1 schema.
- API architecture/contracts covering M1 endpoints.
- Testing strategy/coverage notes where appropriate.
- ADRs for any genuinely new foundational architectural decisions.
- Architecture Index links to newly created documents.

Do not duplicate these technical documents into Notion.

---

## 21. Definition of Done

M1 is complete only when all applicable items below are satisfied.

### Foundation

- [ ] Application starts from a clean environment using documented setup.
- [ ] Configuration is validated.
- [ ] `.env.example` exists and contains no real secrets.
- [ ] Project structure follows modular-monolith boundaries.
- [ ] Health/readiness behavior exists.

### Database

- [ ] PostgreSQL connection works.
- [ ] Initial migrations are committed.
- [ ] UUID strategy is implemented.
- [ ] Foreign keys and tenant constraints are present.
- [ ] Required indexes are present and justified.
- [ ] Migration workflow works in CI/test environments.

### Authentication

- [ ] Secure authentication works.
- [ ] Passwords/credentials are securely handled.
- [ ] Protected endpoints require authentication.
- [ ] Current-user endpoint works.
- [ ] Logout/session invalidation works as designed.

### Multi-tenancy

- [ ] Tenant context is resolved before authorization/domain logic.
- [ ] Tenant-owned queries are scoped.
- [ ] Cross-tenant reads fail.
- [ ] Cross-tenant writes fail.
- [ ] Client-provided organization IDs cannot bypass tenant context.
- [ ] Multi-organization membership is supported by the model.

### Organization

- [ ] Organization CRUD/state handling works.
- [ ] Branch CRUD works.
- [ ] Business Unit CRUD works.
- [ ] Department CRUD works.
- [ ] Team CRUD works.
- [ ] Future BUs/departments/teams can be created without code changes.
- [ ] Permanent and temporary team concepts do not require separate table types.

### Authorization

- [ ] M1 role/permission foundation exists.
- [ ] Organization administrator actions are protected.
- [ ] Normal member access is restricted appropriately.
- [ ] Platform-level operations are explicitly separated.
- [ ] No global `is_admin` shortcut is used as the architecture.

### Audit/events

- [ ] Important M1 mutations are auditable.
- [ ] Audit records are tenant-safe.
- [ ] Internal domain events are emitted where appropriate.
- [ ] No distributed event infrastructure is introduced prematurely.

### API

- [ ] REST API is under `/api/v1/`.
- [ ] Success/error envelopes are consistent.
- [ ] Validation is server-side.
- [ ] Invalid state transitions are rejected.
- [ ] Request/correlation IDs are handled appropriately.

### Tests

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Tenant-isolation tests pass.
- [ ] Authorization tests pass.
- [ ] Authentication tests pass.
- [ ] Database migration tests pass.
- [ ] API contract/validation tests pass.

### Documentation

- [ ] Relevant architecture/domain/API/database docs are updated.
- [ ] Any new foundational architectural decision has an ADR.
- [ ] Architecture Index is updated.
- [ ] README/setup instructions are accurate.

### Security

- [ ] No secrets committed.
- [ ] No plaintext passwords.
- [ ] No sensitive credentials in fixtures.
- [ ] Production error responses do not expose internals.
- [ ] Tenant isolation is enforced server-side.

---

## 22. Implementation Order

Implement in this order unless a framework constraint requires a small variation:

1. Inspect repository and existing ADR/domain docs.
2. Establish application project/runtime structure.
3. Establish configuration and environment validation.
4. Establish PostgreSQL connection and migration framework.
5. Establish common UUID/time/error/request-context conventions.
6. Implement authentication identity foundation.
7. Implement organization/membership schema.
8. Implement authentication middleware/guards.
9. Implement tenant resolution.
10. Implement M1 authorization/policy foundation.
11. Implement Organization Engine entities and services.
12. Implement organization APIs.
13. Implement audit foundation.
14. Implement internal event foundation where justified.
15. Add health/readiness and observability foundations.
16. Add unit/integration/tenant-isolation/authorization tests.
17. Update engineering documentation.
18. Run the full M1 validation suite.
19. Review for architectural conflicts before declaring M1 complete.

---

## 23. Expected AI Coding Agent Output

When implementing M1, the AI coding agent should report:

- What was implemented.
- Files/modules created or changed.
- Database migrations created/applied.
- API endpoints added.
- Authentication/tenant model used.
- Authorization model implemented.
- Tests added and test results.
- Documentation updated.
- Any new ADRs created.
- Any unresolved issue or architecture conflict.

The agent must not silently defer required tenant isolation, authorization, testing, migrations, or documentation.

---

## 24. Completion Gate for Milestone 2

Do not start substantive People Engine implementation until M1 has a stable foundation for:

- authenticated user identity,
- organization/tenant context,
- organization membership,
- organization structure,
- authorization boundaries,
- database migrations,
- API conventions,
- audit conventions,
- test conventions.

People Engine will build on these foundations and should not duplicate them.
