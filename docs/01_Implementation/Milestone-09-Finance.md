# Milestone 9 — Finance Engine

## Status

**Completed and Verified.**

## Summary of Implementation

The Milestone 9 Finance Engine has been fully implemented in `src/modules/finance/` following the frozen architecture specifications:

- **Migration**: `migrations/009_finance_m9_schema.sql` defining 8 relational tables (`finance_categories`, `financial_parties`, `financial_obligations`, `financial_obligation_items`, `financial_transactions`, `financial_allocations`, `financial_adjustments`, `financial_budgets`) with exact `NUMERIC(15,4)` money precision, FK constraints, indexes, and tenant scoping.
- **Domain Engine**: Clean entities and state machine validators in `src/modules/finance/domain/` supporting draft-issue-paid obligation lifecycle, posted transaction immutability, compensating reversal/refund entries, allocation settlement, and adjustment handling.
- **Repositories & Services**: Implemented clean data access and application logic in `infrastructure/` and `application/` with full audit logging via `AuditService.recordLog` and event publishing via `eventBus.publish`.
- **API Endpoints**: Exposed REST resources under `/api/v1/finance/` for categories, parties, obligations, transactions, allocations, adjustments, and budgets.
- **Tenant Isolation**: Strictly enforced 404 responses for cross-tenant access.
- **Tests & Verification**: Verified via unit tests (`tests/unit/finance-entity.test.ts`), REST API integration tests (`tests/api/finance-api.test.ts`), and tenant isolation tests (`tests/tenant-isolation/finance-tenant-isolation.test.ts`).

## Objective

Introduce the operational **Finance Engine** for DeVoc OS. The Finance Engine manages financial obligations, transactions, allocations, payments, refunds, adjustments, line items, categories, and operational budgets across all Business Units (Academy, IT Solutions, Operations) without creating separate, fragmented finance subsystems.

## Core Architectural Principle

DeVoc OS does **NOT** build separate financial engines for:
- Student Academy fees / EMI / discounts / fines
- Client project billing & invoices
- Freelancer, trainer, mentor payables
- Vendor expenses & operational costs
- Business unit revenue and expense tracking

All financial activity flows through one **generic operational Finance Engine**.

```
Financial Party ──► Financial Obligation ──► Obligation Items
                         │                         │
                         ▼                         ▼
               Financial Allocation ◄── Financial Transaction
                         │
                         ▼
                 Balance / Status
```

Contextual dimensions: `Branch + Business Unit + Department + Project`.

---

## Domain Boundaries

- **M1 Organization** owns tenant structure, branches, business units, departments.
- **M2 People** owns user identity and person records. `FinancialParty` references existing `Person` records for internal people without duplicating identity data.
- **M3 Assignments** owns contextual assignments and capacity. `Assignment` may determine financial authority or payee context.
- **M4 Projects & Tasks** owns project definitions. Obligations and budgets may optionally link to `Project`.
- **M5 Work** owns logged work activity. Work records can be referenced as evidence for freelancer/trainer/client payables without duplicating work entries.
- **M6 Meetings** owns meeting records.
- **M7 Learning** owns student enrollments and learning programs. Academy fee obligations link to `LearningEnrollment` via contextual references.
- **M8 Evaluation** owns performance evaluations.
- **M9 Finance** owns obligations, items, transactions, allocations, adjustments, categories, and operational budgets.

---

## Financial Parties

A `FinancialParty` represents any entity engaging in financial transactions with the organization:
- **Person** (Student, Freelancer, Trainer, Mentor, Employee, Founder)
- **Organization / Client** (External client company, partner)
- **Vendor** (Third-party software provider, cloud hosting vendor, landlord)

Where an internal `Person` or tenant `Organization` exists, `FinancialParty` references the existing entity via its primary key and tenant resolution. Duplication of personal or contact information is strictly prohibited.

---

## Financial Obligations

An obligation represents money expected to be received (receivable) or paid (payable).

Examples:
- **Academy**: Student Course Fee, EMI Installment, Late Fee, Fine
- **IT Solutions**: Client Invoice, Milestone Billing, Maintenance Fee
- **Operations**: Freelancer Payable, Trainer Stipend, Vendor Invoice, Cloud Hosting Expense

An Obligation supports:
- Organization & Party reference
- Direction (`receivable` vs `payable`)
- Category & Status
- Monetary Amount & Currency
- Issue Date & Due Date
- Line Items (breakdown of gross, discounts, fees, net)
- Contextual references (`branch_id`, `business_unit_id`, `department_id`, `project_id`, `target_type`, `target_id`)
- Metadata & Audit references

---

## Obligation Line Items

Line items provide explicit itemization:
- **Original Amount** (Gross item charge)
- **Discount / Adjustment** (Referral discount, promo discount, early-bird waiver)
- **Late Fee / Fine** (Overdue penalty)
- **Final Amount Due** = `(Original Amount - Discounts + Fees)`

