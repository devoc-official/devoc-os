# ADR-019: Attendance, Leave & Workforce Time Engine Architecture

## Status

**Proposed / Frozen Architecture**

---

## 1. Context

DeVoc OS requires an operational engine to govern work schedules, daily presence/attendance, workforce time intervals, periodic timesheets, employee leave, holiday calendars, and forward-looking workforce availability.

In the absence of a dedicated architectural standard, workforce time tracking risks introducing serious architectural degradations:
1. Conflating workforce presence with M5 Work deliverable contributions (e.g. attempting to auto-generate task work logs from clock-in duration).
2. Entangling operational time tracking with enterprise payroll calculations (e.g. wage rates, overtime multipliers, tax deductions, banking).
3. Duplicating employee and person models from M2 People.
4. Prematurely mutating M3 Assignment staffing or capacity allocations automatically.
5. Allowing uncontrolled in-place edits to historical attendance, violating auditability.

---

## 2. Decision

We establish **Milestone 15 — Attendance, Leave & Workforce Time Engine** governed by the following foundational decisions:

### 2.1 Identity & Employment Primacy (M2 Boundary)
M15 shall **NOT** create duplicate `Person` or `Employee` records. All schedules, schedule assignments, attendance records, time sessions, timesheets, leave balances, and leave applications strictly reference M2 `people` (`person_id`) and M2 `employments` (`employment_id`). M15 respects the authoritative employment status maintained by M2/M14 (`probation`, `active`, `suspended`, `terminated`, `resigned`).

### 2.2 Strict Work Contribution Isolation (M5 Boundary)
Workforce time and attendance represent **presence and elapsed duration**. M5 Work records represent **qualitative output, deliverables, task completion, and evidence**.
* M15 MUST **NEVER** automatically generate M5 Work records from attendance check-ins or timesheets.
* M15 MUST **NEVER** duplicate or absorb M5 Work logging.
* Cross-domain insights (e.g. workforce time spent vs work outcome delivered) are evaluated strictly through M11 Analytics queries.

### 2.3 Read-Only Availability Signals for Assignment Planning (M3 Boundary)
M15 projects net available capacity:
$$\text{Available Capacity} = \text{Scheduled Capacity} - \text{Holidays} - \text{Approved Leave}$$
This projection serves as an operational decision-support signal for M3 Assignment Engine. M15 shall **NOT** automatically reassign people, modify assignments, change project teams, or alter capacity allocations. M3 remains the sole source of truth for assignments.

### 2.4 Complete Exclusion of Payroll and Compensation (M9 Boundary)
M15 records operational workforce hours, regular hours, and overtime hours. It contains **ZERO** payroll functionality:
* No salary, hourly wage, or compensation calculation.
* No overtime pay multipliers (e.g. 1.5x, 2.0x).
* No tax withholdings, benefits deductions, or gross/net pay slips.
* No banking or payout executions.
Overtime approval is treated strictly as an operational sign-off of elapsed time.

### 2.5 Multi-Session Attendance & Explicit Break Tracking
* Attendance supports multiple check-in/check-out sessions within a single calendar date via `attendance_sessions`.
* **Canonical Break Tracking**: Breaks are stored as explicit time records in `workforce_time_records` with `time_type = 'break'`. We reject deriving breaks from session gaps because explicit records provide first-class auditable intervals and support statutory break compliance tracking.
* Time intervals must satisfy `ended_at > started_at` and non-overlapping regular work intervals for the same employment.

### 2.6 Append-Only Attendance Corrections (M10 Boundary)
Historical attendance records are never silently modified. Any missed clock-out resolution, punch adjustment, or time correction requires an immutable `attendance_corrections` entry containing original values, proposed values, business rationale, requesting user, and supervisor approval, linked directly to M10 audit logs.

