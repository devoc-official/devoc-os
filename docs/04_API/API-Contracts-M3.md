# REST API Contracts — Milestone 3

Base path:

`/api/v1/organizations/:orgId`

All endpoints require authentication and organization/tenant context. Cross-tenant resources return 404.

## Assignments

### Create

`POST /assignments`

Creates a scheduled assignment after validating the person, target, authority, dates, and duplicate rules.

### List

`GET /assignments`

Supports tenant-scoped filtering by person, target type/id, assignment type, status, and date range as appropriate.

### Get

`GET /assignments/:assignmentId`

Returns one tenant-scoped assignment.

### Update

`PATCH /assignments/:assignmentId`

Updates non-lifecycle fields only. Lifecycle status is changed through explicit transition endpoints.

### Lifecycle

- `POST /assignments/:assignmentId/activate`
- `POST /assignments/:assignmentId/pause`
- `POST /assignments/:assignmentId/complete`
- `POST /assignments/:assignmentId/cancel`

Each endpoint validates the current state and records history, audit, and the corresponding domain event.

### History

`GET /assignments/:assignmentId/history`

Returns append-only assignment history in chronological order.

### Person assignments

`GET /people/:personId/assignments`

Returns assignments for a tenant-scoped person.

### Target assignments

`GET /assignments?targetType=project&targetId=<uuid>`

Returns assignments for a specific supported target.

## Create request model

Conceptually:

```json
{
  "person_id": "uuid",
  "target_type": "project",
  "target_id": "uuid",
  "assignment_type": "contributor",
  "role_context": "backend_developer",
  "start_at": "2026-08-10T09:00:00Z",
  "end_at": null,
  "capacity_type": "allocation",
  "capacity_value": 20,
  "capacity_unit": "hours_per_week",
  "authority_type": "project_manager",
  "notes": "Backend implementation",
  "metadata": {}
}
```

The exact request/response DTOs must follow the repository's existing API conventions.

## Response envelope

Success uses the established format:

```json
{
  "data": {},
  "meta": {}
}
```

Errors use:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": {},
    "request_id": "..."
  }
}
```

## Validation

The API/service layer must reject:

- unknown people
- people from another tenant
- unknown targets
- targets from another tenant
- unsupported target types
- unauthorized assignment attempts
- invalid date ranges
- invalid lifecycle transitions
- duplicate active assignments
- invalid capacity values

Capacity conflicts produce warnings rather than blocking the assignment in V1.

## Authorization

Authorization is contextual and must use the existing permission architecture. Assignment authority includes platform admin, organization admin, founder, business unit head, department head, project manager, academy head, and team lead as applicable to the target context.

Regular members do not receive broad assignment authority by default.

## Non-goals

M3 APIs do not expose Project, Task, Work, Learning Program, Student, Evaluation, Finance, or Analytics domain operations. They only provide the generic assignment infrastructure.
