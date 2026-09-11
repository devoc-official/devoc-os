# Milestone 5 — Work Engine

## Status

**Architecture frozen — implementation pending.**

## Objective

Introduce the Work Engine for recording actual contribution performed by people, the context in which it was performed, supporting evidence, and resulting outcomes.

## Scope

M5 includes:

- Work records / work logs
- Configurable work categories, including founder work categories
- Generic work targets
- Duration/time attribution
- Work descriptions and status
- Evidence records
- Outcomes
- Links between work, evidence, and outcomes
- Assignment-aware authorization and attribution
- Tenant isolation
- Audit and domain events using the existing platform patterns
- REST APIs and automated tests

## Domain boundary

Work records actual contribution. Projects and Tasks remain owned by M4. Assignments remain owned by M3. Meetings are **not** implemented in M5; Meetings are M6.

## Work model

A Work Record represents a unit of contribution by one person. It may be associated with a project/task or another supported work target, but work can also be internal/organizational and therefore need not have a project or task target.

Conceptual attributes:

- id
- organization_id
- person_id
- target_type
- target_id
- assignment_id (optional)
- category_id
- title
- description
- status
- started_at
- ended_at
- duration_minutes
- created_by_person_id
- metadata
- created_at
- updated_at

Duration must be positive. If start/end timestamps are supplied, duration must be consistent with them. UTC is mandatory.

## Work categories

Categories are organization-scoped and configurable. Initial examples include:

- engineering
- product
- management
- business_development
- sales
- marketing
- strategy
- operations
- academy
- research
- support
- other

Founder work is represented through the same Work model; no founder-only work-log table is created. Categories may identify founder contribution without hard-coding founders into the Work Engine.

## Work targets

M5 uses an extensible target resolver pattern consistent with M3. Initial supported targets are:

- project
- task
- business_unit
- department
- team

Internal/organizational work may have no target. Future domains may register additional target types without redesigning the Work entity.

Every target resolver must validate existence, assignability, and organization ownership. Target IDs are not generic database foreign keys.

## Work status

Initial lifecycle:

- draft
- submitted
- approved
- rejected
- cancelled

Controlled transitions:

- draft → submitted/cancelled
- submitted → approved/rejected/cancelled
- rejected → draft
- approved/cancelled are terminal

The architecture intentionally keeps approval simple; advanced approval workflows belong to a future extension if required.

## Assignment integration

An optional assignment_id records the responsibility context under which work was performed. When supplied, the assignment must belong to the same organization and person and must be valid for the work's target context.

Work does not replace Assignment. Assignment answers responsibility; Work records actual contribution.

## Evidence

Evidence is a separate child entity associated with a Work Record. Initial evidence types include:

- github_commit
- github_pull_request
- document
- link
- attachment
- client_feedback
- student_feedback
- other

Evidence stores references/metadata rather than embedding external provider data into the Work model.

## Outcomes

An Outcome is a separate record describing what resulted from work. Initial attributes include type, title, description, measurable value where applicable, and metadata. Multiple Work Records may contribute to one Outcome, and one Work Record may produce multiple Outcomes; use an explicit relationship entity rather than a single outcome_id on Work.

## Authorization and tenancy

Reuse existing authentication and contextual authorization. At minimum, every request must enforce request organization == work organization == person organization == target organization where applicable. Cross-tenant access must not leak existence and should return the established not-found behavior.

Work creation and mutation must respect the existing permission context: Role + Business Unit + Team + Project. Ordinary users may record their own work; administrative actions require the existing contextual authority model.

## Audit and events

Create/update and lifecycle transitions must integrate with the existing audit/event infrastructure. Events remain in-process in the modular monolith.

Initial events:

- work.created
- work.submitted
- work.approved
- work.rejected
- work.cancelled
- work.updated
- evidence.added
- outcome.created

## Non-goals

M5 does not implement:

- Meetings, agendas, minutes, attendees, or meeting decisions
- Learning Programs or milestones
- Evaluations or performance reviews
- Finance/payroll
- Analytics dashboards
- Notifications
- AI features
- separate founder work tables
- project membership or task assignee tables

## Definition of Done

Architecture, schema, APIs, authorization, target resolution, lifecycle rules, audit/events, tenant isolation, migrations, tests, documentation, typecheck, build, migration reset/seed, and M1–M4 regression verification must all pass before M5 is considered complete.
