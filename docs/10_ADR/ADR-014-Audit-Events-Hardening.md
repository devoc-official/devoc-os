# ADR-014 – Audit & Domain Events Hardening Architecture

**Status:** Proposed (to be reviewed)

## Context

Across Milestones 1 through 9, DeVoc OS implemented basic cross-cutting audit logging (`AuditService` and `audit_logs` table) and in-process domain event publishing (`eventBus`). As the system expands across multi-tenant Organization, People, Assignments, Projects, Work, Meetings, Learning, Evaluation, and Finance engines, the current cross-cutting infrastructure faces three operational vulnerabilities:
1. **Dual-Write Failure Risk**: If a domain service mutates PostgreSQL state inside a database transaction but the in-process event dispatch or audit log write fails post-commit (or if process crashes between mutation and logging), audit history or domain events are permanently lost.
2. **Audit Schema Gaps**: The original `audit_logs` schema lacks structured fields for `actor_person_id`, `before_state`, `after_state`, `correlation_id`, `source_module`, and automated sensitive payload redaction.
3. **Lack of Event Idempotency & Delivery Guarantees**: Subscribers receiving domain events have no mechanism to guarantee at-least-once delivery or prevent duplicate processing upon system retries.

Introducing external message brokers (e.g., Apache Kafka, RabbitMQ, NATS) would violate DeVoc OS core architectural principles by adding unnecessary infrastructure operational overhead to the modular monolith.

## Decision

Harden the existing single, cross-cutting **Audit & Domain Events Infrastructure** (Milestone 10) through seven foundational architectural decisions:

1. **Transactional Outbox Pattern**: Event records are inserted into an `event_outbox` table within the **same** PostgreSQL database transaction (`BEGIN...COMMIT`) that mutates business entities. This guarantees atomic event persistence without dual-write risk.
2. **Immutable Append-Only Audit Trail**: `audit_logs` records represent historical truth and can **NEVER** be updated or deleted. Corrections generate new audit log entries referencing the original log ID.
3. **Enriched Audit Schema**: Hardens `audit_logs` to include `actor_person_id`, `before_state` diffs, `after_state` diffs, `correlation_id`, `source_module`, `ip_address`, and `user_agent`.
4. **Dual-Path Event Dispatch Engine**:
   - **Path A (Fast In-Process)**: Dispatches events to synchronous subscribers immediately following transaction commit.
   - **Path B (Outbox Worker Fallback)**: A background worker periodically polls `event_outbox` for any un-dispatched events (due to process restart or network blip) and dispatches them with exponential backoff retries.
5. **Consumer Idempotency**: Subscribers track processed event IDs in `event_consumer_records` using unique constraints on `(event_id, consumer_name)`.
6. **Automatic Sensitive-Data Sanitization**: Payload scrubber pipeline automatically replaces keys matching sensitive patterns (`password`, `token`, `secret`, `apiKey`, `creditCard`, `ssn`) with `'[REDACTED]'` before persistence.
7. **Strict Multi-Tenant Scoping**: All audit records, outbox events, and consumer records carry `organization_id`. Cross-tenant audit reads return **404 Not Found**.

## Consequences

### Positive
- Zero event loss and zero missing audit records even during unexpected process crashes.
- No external message broker infrastructure (Kafka/RabbitMQ) required; operates cleanly within PostgreSQL.
- Standardized, tenant-safe event stream ready for direct consumption by Milestone 11 Analytics.
- Complete end-to-end tracing via `request_id` and `correlation_id`.

### Negative
- Slightly higher database IO per business transaction due to writing to `audit_logs` and `event_outbox`.
- Domain services must pass `before_state` diffs when performing updates.

## Compliance with M1–M9 Architecture
- **M1 Organization**: Hardens initial `audit_logs` table schema without breaking existing reads.
- **M2–M9 Engines**: All existing domain event producers (`person.created`, `work.recorded`, `evaluation.completed`, `financial_transaction.posted`, etc.) remain 100% compatible.

---
*Prepared for Milestone 10 – Audit & Events Hardening Architecture.*