### 2.7 Leave Balance Accounting & Reservation Engine
Leave balances follow double-entry reservation mathematics:
$$\text{available\_balance} = \text{opening\_balance} + \text{accrued\_balance} + \text{adjusted\_balance} - \text{used\_balance} - \text{reserved\_balance}$$
* Submitting a leave request reserves balance.
* Approving a leave request commits reserved balance to used balance.
* Rejecting or cancelling releases reserved balance back to available balance.
* Negative balances are rejected unless explicitly allowed by the specific leave type policy.

### 2.8 Branch-Aware Holiday Scoping
Holidays in `workforce_holidays` are scoped to `organization_id` with an optional `branch_id`. If `branch_id IS NULL`, the holiday applies organization-wide; if populated, it applies strictly to personnel assigned to that operational branch.

### 2.9 Centralized Capability Authorization Model
All M15 endpoints enforce permissions via `requireCapability()` in `src/permissions/permissions.middleware.ts`:
* `workforce_time:view`
* `workforce_time:create`
* `workforce_time:manage`
* `workforce_time:approve`
* `workforce_time:admin`
Granular capabilities (e.g. `attendance:create`, `leave:approve`) are strictly prohibited.

### 2.10 Transactional Outbox Pattern (M10 Boundary)
All state mutations follow transactional outbox semantics (`withTransaction` $\rightarrow$ DB mutation $\rightarrow$ audit log $\rightarrow$ outbox event staging $\rightarrow$ `COMMIT` $\rightarrow$ post-commit event dispatch). Pre-commit event publishing is strictly forbidden.

### 2.11 Analytics Registry Integration (M11 Boundary)
M15 registers operational sources in `ANALYTICS_SOURCE_REGISTRY` without implementing custom dashboards or parallel reporting frameworks.

---

## 3. Alternatives Considered & Rejected

| Alternative | Reason for Rejection |
| :--- | :--- |
| **Auto-generating M5 Work records from Attendance** | Fundamentally violates DeVoc OS philosophy. Presence is not contribution. Work records require meaningful qualitative outcomes and evidence, not automated duration clones. |
| **Deriving breaks as gaps between attendance sessions** | Fragile and prone to misinterpretation. Fails to distinguish between off-premise breaks and idle departures, and cannot distinguish paid from unpaid break allocations. |
| **Embedding payroll calculations into timesheets** | Breaks bounded context principles. Payroll belongs to a specialized finance/compensation engine. Conflating time tracking with compensation risks compliance violations and architectural bloat. |
| **Single global holiday calendar** | Unacceptable for multi-branch organizations operating across different regional or national statutory calendars. |
| **Automating M3 Assignment reassignment on leave approval** | High risk of unintended operational disruption. Project staffing requires human judgment; M15 must expose availability data, not usurp staffing authority. |

---

## 4. Consequences

### 4.1 Positive
* Establishes a robust, auditable presence and time tracking backbone without duplicating identity or employment entities.
* Cleanly isolates operational workforce time from qualitative work contribution (M5).
* Provides clear forward-looking capacity signals to M3 without introducing risky automated staffing mutations.
* Eliminates payroll bloat from core operational time tracking.
* Guarantees complete auditability and multi-tenant security across all time and leave workflows.

### 4.2 Negative / Trade-offs
* Cross-domain availability queries require service-level aggregation across schedules, holidays, and approved leave records.
* Multi-session attendance and explicit break recording require client applications to submit separate check-in, check-out, and break interval events.

---

## 5. Explicit Non-Goals

The following areas are explicitly out of scope for M15:
* Payroll, wages, pay rates, salary slips, or compensation processing.
* Biometric hardware drivers, fingerprint readers, or facial recognition integration.
* GPS employee tracking or continuous geofencing surveillance.
* Automatic generation of M5 Work records.
* Automatic modification of M3 Assignments or Project staffing.
* Analytics dashboards, chart rendering, or business intelligence reporting.
* Video conferencing, chat, or external calendar integrations (Google Calendar, Outlook).
* Microservices or distributed messaging buses.
