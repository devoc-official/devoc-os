# Projects & Tasks Domain

## Domain boundary

The Projects & Tasks domain models initiatives and executable work. It does not own person-to-project/task membership; that responsibility belongs to the Assignment Engine.

## Project

A Project represents a business, product, internal, research, academy, infrastructure, or client initiative with a defined outcome.

Core attributes:

- id
- organization_id
- name
- key
- description
- project_type
- status
- priority
- start_at
- target_end_at
- actual_end_at
- created_by_person_id
- metadata
- created_at
- updated_at

Project keys are tenant-scoped human-readable identifiers.

## Project lifecycle

States:

- idea
- research
- planning
- development
- testing
- beta
- released
- maintenance
- archived

Allowed forward transitions:

- idea → research
- research → planning
- planning → development
- development → testing
- testing → beta
- beta → released
- released → maintenance
- maintenance → archived

Controlled rollback:

- testing → development
- beta → development
- maintenance → development

Archived is terminal.

## Project ownership

A project can have multiple owners. Ownership is modeled separately from Project and Assignment.

Ownership types:

- accountable
- business_owner
- product_owner
- technical_owner

Ownership records are tenant-scoped through the project/person relationship and require matching organization ownership.

## Project Business Units

Projects and Business Units have a many-to-many relationship. Every linked Business Unit must belong to the same organization as the project.

## Project assignments

Project Managers and team members are contextual assignments, not Project fields. Examples include:

- member
- owner
- lead
- manager
- reviewer
- contributor
- observer

Assignment lifecycle, authority, capacity, and history remain owned by M3.

## Task

A Task is an actionable unit of work within a Project.

Core attributes:

- id
- organization_id
- project_id
- parent_task_id
- title
- description
- task_key
- task_type
- status
- priority
- start_at
- due_at
- completed_at
- created_by_person_id
- metadata
- created_at
- updated_at

## Task hierarchy

Hierarchy is represented by `parent_task_id`. There are no separate Epic or Subtask entities.

Initial task types:

- epic
- task
- subtask

A task may have one parent. Parent and child must belong to the same project and organization.

## Task lifecycle

States:

- backlog
- todo
- in_progress
- in_review
- testing
- blocked
- changes_requested
- done
- cancelled

Valid transitions:

- backlog → todo
- todo → in_progress
- todo → cancelled
- in_progress → in_review
- in_progress → blocked
- in_progress → cancelled
- blocked → in_progress
- in_review → testing
- in_review → changes_requested
- changes_requested → in_progress
- testing → done
- testing → changes_requested
- testing → blocked

Done and Cancelled are terminal.

## Task dependencies

Dependencies are stored separately from tasks. Initial dependency type is `blocks`.

`task_id` depends on `depends_on_task_id`.

Self-dependencies and circular dependency chains are invalid.

## Assignment targets

M4 registers real resolvers for `project` and `task` with the M3 TargetResolverRegistry. A resolver must verify target existence, organization ownership, and assignability.

## Deletion and history

Meaningful project/task history must not be destroyed through normal application APIs. Lifecycle states preserve historical accountability. Any future deletion policy must be explicit and architecture-approved.

## Future integration

The Work Engine will later consume Projects, Tasks, and Assignments to record actual work and outcomes. Learning, Evaluation, Finance, and Analytics may build on the resulting domain relationships without modifying the core Project/Task ownership model.
