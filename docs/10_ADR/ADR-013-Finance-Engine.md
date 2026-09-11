# ADR-013 – Operational Finance Engine Architecture

**Status:** Proposed (to be reviewed)

## Context
DeVoc OS requires financial tracking across multiple operational units:
- DeVoc Academy (student tuition fees, EMI schedules, discounts, late fees, fines)
- IT Solutions (client project milestone billing, maintenance retainers, software licensing)
- Operations (freelancer payments, trainer stipends, mentor stipends, cloud infrastructure, office expenses)

Creating separate review or payment systems for each Business Unit would violate the core modular-monolith architectural principles of DeVoc OS, leading to duplicated database logic, inconsistent audit trails, and security vulnerabilities. Conversely, attempting to build a full double-entry accounting general ledger (GL), tax filing suite, or payment gateway integration in Milestone 9 would introduce unnecessary complexity beyond operational requirements.

## Decision
Introduce a **single, generic operational Finance Engine** (Milestone 9) based on the core model:
```
Financial Party ──► Financial Obligation ──► Obligation Items
                         │                         │
                         ▼                         ▼
               Financial Allocation ◄── Financial Transaction
                         │
                         ▼
                 Balance / Status
```

### Key Decisions:
1. **Generic Operational Engine**: Academy fees, client invoices, freelancer payables, and vendor expenses use the exact same normalized tables (`financial_obligations`, `financial_transactions`, `financial_allocations`).
2. **Transaction Immutability**: Once a `FinancialTransaction` is `Posted`, it can **never** be edited or deleted. Financial corrections must be performed using explicit compensating transactions (`Reversed` or `Refunded`).
3. **Allocation Decoupling**: Transactions are separated from obligations. `FinancialAllocation` maps transaction amounts to obligations, enabling partial payments, multi-obligation single payments, and unallocated overpayments.
4. **Monetary Precision**: All persisted monetary values use PostgreSQL **`NUMERIC(15,4)`** for exact decimal arithmetic. Floating-point numbers are strictly forbidden for financial calculations.
5. **Contextual Authorization**: Finance permissions (`finance:view`, `finance:obligation:create`, `finance:transaction:post`, `finance:budget:manage`) are granted contextually per Business Unit or Project. Role alone (Founder, Manager, Mentor) does not grant implicit financial modification rights.
6. **Tenant Isolation**: All entities carry `organization_id`. Cross-tenant requests return `404 Not Found`.
7. **Audit & Event Trail**: Financial state changes publish domain events (`financial_obligation.created`, `financial_transaction.posted`, `financial_allocation.created`) which automatically persist into audit logs.

## Consequences

### Positive
- Unified data model reduces database complexity and eliminates code duplication across Business Units.
- Transaction immutability guarantees strict financial auditability and compliance.
- Allocation pattern cleanly handles real-world payment scenarios (partial payment, multi-bill settlement, overpayment).
- Exact decimal math prevents rounding errors.

### Negative
- Developers must use allocations rather than directly mutating obligation amounts.
- Reversal workflow requires recording explicit compensating transactions instead of simple edits.

## Compliance with M1–M8 Architecture
- **M1 Organization**: Reuses `Organization`, `Branch`, `BusinessUnit`, `Department`.
- **M2 People**: `FinancialParty` references `person_id` for internal people.
- **M3 Assignments**: Reuses assignment context for finance authority checks.
- **M4 Projects & Tasks**: Financial obligations and budgets link to `project_id`.
- **M5 Work**: Work records can be attached as evidence to obligations.
- **M7 Learning**: Enrollments can be referenced as target context for course fee obligations.
- **M8 Evaluation**: Keeps evaluation separate; performance reviews do not mutate financial records directly.

---
*Prepared for Milestone 9 – Finance Engine Architecture.*
