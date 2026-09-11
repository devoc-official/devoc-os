# ADR-010 — Meetings Engine

## Status

**Accepted / Frozen**

## Context

DeVoc OS needs a durable collaboration layer for meetings, including participants, agendas, notes, decisions, and follow-up actions. The platform already has People, Assignment, Projects/Tasks, and Work engines. A meeting architecture must add collaboration records without creating duplicate responsibility, task, or contribution systems.

## Decision

Implement Meetings as a modular-monolith domain using a tenant-scoped Meeting aggregate and explicit child entities for participants, agenda items, notes, decisions, and action items.

Use a polymorphic, tenant-aware `MeetingTargetResolverRegistry` for contextual targets. Initial targets are project, business_unit, department, and team; targetless meetings are valid.

Use existing engines for cross-domain concerns:

- People for person identity;
- Assignment for responsibility/context;
- Projects/Tasks for actionable work;
- Work for actual contribution;
- existing Auth/Permissions for authorization;
- existing Audit/Events for traceability.

## Participant decision

Participants are meeting-specific attendance/context records. They are not project membership and do not replace Assignment.

## Action-item decision

Action items are lightweight meeting follow-up records. When execution requires task lifecycle, link the action item to an M4 Task. Do not introduce task-assignee or action-item-assignee tables.

## Notes decision

Draft notes may be edited. Finalized notes preserve historical truth and must not be silently overwritten. A richer version/correction model is a future extension.

## Work decision

Attendance does not automatically create Work Records. Actual preparation, facilitation, documentation, and follow-up contribution use the existing M5 Work Engine.

## Lifecycle decision

Meeting status is controlled:

- scheduled → in_progress/completed/cancelled
- in_progress → completed/cancelled
- completed/cancelled terminal

Authorized users may directly complete an externally held meeting when no live start was recorded.

## Alternatives rejected

### Separate meeting membership system
Rejected because People + meeting participants already represent identity and attendance; a parallel membership model would blur context and responsibility.

### Action-item-only task system
Rejected because M4 Tasks already own actionable work, hierarchy, dependencies, lifecycle, and Assignment integration.

### Automatic work logs for attendance
Rejected because attendance is not equivalent to contribution and would corrupt Work Engine semantics.

### Calendar-first architecture
Rejected for M6 V1. External calendar synchronization can be added later without making an external provider the source of truth for internal meeting history.

### AI-first meeting architecture
Rejected for M6 V1. Transcription/summarization can consume meeting records later.

### Microservice
Rejected. DeVoc OS remains a modular monolith until operational requirements justify distribution.

## Consequences

Positive:

- meeting history is structured and queryable;
- decisions and follow-ups are durable records;
- existing engines remain authoritative for their responsibilities;
- future calendar/AI/notification integrations have stable internal records;
- tenant isolation remains consistent.

Trade-offs:

- M6 has several child entities and API surfaces;
- action-item/task synchronization needs explicit linking rules;
- finalized-note correction/versioning may require a later ADR.

## Non-goals

No recurring meetings, external calendar sync, conferencing infrastructure, notifications, AI transcription/summarization, Learning, Evaluation, Finance, Analytics dashboards, or microservices are introduced by this ADR.
