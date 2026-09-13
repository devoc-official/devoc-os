# Milestone 10 — Audit & Events Hardening

## Status

**Architecture frozen — implementation pending.**

## Objective

Milestone 10 establishes a hardened, enterprise-grade, cross-cutting **Audit & Domain Events Infrastructure** for DeVoc OS. It consolidates, standardizes, and hardens the existing audit and event mechanisms established across Milestone 1 through Milestone 9 (Organization, People, Assignments, Projects/Tasks, Work, Meetings, Learning, Evaluation, Finance) into a single, unified, resilient pipeline.

M10 is an infrastructure-hardening milestone. It does NOT create new business engines, duplicate audit systems, or introduce external microservice messaging brokers (e.g., Kafka, RabbitMQ). It ensures every business mutation across DeVoc OS is reliably auditable, tenant-isolated, immutable, traceable via request/correlation IDs, and ready for future consumption by M11 Analytics.

---

## Core Architectural Principles

```text
HTTP Request (x-request-id, x-correlation-id)
       │
       ▼
Auth & Tenant Resolution (organization_id, actor_id, actor_person_id)
       │
       ▼
Domain Service Transaction (DB BEGIN)
       ├── 1. Domain State Mutation (e.g., posted transaction, evaluation completed)
       ├── 2. Immutable Audit Record (audit_logs with before/after state & redaction)
       └── 3. Transactional Outbox Event (event_outbox committed in same DB transaction)
       │
       ▼ (DB COMMIT)
       │
       ├──► Immediate In-Process Dispatch (eventBus -> Handlers)
       └──► Outbox Poller / Fallback Dispatcher (guarantees delivery if in-process dispatch fails)
```

1. **Unified Infrastructure**: All DeVoc OS modules use the exact same cross-cutting `AuditService` and `eventBus`. Module-specific audit databases or custom event buses are strictly prohibited.
2. **Transaction-Bound Reliability (Transactional Outbox)**: Domain mutations, audit log records, and outbox event entries are committed atomically within the same database transaction. This eliminates dual-write failures (where database updates succeed but event publishing or audit logging fails).
3. **Immutable Append-Only Audit Trail**: Audit records represent permanent operational history. Physical updates and deletions are prohibited. Corrections or administrative reversals are recorded as new, distinct audit entries referencing the original log.
4. **Strict Multi-Tenant Scoping**: Every audit log and domain event is bound to an `organization_id`. Cross-tenant audit reads or event processing return HTTP `404 Not Found`.
5. **End-to-End Tracing**: Standardized `request_id` (per HTTP request) and `correlation_id` (per business workflow sequence) flow from API entry through domain services, audit logs, and domain events.
6. **Automatic Sensitive-Data Redaction**: Sensitive attributes (`password`, `token`, `secret`, `apiKey`, `creditCard`, `ssn`) are automatically scrubbed prior to audit persistence or event payload delivery.

---

## Audit Record Specification

The canonical `AuditRecord` structure standardizes auditing across all engines:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (`gen_random_uuid()`). |
| `organization_id` | UUID | Tenant owner ID. Nullable only for system-level bootstrap actions. |
| `actor_id` | UUID | User ID (`users.id`) initiating the operation. |
| `actor_person_id` | UUID | Optional link to Person ID (`people.id`) for human actors. |
| `action` | String | Standardized action code (e.g., `OBLIGATION_ISSUED`, `EVALUATION_COMPLETED`). |
| `entity_type` | String | Target domain entity type (e.g., `financial_obligation`, `evaluation`). |
| `entity_id` | UUID | Target domain entity primary key. |
| `before_state` | JSONB | Relevant entity state prior to mutation (null for creation). |
| `after_state` | JSONB | Relevant entity state after mutation (null for physical delete). |
| `payload` | JSONB | Sanitized contextual metadata, input arguments, or action summary. |
| `request_id` | String | Tracing ID for the HTTP request (`x-request-id`). |
| `correlation_id` | String | Workflow correlation ID (`x-correlation-id`). |
| `source_module` | String | Module identifier (`organization`, `people`, `finance`, etc.). |
| `ip_address` | String | Optional client IP address for security logging. |
| `user_agent` | String | Optional client user-agent string. |
| `created_at` | TIMESTAMPTZ | Immutable creation timestamp (UTC). |

---

## Domain Event Architecture & Outbox Pattern

### 1. Canonical Event Envelope

```json
{
  "eventId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "eventName": "financial_obligation.issued",
  "version": "1.0",
  "organizationId": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
  "entityType": "financial_obligation",
  "entityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "actorPersonId": "660e8400-e29b-41d4-a716-446655440011",
  "requestId": "req-12345-abc",
  "correlationId": "flow-98765-xyz",
  "occurredAt": "2026-09-13T17:40:00.000Z",
  "payload": {
    "title": "Full-Stack Tuition Fee",
    "netAmount": 45000.00,
    "state": "Issued"
  },
  "metadata": {
    "sourceModule": "finance"
  }
}
```

