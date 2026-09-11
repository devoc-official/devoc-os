# REST API Architecture & Contracts — M6

## Base

All endpoints are tenant-scoped and use `/api/v1`. Existing authentication, tenant resolution, response envelopes, error format, authorization, audit, and request IDs remain authoritative.

Base path:

`/api/v1/organizations/:orgId`

## Meeting endpoints

- `POST /meetings` — create meeting
- `GET /meetings` — list/filter meetings
- `GET /meetings/:meetingId` — retrieve meeting
- `PATCH /meetings/:meetingId` — update non-lifecycle meeting fields
- `POST /meetings/:meetingId/start` — start meeting
- `POST /meetings/:meetingId/complete` — complete meeting
- `POST /meetings/:meetingId/cancel` — cancel meeting
- `GET /meetings/:meetingId/assignments` — list assignments relevant to the meeting context where supported

## Participant endpoints

- `GET /meetings/:meetingId/participants`
- `POST /meetings/:meetingId/participants`
- `PATCH /meetings/:meetingId/participants/:participantId`
- `DELETE /meetings/:meetingId/participants/:participantId`

## Agenda endpoints

- `GET /meetings/:meetingId/agenda`
- `POST /meetings/:meetingId/agenda`
- `PATCH /meetings/:meetingId/agenda/:agendaItemId`
- `DELETE /meetings/:meetingId/agenda/:agendaItemId`

## Notes endpoints

- `GET /meetings/:meetingId/notes`
- `PUT /meetings/:meetingId/notes` — create/update draft notes
- `POST /meetings/:meetingId/notes/finalize` — finalize notes

Finalized notes cannot be silently overwritten.

## Decision endpoints

- `GET /meetings/:meetingId/decisions`
- `POST /meetings/:meetingId/decisions`
- `PATCH /meetings/:meetingId/decisions/:decisionId`
- `DELETE /meetings/:meetingId/decisions/:decisionId` where permitted

## Action-item endpoints

- `GET /meetings/:meetingId/action-items`
- `POST /meetings/:meetingId/action-items`
- `PATCH /meetings/:meetingId/action-items/:actionItemId`
- `POST /meetings/:meetingId/action-items/:actionItemId/complete`
- `POST /meetings/:meetingId/action-items/:actionItemId/cancel`
- `POST /meetings/:meetingId/action-items/:actionItemId/link-task/:taskId`
- `DELETE /meetings/:meetingId/action-items/:actionItemId/task` where permitted

Task linking must validate same-organization ownership and use the M4 Task Engine as the canonical task system.

## Meeting type endpoints

- `POST /meeting-types`
- `GET /meeting-types`
- `PATCH /meeting-types/:meetingTypeId`

Meeting types are organization-scoped and configurable.

## Filtering

Meeting list may support:

- status
- meetingTypeId
- organizerPersonId
- targetType
- targetId
- scheduledFrom
- scheduledTo
- participantPersonId

Filtering must remain tenant-scoped.

## Request/response rules

Success envelope:

```json
{"data": {}, "meta": {}}
```

Error envelope:

```json
{"error":{"code":"...","message":"...","details":...,"request_id":"..."}}
```

Cross-tenant or nonexistent resources return the established 404 behavior.

## Validation

- scheduled end must be after scheduled start;
- actual end must be after actual start when both are supplied;
- lifecycle transitions must be valid;
- completed/cancelled meetings cannot be arbitrarily reopened;
- organizer must be a participant;
- duplicate participants are prohibited;
- people and targets must belong to the meeting organization;
- target IDs must pass the target resolver;
- action-item Task links must belong to the same organization;
- finalized notes cannot be silently mutated.

## Authorization

Reuse existing Role + Business Unit + Team + Project contextual authorization. Meeting access is contextual; being a participant does not automatically grant administration rights. Controllers remain thin and domain rules belong in application/domain services.

## Integration

M6 does not expose separate project-membership, task-assignee, or work-log APIs. Existing M3/M4/M5 APIs remain authoritative for Assignment, Task, and Work.
