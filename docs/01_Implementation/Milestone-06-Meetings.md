# Milestone 6 — Meetings Engine

## Status

**Architecture frozen — implementation pending.**

## Objective

Introduce the Meetings Engine for structured organizational collaboration: scheduling a meeting, recording participants and agenda, capturing minutes/notes, decisions, and follow-up action items without duplicating the existing Assignment, Task, Work, or People engines.

## Domain boundary

M6 owns the meeting record and meeting-specific collaboration artifacts. People owns identity. Assignments own responsibility/context. Projects and Tasks own actionable work. Work owns actual contribution. Meetings must integrate with these engines rather than create parallel membership, assignee, or work-log models.

## Core model

Conceptually:

**Meeting → Participants → Agenda → Notes/Minutes → Decisions → Action Items → Task/Assignment/Work**

A Meeting is an event/session in which people collaborate. It may be associated with a project, business unit, department, team, or other supported context, but it may also be organizational/internal and have no target.

## Meeting

Conceptual attributes:

- id
- organization_id
- title
- description
- meeting_type
- status
- scheduled_start_at
- scheduled_end_at
- actual_start_at
- actual_end_at
- location_type
- location_reference
- organizer_person_id
- created_by_person_id
- metadata
- created_at
- updated_at

Meeting types are organization-scoped/configurable. Initial examples: project, team, one_on_one, review, planning, client, academy, management, other.

Status lifecycle:

- scheduled
- in_progress
- completed
- cancelled

Controlled transitions:

- scheduled → in_progress/completed/cancelled
- in_progress → completed/cancelled
- completed/cancelled are terminal

A meeting may be marked completed without an in-progress transition when an administrator records an externally held meeting, subject to authorization. Scheduled timestamps must be valid and end after start. Actual timestamps, when present, must be ordered.

## Targets and context

M6 uses an extensible MeetingTargetResolverRegistry consistent with the M3/M5 polymorphic target pattern. Initial supported target types:

- project
- business_unit
- department
- team

Targetless meetings are valid.

Target IDs are not generic foreign keys. Resolvers must validate existence, assignability, and organization ownership. Future domains may register supported target types without changing the Meeting entity.

A meeting's target is contextual; it does not make every participant a project/team member. Responsibility remains represented by Assignment.

## Participants

Participants are separate child records, not a generic project membership model.

Conceptual attributes:

- id
- organization_id
- meeting_id
- person_id
- participant_type
- response_status
- joined_at
- left_at
- notes
- metadata
- created_at
- updated_at

Initial participant types: organizer, required, optional, attendee, presenter, facilitator.

Initial response statuses: invited, accepted, declined, tentative, attended, absent.

A person may not be duplicated within the same meeting. Organizer must be a participant with organizer role. Participant records must belong to the same organization as the meeting and person.

## Agenda items

Agenda items are ordered children of a meeting.

Conceptual attributes:

- id
- organization_id
- meeting_id
- title
- description
- position
- owner_person_id (optional)
- duration_minutes (optional)
- status
- metadata
- created_at
- updated_at

Agenda status is intentionally lightweight: planned, discussed, deferred, skipped.

Agenda does not become a Task automatically. If work is required, create/link a Task through the existing Task Engine.

## Minutes / notes

Meeting notes are meeting-specific records and may be drafted during the meeting and finalized afterward.

Conceptual attributes:

- id
- organization_id
- meeting_id
- content
- prepared_by_person_id
- status
- finalized_at
- metadata
- created_at
- updated_at

Initial note status: draft, finalized. Finalized notes are immutable except through an explicit correction/version mechanism if later required; M6 V1 should preserve the original finalized record and avoid silent historical mutation.

## Decisions

Decisions are explicit records because important organizational decisions must be queryable independently from free-form minutes.

Conceptual attributes:

- id
- organization_id
- meeting_id
- title
- decision_text
- decided_at
- recorded_by_person_id
- metadata
- created_at
- updated_at

A decision may optionally reference an existing project/task context but must not duplicate project or task ownership data.

## Action items

M6 action items are meeting follow-up records. They are not a second Task system.

Conceptual attributes:

- id
- organization_id
- meeting_id
- title
- description
- owner_person_id (optional)
- due_at (optional)
- status
- task_id (optional)
- metadata
- created_at
- updated_at

Initial action-item statuses: open, completed, cancelled.

If an action item requires tracked execution, it should be linked to an existing Task or a newly created Task through the M4 Task Engine. The action item may retain meeting context while the Task remains the canonical actionable work item. Do not create `action_item_assignees` or a second assignment model.

When an owner is specified, M6 may validate the person but responsibility should be represented through Assignment when an ongoing responsibility context is required.

## Work integration

M6 does not create work logs for meeting attendance automatically. Attendance is participation data, not contribution accounting.

Actual preparation, facilitation, follow-up, or other contribution can be recorded through the existing M5 Work Engine. M6 may optionally reference Work Records for explicit contribution evidence, but no duplicate work entity is introduced.

## Authorization and tenancy

Reuse existing authentication and contextual authorization. Every meeting-owned record must satisfy request organization == meeting organization == referenced person/target organization.

Cross-tenant access must use the established non-leaking 404 behavior.

At minimum, users may view meetings they are authorized to see through the meeting context. Organizers and users with the appropriate contextual authority may create/update participants, agenda, notes, decisions, and action items. Administrative capabilities reuse the existing Role + Business Unit + Team + Project authorization model.

## Audit and events

M6 integrates with the existing in-process audit/event infrastructure.

Initial events:

- meeting.created
- meeting.updated
- meeting.started
- meeting.completed
- meeting.cancelled
- participant.added
- participant.updated
- participant.removed
- agenda_item.added
- agenda_item.updated
- agenda_item.removed
- notes.finalized
- decision.created
- action_item.created
- action_item.updated
- action_item.completed
- action_item.cancelled

## Non-goals

M6 does not implement:

- a separate user/person system
- project membership
- task assignee tables
- a second assignment engine
- a second work-log system
- Learning Programs
- Evaluations
- Finance
- Analytics dashboards
- Notifications
- AI meeting transcription/summarization
- external calendar synchronization
- video conferencing infrastructure
- microservices

## Definition of Done

Architecture, schema, APIs, target resolution, participant integrity, lifecycle rules, Task/Assignment/Work integration, authorization, audit/events, tenant isolation, migrations, tests, documentation, typecheck, build, migration reset/seed, and M1–M5 regression verification must all pass before M6 is considered complete.