### 2. Transactional Outbox Lifecycle

To guarantee event delivery without introducing distributed message brokers:
1. **Stage & Persist**: When a domain service mutates state inside a database transaction (`BEGIN...COMMIT`), it inserts the event payload into `event_outbox` with status `'Pending'`.
2. **Immediate In-Process Dispatch**: Upon successful transaction commit, the service notifies `eventBus` to dispatch the event synchronously to in-process subscribers.
3. **Outbox Processor Fallback**: A background outbox worker polls `event_outbox` for any un-dispatched events (e.g., due to process crash prior to in-process dispatch) and dispatches them, updating status to `'Dispatched'` or marking retry status.
4. **Idempotent Handlers**: Consumers track processed event IDs in `event_consumer_records` to prevent duplicate execution upon retries.

---

## Audit Coverage Matrix

Mutations across all M1–M9 engines are mapped to mandatory audit actions and domain events:

| Module | Engine Entity | Action Code | Domain Event Name | Audit Payload Scope |
|--------|---------------|-------------|-------------------|---------------------|
| M1 | Organization / Branch / BU | `ORGANIZATION_UPDATED`, `BRANCH_CREATED` | `organization.updated`, `branch.created` | Name, code, active status |
| M2 | Person / Employment | `PERSON_CREATED`, `EMPLOYMENT_ASSIGNED` | `person.created`, `employment.assigned` | Name, email, role, manager ID |
| M3 | Assignment | `ASSIGNMENT_CREATED`, `ASSIGNMENT_UPDATED` | `assignment.created`, `assignment.updated` | Person, target, capacity, dates |
| M4 | Project / Task | `PROJECT_CREATED`, `TASK_COMPLETED` | `project.created`, `task.completed` | Title, status, priority, dates |
| M5 | Work Record / Outcome | `WORK_RECORDED`, `OUTCOME_DELIVERED` | `work.recorded`, `outcome.delivered` | Title, duration, category, project |
| M6 | Meeting | `MEETING_SCHEDULED`, `MEETING_COMPLETED` | `meeting.scheduled`, `meeting.completed` | Title, time, participants, action items |
| M7 | Learning Program / Review | `ENROLLMENT_CREATED`, `REVIEW_COMPLETED` | `learning.enrolled`, `learning.review.completed` | Program, student, milestones, decisions |
| M8 | Evaluation | `EVALUATION_COMPLETED`, `TEMPLATE_CREATED` | `evaluation.completed`, `evaluation.template.created` | Person, template, scores, decision |
| M9 | Finance Obligation / Txn | `OBLIGATION_ISSUED`, `TRANSACTION_POSTED` | `financial_obligation.issued`, `financial_transaction.posted` | Amounts, direction, party, allocations |

---

## Sensitive Data Redaction Pipeline

All payload data passed to `AuditService.recordLog` or `eventBus.publish` passes through a strict sanitization processor:

```text
Raw Payload ──► Redaction Filter ──► Truncation Filter ──► Persisted Log / Event Payload
```

1. **Scrub Keys**: Any key matching `password`, `passcode`, `token`, `jwt`, `secret`, `apiKey`, `creditCard`, `cvv`, `ssn`, `authHeader` is replaced with `'[REDACTED]'`.
2. **Payload Size Cap**: Max payload size per JSONB record is capped at **64 KB**. Oversized payloads are automatically truncated with a `_truncated: true` metadata flag.
3. **State Delta Rules**: `before_state` and `after_state` record field-level diffs for updates rather than full multi-megabyte entity dumps.

---

## Security & Authorization Model

1. **Audit Access Control**:
   - Access to audit endpoints (`/api/v1/audit`) requires explicit permission: `audit:view`.
   - Role alone (Founder, Manager, Tech Lead) does **NOT** grant implicit audit search authority.
2. **Strict Multi-Tenant Isolation**:
   - Audit logs are scoped by `organization_id`.
   - Cross-tenant queries return **404 Not Found** without leaking record existence.
3. **System & Impersonation Audit**:
   - Background tasks, automated schedules, or admin impersonations record both `actor_id` (initiating user) and `actor_person_id` (contextual person) alongside `metadata.isSystem = true`.

---

## Non-Goals

Milestone 10 explicitly excludes:
- External distributed event streams (Apache Kafka, RabbitMQ, NATS).
- Analytics dashboards or reporting UI (reserved for M11 Analytics).
- Email, SMS, or Push notifications (out of scope for core OS engines).
- Real-time AI stream ingestion or LLM processing.
- General Ledger or double-entry financial audit reconciliation.

---
*Prepared for Milestone 10 – Audit & Events Hardening Architecture.*
