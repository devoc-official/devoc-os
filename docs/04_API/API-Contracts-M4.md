# REST API Architecture & Contracts — M4

## Base

All endpoints are tenant-scoped and use `/api/v1`. Existing authentication, tenant resolution, response envelopes, error format, authorization, audit, and request IDs remain authoritative.

## Projects

Base:

`/api/v1/organizations/:orgId/projects`

Endpoints:

- `POST /projects` — create project
- `GET /projects` — list/filter projects
- `GET /projects/:projectId` — retrieve project
- `PATCH /projects/:projectId` — update non-lifecycle project fields
- `GET /projects/:projectId/owners` — list owners
- `POST /projects/:projectId/owners` — add owner
- `PATCH /projects/:projectId/owners/:ownerId` — update ownership relationship
- `DELETE /projects/:projectId/owners/:ownerId` — end/remove owner relationship where permitted
- `GET /projects/:projectId/business-units` — list linked Business Units
- `POST /projects/:projectId/business-units/:businessUnitId` — link Business Unit
- `DELETE /projects/:projectId/business-units/:businessUnitId` — unlink Business Unit where permitted
- `GET /projects/:projectId/tasks` — list project tasks
- `GET /projects/:projectId/assignments` — list assignments targeting project

Lifecycle endpoints:

- `POST /projects/:projectId/research`
- `POST /projects/:projectId/plan`
- `POST /projects/:projectId/develop`
- `POST /projects/:projectId/test`
- `POST /projects/:projectId/beta`
- `POST /projects/:projectId/release`
- `POST /projects/:projectId/maintenance`
- `POST /projects/:projectId/archive`

Rollback operations should use explicit transition endpoints rather than arbitrary status PATCH. The implementation may expose a single validated transition endpoint if it preserves the same domain rules and API contract clarity.

## Tasks

Base:

`/api/v1/organizations/:orgId/tasks`

Endpoints:

- `POST /tasks` — create task
- `GET /tasks` — list/filter tasks
- `GET /tasks/:taskId` — retrieve task
- `PATCH /tasks/:taskId` — update non-lifecycle task fields
- `GET /tasks/:taskId/children` — list child tasks
- `GET /tasks/:taskId/dependencies` — list dependencies
- `POST /tasks/:taskId/dependencies` — create dependency
- `DELETE /tasks/:taskId/dependencies/:dependencyId` — remove dependency where permitted
- `GET /tasks/:taskId/assignments` — list assignments targeting task

Lifecycle endpoints:

- `POST /tasks/:taskId/todo`
- `POST /tasks/:taskId/start`
- `POST /tasks/:taskId/review`
- `POST /tasks/:taskId/test`
- `POST /tasks/:taskId/block`
- `POST /tasks/:taskId/changes-requested`
- `POST /tasks/:taskId/done`
- `POST /tasks/:taskId/cancel`

The implementation may instead expose a single validated transition endpoint, but arbitrary status mutation is prohibited.

## Filtering

Project list may support:

- status
- priority
- projectType
- businessUnitId

Task list may support:

- projectId
- parentTaskId
- status
- priority
- taskType
- assignee/assignment target through Assignment integration

## Request/response rules

Success envelope:

```json
{"data": {}, "meta": {}}
```

Error envelope:

```json
{"error":{"code":"...","message":"...","details":...,"request_id":"..."}}
```

Cross-tenant or nonexistent project/task/BU/person resources return 404 at the API boundary.

## Validation

- Project key is unique within an organization.
- Task key is unique within a project.
- Dates are valid and ordered.
- Project and task organization IDs cannot be changed.
- Task project cannot be changed through ordinary PATCH in M4.
- Parent task must belong to the same project and organization.
- Dependencies cannot be self-referential or circular.
- Owners and Business Units must belong to the same organization.
- Lifecycle transitions must follow the domain state machine.

## Assignment integration

M4 does not create assignment endpoints. Existing M3 Assignment APIs remain authoritative. Project and Task are registered as assignable target types and assignment queries can be filtered by target type/id.

## Authorization

Existing role + Business Unit + Team + Project contextual authorization is reused. Controllers remain thin; authorization and domain rules live in the application/domain services.
