# API Contracts – Finance Engine (M9)

All finance endpoints live under `/api/v1/finance` (or org-scoped `/api/v1/organizations/:organizationId/finance`) and return the standard JSON envelope:
```json
{"data": {...}, "meta": {...}}
```

---

## 1. Categories Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/finance/categories` | List finance categories for organization. | `finance:view` |
| `POST` | `/api/v1/finance/categories` | Create new revenue/expense category. | `finance:budget:manage` |
| `PUT` | `/api/v1/finance/categories/:id` | Update/deactivate category. | `finance:budget:manage` |

---

## 2. Parties Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/finance/parties` | List financial parties (clients, vendors, person-linked). | `finance:view` |
| `POST` | `/api/v1/finance/parties` | Create or link a financial party. | `finance:obligation:create` |
| `GET` | `/api/v1/finance/parties/:id` | Get party details and total statement balance. | `finance:view` |

---

## 3. Obligations Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/finance/obligations` | List obligations (filters: `partyId`, `direction`, `state`, `projectId`, `businessUnitId`). | `finance:view` |
| `POST` | `/api/v1/finance/obligations` | Create new financial obligation in **Draft** state. | `finance:obligation:create` |
| `GET` | `/api/v1/finance/obligations/:id` | Get single obligation with line items, allocations, adjustments. | `finance:view` |
| `PATCH` | `/api/v1/finance/obligations/:id` | Update mutable fields in **Draft** state. | `finance:obligation:create` |
| `POST` | `/api/v1/finance/obligations/:id/issue` | Transition state from **Draft** to **Issued**. | `finance:obligation:issue` |
| `POST` | `/api/v1/finance/obligations/:id/cancel` | Cancel obligation prior to full payment. | `finance:obligation:issue` |

---

## 4. Transactions Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/finance/transactions` | List financial transactions. | `finance:view` |
| `POST` | `/api/v1/finance/transactions` | Record payment, refund, or disbursemnt (Pending/Posted). | `finance:transaction:record` |
| `GET` | `/api/v1/finance/transactions/:id` | Get transaction details and allocation breakdown. | `finance:view` |
| `POST` | `/api/v1/finance/transactions/:id/post` | Post a pending transaction. | `finance:transaction:post` |
| `POST` | `/api/v1/finance/transactions/:id/reverse` | Reverse a posted transaction via compensating transaction. | `finance:refund:approve` |

---

## 5. Allocations & Adjustments Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `POST` | `/api/v1/finance/allocations` | Allocate unallocated posted transaction funds to an obligation. | `finance:transaction:post` |
| `GET` | `/api/v1/finance/allocations` | List allocations for an obligation or transaction. | `finance:view` |
| `POST` | `/api/v1/finance/adjustments` | Add waiver, late fee, fine, or credit/debit adjustment. | `finance:obligation:issue` |

---

## 6. Budgets Endpoints

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/finance/budgets` | List operational budgets by Business Unit, Department, or Project. | `finance:view` |
| `POST` | `/api/v1/finance/budgets` | Create operational budget period allocation. | `finance:budget:manage` |
| `PUT` | `/api/v1/finance/budgets/:id` | Update budget amount or period status. | `finance:budget:manage` |

---

## Validation & Security

- **Tenant Isolation**: `x-organization-id` header or token context is validated against every entity ID. Mismatches return `404 Not Found`.
- **Validation**: Inputs verified for valid UUID formats, positive decimal amounts (`NUMERIC(15,4)` compatible), valid `payment_mode`, and allowed state machine transitions.

---

## Error Handling

Standard error envelope:
```json
{
  "error": {
    "code": "FIN_002",
    "message": "Allocation amount exceeds available unallocated transaction balance",
    "details": {
      "transactionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "requestedAmount": 10000.0,
      "unallocatedAmount": 5000.0
    },
    "request_id": "c0a80101-8b9a-4f12-9c12-3a4b5c6d7e8f"
  }
}
```

Common error codes:
- `FIN_001` – Unauthorized financial operation
- `FIN_002` – Invalid allocation or balance overflow
- `FIN_003` – State transition violation (e.g. editing posted transaction)
- `FIN_004` – Currency mismatch in allocation

---
*Prepared for Milestone 9 – Finance Engine API Contracts.*
