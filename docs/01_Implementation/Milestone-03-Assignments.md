# Milestone 3 — Assignment Engine

## Purpose

Milestone 3 establishes the generic Assignment Engine that connects a Person to an organizational target without coupling the engine to Projects, Tasks, Learning, or any other future domain.

The architectural backbone becomes:

`Person → Assignment → Target`

Examples include:

- Person → Project
- Person → Task
- Person → Business Unit
- Person → Department
- Person → Team
- Person → Learning Program
- Person → Student

## Scope

### Included

- Generic assignments
- Polymorphic target references
- Assignment types and role context
- Assignment lifecycle and validated transitions
- Start/end dates
- Capacity information and warning checks
- Assignment authority
- Assignment history
- Tenant isolation
- Authorization boundaries
- Audit and in-process domain events
- Assignment APIs
- Target registry/validation abstraction

### Explicit non-goals

Do not implement the domains themselves in M3:

- Projects
- Tasks
- Work Logs
- Meetings
- Learning Programs
- Students
- Evaluations
- Finance
- Analytics dashboards

M3 establishes only the reusable assignment infrastructure required by those future domains.

## Core distinction

M2 `PersonRole` answers: **What organizational role does this person hold?**

M3 `Assignment` answers: **Where, why, and in what capacity is this person applying that role?**

These concepts must remain separate.

## Target model

Assignments use:

```text
target_type
 target_id
```

`target_id` is not a generic database foreign key. The Assignment Engine validates the target through an internal target registry.

Initial supported target types:

- `project`
- `task`
- `business_unit`
- `department`
- `team`
- `learning_program`
- `student`

A target resolver must verify that the target exists, belongs to the requested organization, and is currently assignable. Future domains can register additional target types without redesigning the Assignment entity.

## Assignment lifecycle

States:

`scheduled → active → paused → completed/cancelled`

Valid transitions:

- scheduled → active
- scheduled → cancelled
- active → paused
- active → completed
- active → cancelled
- paused → active
- paused → completed
- paused → cancelled

`completed` and `cancelled` are terminal states.

Important lifecycle changes must go through domain services; arbitrary status editing is not allowed.

## Capacity

Capacity is intentionally generic:

```text
capacity_type
capacity_value
capacity_unit
```

Examples:

- allocation / 20 / hours_per_week
- workload / 5 / students
- workload / 10 / tasks_per_week

Capacity checks are informational/warning based in V1 and do not normally block an assignment.

## Authority

Assignment authority is recorded explicitly.

Initial authority types:

- platform_admin
- org_admin
- founder
- business_unit_head
- department_head
- project_manager
- academy_head
- team_lead

Authorization is contextual. For example, a Project Manager may assign within their project context rather than receiving unrestricted global assignment power.

## History

Important assignment changes are append-only in `assignment_history`.

History records the action, previous/new status where applicable, reason, actor, timestamp, and metadata.

## Tenant isolation

Every assignment and history record is tenant-scoped with `organization_id`.

The service must verify:

`request organization == person organization == target organization`

Cross-tenant resources must return 404, consistent with M2 behavior.

## APIs

Base path:

`/api/v1/organizations/:orgId/assignments`

Endpoints:

- POST `/assignments`
- GET `/assignments`
- GET `/assignments/:assignmentId`
- PATCH `/assignments/:assignmentId`
- POST `/assignments/:assignmentId/activate`
- POST `/assignments/:assignmentId/pause`
- POST `/assignments/:assignmentId/complete`
- POST `/assignments/:assignmentId/cancel`
- GET `/assignments/:assignmentId/history`
- GET `/people/:personId/assignments`
- GET `/assignments?targetType=project&targetId=<uuid>`

## Duplicate assignments

Prevent accidental duplicate active assignments for the same organization, person, target, and assignment type through domain-service validation.

Different responsibility types on the same target remain valid.

## Multiple assignments

A person may hold multiple simultaneous assignments across different targets and contexts. There is no global one-active-assignment restriction.

## Audit and events

Use the existing audit system for:

- `assignment.created`
- `assignment.status_changed`
- `assignment.updated`

Emit in-process domain events for:

- `assignment.created`
- `assignment.activated`
- `assignment.paused`
- `assignment.completed`
- `assignment.cancelled`
- `assignment.updated`

Do not introduce a distributed event bus in V1.

## Definition of Done

M3 is complete only when implementation, migration, API validation, authorization, tenant isolation, lifecycle rules, history, audit/events, tests, and documentation are all updated and verified.

All M1 and M2 regression tests must continue to pass.
