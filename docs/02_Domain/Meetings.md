# Meetings Domain — M6

## Purpose

The Meetings domain captures structured collaboration and its durable outcomes. It is the source of truth for meeting context, participants, agenda, minutes/notes, decisions, and follow-up action items.

## Boundaries

- **People** answers who a person is.
- **Assignment** answers responsibility/context.
- **Project/Task** answers what work/action exists.
- **Work** answers what contribution was actually performed.
- **Meeting** answers what collaboration session occurred and what it produced.

No M6 entity duplicates these responsibilities.

## Aggregate

The primary aggregate is Meeting. Participant, Agenda Item, Meeting Notes, Decision, and Action Item are organization-scoped children associated with a Meeting.

A meeting can be targetless or associated with one supported contextual target.

## Meeting lifecycle

`scheduled → in_progress → completed`

Cancellation is available from scheduled or in_progress:

`scheduled → cancelled`
`in_progress → cancelled`

Completed and cancelled are terminal in V1.

Externally held meetings may be completed directly by an authorized user when no live transition was recorded.

## Participants

Participant identity references People. Participant type and response status are meeting-specific attributes.

Rules:

- one person appears at most once per meeting;
- organizer must be represented as a participant;
- participant organization must equal meeting organization and person organization;
- attendance does not imply Assignment or Work.

## Agenda

Agenda items are ordered, editable planning records. They may be marked planned, discussed, deferred, or skipped. Agenda items do not become Tasks automatically.

## Notes

Notes provide human-readable meeting minutes. Draft notes may be edited. Finalized notes are intended to preserve historical truth; V1 should not silently mutate finalized content.

## Decisions

Decisions are explicit, queryable records rather than information only embedded in notes. A meeting can have zero or many decisions.

## Action items

Action items represent follow-up commitments discovered during a meeting. They are not an alternative Task model.

An action item can optionally link to a Task. If execution needs Task-level lifecycle, dependencies, hierarchy, or broader assignment context, the Task Engine is authoritative.

## Integration model

### Assignment

An action item's owner is not equivalent to an assignment. Use Assignment when responsibility needs an explicit contextual relationship.

### Projects and Tasks

Meetings may target Projects. Action items may link to Tasks. M6 never creates membership or assignee tables.

### Work

Meeting attendance is not automatically Work. Preparation, facilitation, documentation, and follow-up contribution can be recorded using M5 Work Records.

## Target resolution

Meeting targets use a registry pattern. Initial target types are project, business_unit, department, and team. Every resolver is tenant-aware and must reject nonexistent or cross-tenant targets.

## Invariants

- all meeting-owned rows share the meeting organization;
- referenced people/targets/tasks belong to the same organization;
- scheduled end is after scheduled start;
- actual end is after actual start when both exist;
- lifecycle transitions are controlled;
- completed/cancelled meetings cannot be arbitrarily reopened;
- duplicate participants are prohibited;
- action-item Task links cannot cross tenants;
- finalized notes cannot be silently overwritten.

## Future extensions

External calendar sync, conferencing, notifications, AI transcription/summarization, recurring meetings, richer note versioning, and decision approval workflows are future concerns and are not part of M6 V1.
