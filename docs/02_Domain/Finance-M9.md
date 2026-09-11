# Finance Domain — M9

## Core Domain Entities

| Entity | Description |
|--------|-------------|
| **FinanceCategory** | Configurable, tenant-scoped category classification for revenues and expenses (e.g., Academy Fees, Client Billing, Freelancer Stipend, Cloud Infrastructure, Marketing). |
| **FinancialParty** | Represents an entity participating in financial transactions. Links to existing `Person` records or represents external clients/vendors without duplicating identity data. |
| **FinancialObligation** | Primary receivable or payable record. Defines total gross amount, discounts, fees, net amount, due date, status, and contextual organizational links. |
| **ObligationItem** | Line-item breakdown of an obligation (e.g., Course Fee, Late Fee, Discount, Hosting Fee). |
| **FinancialTransaction** | Represents an executed or pending movement of funds (payment received, payment disbursed, refund, reversal). |
| **FinancialAllocation** | Maps a specific monetary portion of a `FinancialTransaction` to settle a specific `FinancialObligation` (or line item). |
| **FinancialAdjustment** | Explicit financial modification (waiver, late fee addition, credit note) linked to an obligation. |
| **FinancialBudget** | Operational budget allocation for a Business Unit, Department, or Project over a designated time period. |

---

## Entity Relationships

```
Organization (M1) ──► FinanceCategory
Organization (M1) ──► FinancialParty ◄── Person (M2) [Optional FK]
                          │
                          ▼
                  FinancialObligation ──► ObligationItem
                          │                   │
                          ├──► FinancialAdjustment
                          │                   │
                          ▼                   ▼
                  FinancialAllocation ◄── FinancialTransaction
                          │
                          ▼
                 FinancialBudget ◄── Project (M4) / BusinessUnit (M1)
```

---

## Domain Rules & Invariants

### 1. Unified Operational Finance Model
All Business Units use the same `FinancialObligation`, `FinancialTransaction`, and `FinancialAllocation` domain models. No separate database tables exist for student fees vs client invoices.

### 2. Transaction Immutability
- Once a `FinancialTransaction` enters the `Posted` state, its `amount`, `currency`, `direction`, and `party_id` cannot be modified.
- To correct a posted transaction, an explicit compensating `FinancialTransaction` with state `Reversed` or `Refunded` must be created.

### 3. Allocation Settlement Integrity
- An allocation cannot exceed the unallocated balance of the `FinancialTransaction`.
- The sum of all active allocations against a `FinancialObligation` cannot exceed the obligation's net amount due (`gross - discounts + fees`).
- When total allocations equal net amount due, the obligation automatically transitions to `Paid`.

### 4. Precision & Exact Decimal Arithmetic
- Persisted monetary values use `NUMERIC(15,4)`.
- All domain calculations (total net, remaining balance, allocated total) perform exact decimal arithmetic. Floating-point division is forbidden.

### 5. Multi-Tenant Boundary Verification
- All entities reference `organization_id`.
- An allocation is invalid if `transaction.organization_id != obligation.organization_id`.

---

## State Machine Definitions

### Obligation State Transitions
- `Draft` → `Issued` (when obligation is finalized for billing/notice)
- `Issued` → `PartiallyPaid` (when first allocation is posted and balance > 0)
- `Issued` → `Paid` (when full balance is settled by allocation)
- `PartiallyPaid` → `Paid` (when final allocation settles remaining balance)
- `Issued` / `PartiallyPaid` → `Overdue` (when `due_at < NOW()` and balance > 0)
- `Draft` / `Issued` → `Cancelled` (when obligation is voided prior to full payment)
- `Paid` / `Cancelled` → *Terminal* (no arbitrary state changes)

### Transaction State Transitions
- `Pending` → `Posted` (when payment confirmation is received)
- `Pending` → `Voided` (when transaction is cancelled before posting)
- `Posted` → `Reversed` (when full transaction reversal is posted)
- `Posted` → `Refunded` (when refund transaction is processed)

---

## Cross-Domain Integration Boundaries

- **People Engine (M2)**: `FinancialParty` references `person_id` where applicable.
- **Assignments Engine (M3)**: Used for contextual finance authority checks (`finance:obligation:create`, `finance:transaction:post`).
- **Projects & Tasks (M4)**: Obligations and budgets link to `project_id`.
- **Work Engine (M5)**: Freelancer/trainer payables can reference `work_record_id` as supporting evidence.
- **Meetings Engine (M6)**: Meeting expenses reference `meeting_id`.
- **Learning Engine (M7)**: Student course fees reference `learning_enrollment_id` as target context.
- **Evaluation Engine (M8)**: Financial reviews use standard M8 templates; finance core remains separate.
- **Audit & Events (M1)**: All financial state changes trigger `eventBus` events and record audit log entries.

---
*Prepared for Milestone 9 – Finance Engine Architecture.*
