# Milestone 04 — Projects & Tasks Engine

## Status

Architecture approved. Implementation pending.

## Objective

Implement the Project and Task domains on top of the existing Organization, People, and Generic Assignment Engines.

M4 establishes the business initiative/work structure. Assignments remain the single source of truth for contextual responsibility and team membership.

## Architectural principle

- Project = initiative/outcome
- Task = actionable work
- Assignment = contextual responsibility
- Person = identity

Do not create `project_members`, `task_assignees`, or parallel membership/assignment systems.

## Scope

### Project

- Tenant-scoped project entity
- Project key
- Description and metadata
- Configurable project type
- Priority
- Lifecycle
- Many-to-many Business Unit relationship
- Multiple project owners through an ownership relationship
- Project Manager/team participation through Assignment Engine
- Project target resolver registration with Assignment Engine

### Task

- Tenant-scoped task entity
- Project relationship
- Parent task hierarchy
- Task key
- Task type
- Description and metadata
- Priority
- Lifecycle
- Start/due/completion timestamps
- Task dependencies
- Task target resolver registration with Assignment Engine

### Security and infrastructure

- Tenant isolation
- Authorization using existing permission architecture
- Explicit lifecycle operations
- Audit/history consistent with existing architecture
- In-process domain events
- PostgreSQL migrations
- REST APIs under `/api/v1`
- Unit, API, authorization, tenant, lifecycle, and integration tests

## Project lifecycle

Canonical lifecycle:

`idea → research → planning → development → testing → beta → released → maintenance → archived`

Controlled rollback transitions:

- testing → development
- beta → development
- maintenance → development

Archived is terminal. Project status must not be changed through arbitrary field PATCH operations.

## Task lifecycle

Primary workflow:

`backlog → todo → in_progress → in_review → testing → done`

Additional states:

- blocked
- changes_requested
- cancelled

Valid transitions must be implemented as domain operations. Done and Cancelled are terminal.

## Ownership

Projects may have multiple owners. Ownership is a relationship and is distinct from team assignment and project management.

Initial ownership types:

- accountable
- business_owner
- product_owner
- technical_owner

## Business Units

A project may belong to multiple Business Units through a many-to-many relationship. Project and Business Unit must belong to the same organization.

## Teams and responsibility

Project and task participation must use M3 Assignment Engine targets:

- `project`
- `task`

M4 must register real database-backed target resolvers. Resolvers must validate existence and tenant ownership.

## Task hierarchy

Use `parent_task_id` and `task_type`; do not create separate Epic/Subtask tables.

Initial task types:

- epic
- task
- subtask

A task has at most one parent task. Parent and child must belong to the same project and organization.

## Dependencies

Tasks support dependency relationships. Initial dependency type is `blocks`.

Self-dependencies and circular dependency chains must be rejected.

## Non-goals

M4 must not implement:

- work logs/time tracking
- meetings
- learning programs
- evaluations
- finance
- analytics dashboards
- payroll
- notifications
- full project-management UI

## Definition of Done

- Architecture docs match implementation.
- M4 migrations apply and reset cleanly.
- Tenant isolation is verified.
- Authorization boundaries are verified.
- Project and Task lifecycle rules are fully tested.
- Project and Task target resolvers are registered with M3.
- Invalid/nonexistent/cross-tenant targets are rejected.
- Ownership and Business Unit relationships are validated.
- Task hierarchy and dependency rules are tested.
- Audit/events are emitted consistently.
- M1-M3 regression tests pass.
- Typecheck and build pass.
- Working tree is clean and implementation is committed.
