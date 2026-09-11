# ADR-007 — Generic Assignment Engine

## Status

Accepted

## Context

DeVoc OS needs a reusable way to connect people to work and organizational objects. A project-only membership model would become a structural limitation because people may also need assignments to tasks, business units, departments, teams, learning programs, students, and future target types.

The People Engine already models organizational roles and employment. Assignment must therefore represent contextual application of a person's role without duplicating the People model.

## Decision

DeVoc OS will implement a generic Assignment Engine using a polymorphic target reference:

```text
target_type + target_id
```

Assignments are tenant-scoped and connect one Person to one supported target.

The Assignment Engine will use an internal Target Registry/Resolver abstraction to validate target existence, tenant ownership, and assignability. `target_id` is deliberately not a generic database foreign key.

Assignments will support:

- assignment type
- role context
- start/end timestamps
- explicit lifecycle
- generic capacity
- assignment authority
- assigning person
- notes and metadata
- append-only history

## Lifecycle decision

Supported states:

`scheduled`, `active`, `paused`, `completed`, `cancelled`

Lifecycle transitions are explicit domain operations. Completed and cancelled assignments are terminal.

## Role separation

`PersonRole` and `Assignment` remain separate:

- PersonRole = organizational role
- Assignment = contextual application of that role to a target

This allows a person to be a Developer in the organization and simultaneously be a Mentor for one student, Reviewer for another, and Technical Lead for a project.

## Authority decision

Assignment creation records the authority type and assigning person. Authorization is contextual to the target rather than granting all role holders unrestricted global assignment capability.

## Capacity decision

Capacity uses a generic type/value/unit model. V1 capacity checks are advisory and produce warnings rather than normally blocking assignments.

## Alternatives rejected

### Project-only membership
Rejected because it cannot support non-project targets and would force later parallel systems.

### Separate assignment tables per target type
Rejected because it duplicates lifecycle, history, authorization, and capacity behavior.

### Generic foreign key
Rejected because relational databases cannot safely enforce a foreign key across unrelated target tables. Validation belongs in the target registry/service boundary.

### Microservice Assignment service
Rejected for V1. DeVoc OS uses a modular monolith, and a distributed service would add unnecessary operational complexity.

## Consequences

Positive:

- one reusable assignment abstraction
- future domains can register target types
- consistent history, authorization, and lifecycle rules
- supports multiple simultaneous assignments
- keeps People independent from Projects/Learning/Work

Trade-offs:

- target references cannot be enforced by a normal database foreign key
- target registry must be maintained as new domains are introduced
- service-level tenant and existence validation is mandatory

## Security and tenancy

Every assignment is tenant-scoped. The request organization, person organization, and target organization must agree. Cross-tenant resources are intentionally indistinguishable from missing resources at the API boundary and return 404.

## Future extension

New domains may register assignable target types without redesigning the core Assignment entity. Additional target-specific authorization rules may be implemented by target adapters while preserving the common assignment lifecycle and audit model.
