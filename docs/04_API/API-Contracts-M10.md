# API Contracts – Audit & Events (M10)

All audit endpoints live under `/api/v1/audit` (or org-scoped `/api/v1/organizations/:organizationId/audit`) and return the standard JSON envelope:
```json
{"data": {...}, "meta": {...}}
```

---

## 1. Audit Log Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/audit` | Query audit logs for organization (filters: `entityType`, `entityId`, `actorId`, `action`, `startDate`, `endDate`, `correlationId`, `limit`, `offset`). | `audit:view` |
| `GET` | `/api/v1/audit/:id` | Get detailed audit record by ID (includes before/after state diff). | `audit:view` |
| `GET` | `/api/v1/audit/entities/:entityType/:entityId` | Get chronological audit timeline for a specific entity. | `audit:view` |

---

## 2. Event Registry & Outbox Health Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/audit/events/registry` | List registered domain events and version contracts. | `audit:view` |
| `GET` | `/api/v1/audit/events/outbox` | Get event outbox status summary (Pending, Dispatched, Failed, DeadLettered count). | `audit:view` |
| `POST` | `/api/v1/audit/events/outbox/:id/retry` | Re-queue a failed/dead-lettered outbox event for retry. | `audit:manage` |

---

## Request & Filter Specs

### 1. `GET /api/v1/audit`
Query Parameters:
- `entityType` (optional, string): e.g., `financial_obligation`, `evaluation`, `person`
- `entityId` (optional, UUID): e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `actorId` (optional, UUID): initiating user ID
- `action` (optional, string): e.g., `TRANSACTION_POSTED`, `REVIEW_COMPLETED`
- `correlationId` (optional, string): workflow correlation ID
- `startDate` (optional, ISO 8601 string)
- `endDate` (optional, ISO 8601 string)
- `limit` (optional, integer, default 50, max 100)
- `offset` (optional, integer, default 0)

Sample Response:
```json
{
  "data": [
    {
      "id": "7890abcd-e5f6-7890-abcd-ef1234567890",
      "organizationId": "7c787ecc-c8ab-42f2-8a46-1a9a63d55cca",
      "actorId": "550e8400-e29b-41d4-a716-446655440000",
      "actorPersonId": "660e8400-e29b-41d4-a716-446655440011",
      "action": "TRANSACTION_POSTED",
      "entityType": "financial_transaction",
      "entityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "beforeState": { "state": "Pending" },
      "afterState": { "state": "Posted" },
      "payload": { "amount": 25000.0, "paymentMode": "bank_transfer" },
      "requestId": "req-12345-abc",
      "correlationId": "flow-98765-xyz",
      "sourceModule": "finance",
      "createdAt": "2026-09-13T17:40:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Validation & Security

- **Tenant Isolation**: `x-organization-id` header or token context is validated against every audit query. Mismatches return `404 Not Found`.
- **Authorization**: Access requires explicit permission `audit:view` or `audit:manage`.
- **Payload Redaction**: Responses automatically strip sensitive keys (`password`, `token`, `secret`, `apiKey`).

---
*Prepared for Milestone 10 – Audit & Events API Contracts.*
