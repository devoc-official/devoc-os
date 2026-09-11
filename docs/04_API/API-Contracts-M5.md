# REST API Architecture & Contracts — M5 Work Engine

Base path:

`/api/v1/organizations/:orgId`

## Work Records

### POST `/work`

Create a work record.

Request fields:

- person_id
- target_type nullable
- target_id nullable
- assignment_id nullable
- category_id
- title
- description nullable
- started_at nullable
- ended_at nullable
- duration_minutes
- metadata nullable

### GET `/work`

List work records. Supported filters include:

- person_id
- target_type
- target_id
- assignment_id
- category_id
- status
- started_from
- started_to

### GET `/work/:workId`

Return a single work record.

### PATCH `/work/:workId`

Update mutable draft work fields subject to authorization and lifecycle rules.

### POST `/work/:workId/submit`

Transition draft → submitted.

### POST `/work/:workId/approve`

Transition submitted → approved. Requires appropriate contextual authority.

### POST `/work/:workId/reject`

Transition submitted → rejected. Requires appropriate contextual authority.

### POST `/work/:workId/cancel`

Transition draft/submitted → cancelled according to authorization rules.

## Evidence

### POST `/work/:workId/evidence`

Add evidence to a work record.

### GET `/work/:workId/evidence`

List evidence for a work record.

### DELETE `/work/:workId/evidence/:evidenceId`

Remove evidence only when permitted by the work lifecycle and authorization policy; historical approved evidence should not be silently destroyed.

## Outcomes

### POST `/outcomes`

Create an organization-scoped outcome.

### GET `/outcomes`

List outcomes with optional filters.

### GET `/outcomes/:outcomeId`

Get an outcome.

### POST `/work/:workId/outcomes`

Associate an existing outcome with work.

### GET `/work/:workId/outcomes`

List outcomes associated with work.

### DELETE `/work/:workId/outcomes/:outcomeId`

Remove a work/outcome association when authorized.

## Work Categories

### POST `/work-categories`

Create a category.

### GET `/work-categories`

List active/configured categories.

### PATCH `/work-categories/:categoryId`

Update category metadata/status subject to authorization.

## Response contract

Success:

```json
{"data": {}, "meta": {}}
```

Error:

```json
{"error":{"code":"...","message":"...","details":...,"request_id":"..."}}
```

## Validation

- `orgId` must match authenticated tenant context.
- Person/category/assignment/target/outcome/evidence must belong to the same organization.
- Target type and target ID are both present or both absent.
- Target must resolve through the M5 target registry.
- Assignment, when supplied, must belong to the work person and organization and be context-compatible.
- Duration must be positive and timestamps valid.
- Invalid lifecycle actions return the established validation/conflict error format.

## Authorization

Reuse the existing authentication and permission framework. Work ownership does not automatically grant administrative authority. Ordinary people can record their own work; approval and administrative mutations require contextual authority.

## Tenant isolation

Cross-tenant requests must fail using the established non-leaking not-found behavior. Tests must cover work, evidence, outcomes, categories, targets, and assignment references across tenants.

## Events and audit

Lifecycle and material mutations must emit the corresponding in-process domain events and audit entries through the existing platform mechanisms.