This guarantees clear auditability between gross billing and net receivable/payable amounts.

---

## Financial Transactions

A transaction represents an actual movement of money:
- Payment Received (Customer / Student payment)
- Payment Disbursed (Vendor / Freelancer / Trainer payment)
- Refund Disbursed (Student or client refund)
- Adjustment / Compensating Entry

### Transaction Immutability Strategy
Once a transaction is in `posted` status:
- **It CANNOT be edited or deleted.**
- Reversals, corrections, or refunds must be recorded as explicit compensating transactions (`reversed` or `refunded` status linking back to original `transaction_id`).
- All transactions maintain strict chronological ordering and full audit trail.

---

## Financial Allocations

Transactions and Obligations are decoupled:
- A `FinancialTransaction` represents money moved.
- A `FinancialAllocation` defines how much of that transaction settles which specific `FinancialObligation` (or line item).

Scenario: Student pays ₹25,000 in a single transaction.
- Allocation 1: ₹20,000 allocated to Course Fee Obligation #101.
- Allocation 2: ₹5,000 allocated to Late Fee Obligation #102.

This design cleanly handles:
- Partial payments
- Multi-obligation single payments
- Overpayments (unallocated transaction balance)
- Historical auditability without mutating obligation definitions

---

## Financial Lifecycle State Machines

### Obligation State Machine
```
Draft ──► Issued ──► PartiallyPaid ──► Paid
  │         │
  └─────────┴──────► Cancelled / Overdue
```
- **Draft**: Created, editable by authorized finance roles.
- **Issued**: Finalized, notification/billing active. Immutable core fields.
- **PartiallyPaid**: At least one allocation posted, remaining balance > 0.
- **Paid**: Fully settled via allocations (balance = 0).
- **Overdue**: Due date passed with remaining balance > 0 (computed or triggered).
- **Cancelled**: Voided prior to full settlement; terminal state.

### Transaction State Machine
```
Pending ──► Posted ──► Reversed / Refunded
   │
   └──► Voided
```
- **Pending**: Initiated, awaiting bank/cash confirmation.
- **Posted**: Confirmed money movement; immutable.
- **Reversed**: Compensated via explicit reversal transaction.
- **Voided**: Cancelled prior to posting; terminal.

---

## Money, Currency & Precision Rules

To prevent floating-point inaccuracies:
- All monetary amounts are stored in SQL using **`NUMERIC(15,4)`** (supporting exact decimal representation up to 4 decimal places).
- Amounts rendered to clients use standard 2-decimal formatting (e.g., ISO currency standard).
- Calculations (summation, allocation balance checks) use exact decimal arithmetic.
- Storage includes ISO 4217 3-letter currency code (e.g., `INR`, `USD`). Default operational currency is `INR`.
- Timestamps use UTC (`TIMESTAMPTZ`).

---

## Operational Budgets

Simple operational budget tracking per Business Unit, Department, or Project for a specified financial period:
- `budget_amount`
- `allocated_amount`
- `spent_amount` (derived from posted payable transactions)
- `period_start` & `period_end`

---

## Authorization Model

Reuses DeVoc OS contextual authorization **Role + Business Unit + Team + Project**.

Finance-specific contextual permissions:
- `finance:view` – View obligations, transactions, balances
- `finance:obligation:create` – Create draft obligations
- `finance:obligation:issue` – Issue obligations
- `finance:transaction:record` – Record pending transactions
- `finance:transaction:post` – Confirm/post transactions
- `finance:refund:approve` – Approve refunds and reversals
- `finance:budget:manage` – Create and manage operational budgets

Having a Manager, Founder, or Tech Lead role does **NOT** grant implicit financial modification rights unless explicitly permitted in context.

---

## Tenant Isolation

All finance entities carry `organization_id`. Validation ensures:
```
request.organization_id == party.organization_id == obligation.organization_id == transaction.organization_id == allocation.organization_id
```
Cross-tenant accesses return **404 Not Found** without revealing record existence.

---

## Audit & Events

Emits domain events via in-process `eventBus`:
- `financial_obligation.created`
- `financial_obligation.issued`
- `financial_obligation.paid`
- `financial_obligation.cancelled`
- `financial_transaction.posted`
- `financial_transaction.reversed`
- `financial_allocation.created`
- `financial_budget.updated`

All events automatically flow into `audit_logs` via `AuditService`.

---

## Non-Goals

M9 explicitly excludes:
- Full general ledger / chart of accounts / double-entry bookkeeping
- Tax filing / GST submission / compliance reporting
- Payroll calculation & tax withholding
- Payment gateway API integration (Stripe, Razorpay, etc.)
- Bank reconciliation feeds
- Advanced financial AI forecasting

---
*Prepared for Milestone 9 – Finance Engine Architecture.*
