# Assignment Domain

## Purpose

The Assignment Domain connects a Person to a supported organizational target and records the responsibility, context, time period, capacity, and authority for that connection.

## Relationship

`Person → Assignment → Target`

An assignment is not a replacement for an organizational role.

- `PersonRole` describes the person's organizational role.
- `Assignment` describes how that role is applied to a particular target.

## Assignment entity

```text
Assignment
├── id
├── organization_id
├── person_id
├── target_type
├── target_id
├── assignment_type
├── role_context
├── status
├── start_at
├── end_at
├── capacity_type
├── capacity_value
├── capacity_unit
├── authority_type
├── assigned_by_person_id
├── notes
├── metadata
├── created_at
└── updated_at
```

## Assignment type

`assignment_type` describes why/how the person is connected to the target. Examples include member, owner, lead, contributor, reviewer, mentor, trainer, manager, and observer.

`role_context` may provide a more specific responsibility such as `backend_developer` without creating a new organizational role.

## Generic targets

The target is polymorphic:

```text
target_type + target_id
```

Initial target types are project, task, business_unit, department, team, learning_program, and student.

Target existence, tenant ownership, and assignability are validated through the Assignment Target Registry.

## Lifecycle

The lifecycle is explicit and service-controlled:

- scheduled
- active
- paused
- completed
- cancelled

Completed and cancelled assignments are terminal.

## Time

`start_at` and `end_at` are UTC timestamps. `end_at`, when present, must be after `start_at`.

An assignment cannot be active before its start time, and terminal assignments cannot be reactivated.

## Capacity

Capacity is generic and represented by a type, numeric value, and unit. It is used for visibility and warning checks rather than hard blocking in V1.

## Authority

The creator of an assignment is recorded through `authority_type` and `assigned_by_person_id`. Authority is checked against the relevant organization or target context.

## History

Assignment lifecycle changes and other important changes are preserved in append-only assignment history. Current state is stored on the assignment; historical state changes are never overwritten.

## Multiple assignments

People may have multiple simultaneous assignments across different targets. No global single-assignment rule exists.

## Tenant boundary

Assignments are tenant-owned. Person and target must belong to the same organization as the request context. Cross-tenant access returns 404.

## Future extensibility

Future domains can register new target types with the target registry without changing the core Assignment entity. The domain is intentionally independent of Project, Task, Learning, Work, Evaluation, and Finance implementations.
