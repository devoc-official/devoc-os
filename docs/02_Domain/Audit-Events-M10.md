# Audit & Events Domain — M10

## Core Domain Concepts

| Concept | Description |
|---------|-------------|
| **AuditRecord** | Append-only, tenant-isolated operational record capturing WHO did WHAT, WHEN, WHERE, and WHY across DeVoc OS entities. |
| **OutboxEvent** | Transaction-staged domain event committed atomically in PostgreSQL alongside entity mutations to guarantee zero event loss. |
| **EventConsumerRecord** | Idempotency tracking record ensuring event subscribers execute exactly once per event delivery. |
| **EventRegistry** | Centralized catalog defining event names, versions, schemas, owning domain modules, and payload specifications. |

---

## Entity Relationships & Architecture

```text
Organization (M1) ──► AuditRecord ◄── User (M1) / Person (M2)
       │
       ├──► OutboxEvent ──► EventBus (In-Process Dispatch) ──► EventConsumerRecord
       │
       └──► EventRegistry (Domain Event Schema Catalog)
```

---

## Domain Rules & Invariants

### 1. Unified Operational Audit Infrastructure
Every business mutation across DeVoc OS (M1 Organization, M2 People, M3 Assignments, M4 Projects & Tasks, M5 Work, M6 Meetings, M7 Learning, M8 Evaluation, M9 Finance) uses the single `AuditRecord` and `OutboxEvent` domain infrastructure. Separate audit engines or ad-hoc logging tables are strictly forbidden.

### 2. Immutability & Append-Only Log Invariant
- Once created, an `AuditRecord` can **NEVER** be updated or physically deleted.
- Admin adjustments, administrative overrides, or entity reversals generate a new `AuditRecord` with `action: 'AUDIT_CORRECTION'` referencing the prior audit log ID in `payload.correctedAuditId`.

### 3. Transactional Outbox Atomic Guarantee
- An event MUST be staged into `OutboxEvent` within the same database transaction (`BEGIN...COMMIT`) that modifies the primary entity state.
- If the domain transaction aborts or rolls back, the outbox event and audit record roll back automatically. Dual-write inconsistencies are mathematically impossible.

### 4. Tenant Isolation Boundary
- All `AuditRecord`, `OutboxEvent`, and `EventConsumerRecord` entries carry `organization_id`.
- Tenant context is validated prior to reading audit records. Cross-tenant queries return **404 Not Found**.

### 5. Standardized Event Naming & Versioning
- Event names follow the pattern `<domain>.<entity>.<action>` or `<entity>.<action>` (e.g., `financial_obligation.issued`, `person.created`, `evaluation.completed`).
- Every event payload carries a major.minor `version` string (default `'1.0'`). Schema evolution requires incrementing `version` without breaking existing consumers.

---

## State Machine Definitions

### 1. Outbox Event Delivery Lifecycle
```text
Pending ──► Dispatched
   │
   └──► Failed (Retry count < 5) ──► Dispatched / DeadLettered
```
- **Pending**: Inserted atomically during domain mutation transaction.
- **Dispatched**: Successfully published to `eventBus` and processed by in-process subscribers.
- **Failed**: Temporary dispatch error; queued for exponential backoff retry.
- **DeadLettered**: Reached maximum retry count (5 attempts); flagged for administrative inspection.

### 2. Consumer Idempotency Lifecycle
```text
Received ──► Processed
   │
   └──► DuplicateIgnored (If event_id + consumer_name already exists)
```

---

## Domain Event Registry Catalog

| Event Name | Version | Owning Module | Triggering Action | Payload Overview |
|------------|---------|---------------|-------------------|------------------|
| `organization.updated` | `1.0` | Organization | Organization properties updated | `name`, `code`, `status` |
| `branch.created` | `1.0` | Organization | Branch added to tenant | `branchId`, `name`, `code` |
| `person.created` | `1.0` | People | Person entity created | `firstName`, `lastName`, `email`, `role` |
| `employment.assigned` | `1.0` | People | Employment record created | `employmentId`, `personId`, `managerId` |
| `assignment.created` | `1.0` | Assignments | Generic assignment created | `personId`, `targetType`, `targetId`, `capacity` |
| `assignment.updated` | `1.0` | Assignments | Assignment status/dates updated | `status`, `capacity`, `endDate` |
| `project.created` | `1.0` | Projects/Tasks | Project created | `title`, `projectType`, `status` |
| `task.completed` | `1.0` | Projects/Tasks | Task marked complete | `taskId`, `completedAt` |
| `work.recorded` | `1.0` | Work | Work log entry submitted | `workRecordId`, `durationMinutes`, `projectId` |
| `outcome.delivered` | `1.0` | Work | Work outcome delivered | `outcomeId`, `measurableValue` |
| `meeting.completed` | `1.0` | Meetings | Meeting concluded | `meetingId`, `actionItemCount` |
| `learning.enrolled` | `1.0` | Learning | Student enrolled in program | `enrollmentId`, `programId`, `studentPersonId` |
| `learning.review.completed`| `1.0` | Learning | Milestone review submitted | `reviewId`, `milestoneId`, `outcome` |
| `evaluation.completed` | `1.0` | Evaluation | Evaluation submitted | `evaluationId`, `templateId`, `decision` |
| `financial_obligation.issued`| `1.0` | Finance | Obligation issued for payment | `obligationId`, `partyId`, `netAmount` |
| `financial_transaction.posted`| `1.0` | Finance | Payment posted | `transactionId`, `amount`, `paymentMode` |
| `financial_transaction.reversed`| `1.0` | Finance | Reversal posted | `transactionId`, `compensatingTxId`, `reason` |

---

## Preparation for M11 Analytics

The M10 audit and domain event stream provides the authoritative, immutable event store required by Milestone 11 (Analytics Engine):
- **Contribution Score Calculation**: Derived from `work.recorded`, `outcome.delivered`, `task.completed`, and `meeting.completed` event streams.
- **Academy KPI Metrics**: Placement, completion, and growth rates computed from `learning.enrolled`, `learning.review.completed`, and `evaluation.completed` audit trails.
- **Financial Analytics**: Revenue, expense, and budget variance computed from `financial_transaction.posted` and `financial_obligation.issued` events.

---
*Prepared for Milestone 10 – Audit & Events Domain Architecture.*
