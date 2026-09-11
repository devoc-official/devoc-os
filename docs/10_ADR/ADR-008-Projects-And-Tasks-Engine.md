# ADR-008 — Projects & Tasks Engine

## Status

Accepted

## Context

DeVoc OS needs a durable model for business initiatives and actionable work. Projects may span multiple Business Units, have multiple owners, and contain hierarchical tasks. People may participate in projects and tasks in different contextual roles.

M3 already provides a generic Assignment Engine that connects people to polymorphic targets. Creating project-member or task-assignee tables would duplicate responsibility and prevent a consistent model across future domains.

## Decision

DeVoc OS will implement Projects and Tasks as separate tenant-scoped domains.

- Project represents an initiative/outcome.
- Task represents actionable work within a Project.
- Assignment represents contextual responsibility to a Project or Task.
- Person remains the identity source.

Projects may be related to multiple Business Units. Project ownership is a separate relationship supporting multiple owners. Project Managers and team participation are assignments, not hard-coded Project fields.

## Project lifecycle

Canonical lifecycle:

`idea`, `research`, `planning`, `development`, `testing`, `beta`, `released`, `maintenance`, `archived`.

Forward progression follows the canonical order. Controlled rollback from testing, beta, or maintenance to development is permitted. Archived is terminal. Lifecycle changes are explicit domain operations.

## Task lifecycle

Task states are:

`backlog`, `todo`, `in_progress`, `in_review`, `testing`, `blocked`, `changes_requested`, `done`, `cancelled`.

Task transitions are explicit and iterative. Done and Cancelled are terminal.

## Task hierarchy

Hierarchy uses `parent_task_id` and `task_type`. Epic, Task, and Subtask are values rather than separate tables. Parent and child must share project and tenant ownership.

## Task dependencies

Dependencies are represented by a separate relationship. V1 supports `blocks`. Self-dependencies and circular dependency chains are rejected.

## Assignment integration

M4 registers database-backed `project` and `task` resolvers with the M3 TargetResolverRegistry. A resolver must verify target existence, tenant ownership, and assignability. The Assignment Engine remains responsible for assignment lifecycle, authority, capacity, history, and events.

## Ownership separation

Project ownership is intentionally distinct from Assignment:

- Project owner = strategic/accountability relationship.
- Project manager = contextual operational assignment.
- Project member/contributor/reviewer = contextual assignment.

This prevents the Project entity from becoming a second role or membership system.

## Alternatives rejected

### Project membership table
Rejected because M3 Assignment already provides reusable contextual membership and responsibility.

### Task assignee column
Rejected because a task may have multiple contextual participants and future responsibility types.

### Separate Epic/Subtask tables
Rejected because hierarchical work can be represented by a single Task entity with parent relationships.

### Single Business Unit foreign key
Rejected because projects may span multiple Business Units.

### Free-form status updates
Rejected because lifecycle integrity is important for auditability and analytics.

## Consequences

Positive:

- consistent assignment architecture
- multi-BU projects
- multiple ownership relationships
- hierarchical tasks without schema duplication
- future Work Engine can consume Projects, Tasks, and Assignments
- project/task targets become real resolvers for M3

Trade-offs:

- dependency-cycle validation requires service/domain logic
- polymorphic assignment targets require resolver registration
- lifecycle transitions require explicit operations
- ownership and BU relationship validation requires service-level tenant checks

## Security and tenancy

Every Project and Task is tenant-scoped. Project, Task, Business Unit, Person, and Assignment relationships must remain within one organization. Cross-tenant resources are returned as 404 at the API boundary.

## Future extension

The Work Engine may later record time, work logs, outcomes, and evidence against Projects and Tasks. Learning, Evaluation, Finance, and Analytics may consume these domains without changing their core ownership and assignment semantics.
