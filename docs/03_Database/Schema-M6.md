# Database Architecture & Schema — M6

## Principles

PostgreSQL remains authoritative. Use UUID primary keys, UTC timestamps, tenant-owned records, foreign keys where the relationship is concrete, and polymorphic target resolution only where the architecture explicitly requires it.

Expected migration: `006_meetings_m6_schema.sql`.

## Tables

### `meeting_types`

Organization-scoped configurable types.

Core fields:

- `id`
- `organization_id`
- `code`
- `name`
- `description`
- `is_active`
- `metadata`
- `created_at`
- `updated_at`

Unique type code within organization.

### `meetings`

Core meeting entity.

Fields:

- `id`
- `organization_id`
- `title`
- `description`
- `meeting_type_id`
- `status`
- `scheduled_start_at`
- `scheduled_end_at`
- `actual_start_at`
- `actual_end_at`
- `location_type`
- `location_reference`
- `organizer_person_id`
- `created_by_person_id`
- `metadata`
- `created_at`
- `updated_at`

Indexes should support organization/status/date and organizer lookups.

### `meeting_targets`

Polymorphic contextual target.

Fields:

- `id`
- `organization_id`
- `meeting_id`
- `target_type`
- `target_id`
- `metadata`
- `created_at`

At most one target context is expected for a meeting in V1. Target existence and tenant ownership are enforced by the resolver registry rather than a generic FK.

### `meeting_participants`

Fields:

- `id`
- `organization_id`
- `meeting_id`
- `person_id`
- `participant_type`
- `response_status`
- `joined_at`
- `left_at`
- `notes`
- `metadata`
- `created_at`
- `updated_at`

Unique `(meeting_id, person_id)`. Concrete FKs to meetings and people should enforce ownership relationships through service validation and database constraints where feasible.

### `meeting_agenda_items`

Fields:

- `id`
- `organization_id`
- `meeting_id`
- `title`
- `description`
- `position`
- `owner_person_id`
- `duration_minutes`
- `status`
- `metadata`
- `created_at`
- `updated_at`

Index `(meeting_id, position)`.

### `meeting_notes`

Fields:

- `id`
- `organization_id`
- `meeting_id`
- `content`
- `prepared_by_person_id`
- `status`
- `finalized_at`
- `metadata`
- `created_at`
- `updated_at`

V1 expects one current notes record per meeting; implementation may enforce one-to-one with a unique meeting ID. Finalization must be controlled by the service layer.

### `meeting_decisions`

Fields:

- `id`
- `organization_id`
- `meeting_id`
- `title`
- `decision_text`
- `decided_at`
- `recorded_by_person_id`
- `metadata`
- `created_at`
- `updated_at`

### `meeting_action_items`

Fields:

- `id`
- `organization_id`
- `meeting_id`
- `title`
- `description`
- `owner_person_id`
- `due_at`
- `status`
- `task_id`
- `metadata`
- `created_at`
- `updated_at`

`task_id` is a concrete FK to M4 Tasks if the existing schema supports it; tenant compatibility must still be validated by the application/service layer. No assignee table is introduced.

## Referential integrity

All tenant-owned concrete references must be same-organization. Polymorphic targets must be resolved through `MeetingTargetResolverRegistry` before persistence.

Do not add generic foreign keys for `target_id`.

## Indexing

Use only indexes justified by query patterns:

- organization + status
- organization + scheduled_start_at
- meeting + participant
- meeting + agenda position
- meeting + decisions
- meeting + action-item status/due date
- organization + target type + target ID where useful

Avoid speculative indexes.

## Deletion

Meaningful meeting history should normally be retained. Cancellation is preferred over deletion. Child records should not be silently detached from historical meetings.

## Transaction boundaries

Create/update operations affecting a meeting and its required child integrity should use transactions. Lifecycle transition plus audit/event emission must follow the established platform pattern.

## Security

Every query and mutation is tenant-scoped. Cross-tenant resources must not be discoverable through IDs or target resolution.
