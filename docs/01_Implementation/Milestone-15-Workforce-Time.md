# Milestone 15 — Attendance, Leave & Workforce Time Implementation Specification

## Status

**Implemented & Validated — Full Test Suite Verified**

---

## 1. Purpose & Scope

Milestone 15 establishes the **Attendance, Leave & Workforce Time Engine** for DeVoc OS. It introduces the operational foundation for managing work schedules, recording employee presence, capturing raw workforce time sessions, aggregating periodic timesheets, orchestrating leave lifecycles and balances, maintaining holiday calendars, and projecting net workforce availability.

M15 operates as an operational support engine within the workforce backbone:

$$\text{Person (M2)} \longrightarrow \text{Employment (M2)} \longrightarrow \text{Work Schedule (M15)} \longrightarrow \text{Attendance (M15)} \longrightarrow \text{Workforce Time (M15)} \longrightarrow \text{Timesheet (M15)}$$

With leave as a dedicated availability constraint engine:

$$\text{Person (M2)} \longrightarrow \text{Leave Request (M15)} \longrightarrow \text{Approved Leave (M15)} \longrightarrow \text{Workforce Availability (M15 Projection)}$$

While actual work delivery and task execution remains strictly isolated in M5:

$$\text{Person (M2)} \longrightarrow \text{Assignment (M3)} \longrightarrow \text{Project / Task (M4)} \longrightarrow \text{Work & Outcomes (M5)}$$

---

## 2. Key Boundaries & Architectural Invariants

1. **Identity & Employment Primacy (M2 Boundary)**: M15 does NOT create duplicate `Person` or `Employee` records. All schedules, attendance records, time entries, timesheets, leave balances, and leave requests strictly reference M2 `people` (`person_id`) and M2 `employments` (`employment_id`).
2. **Work Contribution Separation (M5 Boundary)**: M15 Workforce Time represents **presence and elapsed working duration** (e.g. 09:00–17:00 = 8 hours). M5 Work records represent **discrete task and project contribution with qualitative outcomes and evidence**. M15 MUST NOT automatically generate M5 Work records from attendance or time sessions, and M15 does not absorb M5 work logs.
3. **Assignment Primacy & Read-Only Availability (M3 Boundary)**: M15 calculates net availability ($\text{Scheduled Hours} - \text{Holidays} - \text{Approved Leave}$). This availability data feeds M3 Assignment capacity as a read-only decision support signal. M15 MUST NOT automatically reassign personnel, modify assignments, change project teams, or alter capacity allocations.
4. **No Payroll or Financial Calculation (M9 Boundary)**: M15 records workforce time, regular hours, and overtime hours. It contains ZERO payroll functionality: no salary computation, no wage multipliers, no tax/withholding calculations, no benefit deductions, and no banking transactions. Overtime is strictly tracked and approved as operational time.
5. **Multi-Session Attendance & Explicit Breaks**: Attendance models daily presence. A person may record multiple check-in/check-out sessions in a single day (e.g. 09:00–12:30 and 14:00–18:00). Breaks are canonically stored as explicit time records with `time_type = 'break'`, preventing ambiguous derived gaps.
6. **Append-Only Attendance Corrections (M10 Boundary)**: Historical attendance records are never silently mutated in-place. All manual corrections, missed check-out rectifications, or manager adjustments are recorded via immutable `attendance_corrections` records linked to M10 audit logs.
7. **Leave Balance Invariant**: Leave balances follow an explicit accounting model:
   $$\text{Available Balance} = \text{Opening Balance} + \text{Accruals} + \text{Adjustments} - \text{Used} - \text{Reserved}$$
   Submitting a leave request reserves balance; approval commits it to used; rejection/cancellation releases reserved balance back to available.
8. **M10 Transactional Outbox Pattern**: Every domain mutation executes within a database transaction (`withTransaction`), atomically staging audit logs (`audit_logs`) and outbox events (`event_outbox`) before commit and immediate post-commit event dispatching.
9. **Branch-Aware Holiday Calendars**: Holidays are scoped to `organization_id` with an optional `branch_id`, supporting regional, national, and site-specific operational calendars rather than assuming a single global calendar.
10. **Tenant Isolation Guarantee**: All queries, foreign keys, and mutation paths enforce strict tenant scoping (`organization_id`). Cross-tenant access attempts return HTTP `404 Not Found` without disclosing record existence.

---

## 3. Conceptual Architecture & Operational Flow

```text
                        ┌────────────────────────────────────────────────────────┐
                        │             M2 People & Employment Engine              │
                        └──────────────────────────┬─────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           M15 Workforce Time Engine Core Domains                                │
│                                                                                                 │
│  ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐  │
│  │   Workforce Schedule    │      │    Workforce Holiday    │      │    Leave Policy & Type  │  │
│  │ (Fixed / Flexible Days) │      │  (Org / Branch Scoped)  │      │  (Configured via M12)   │  │
│  └────────────┬────────────┘      └────────────┬────────────┘      └────────────┬────────────┘  │
│               │                                │                                │               │
│               ▼                                │                                ▼               │
│  ┌─────────────────────────┐                   │                   ┌─────────────────────────┐  │
│  │   Schedule Assignment   │                   │                   │   Leave Request Flow    │  │
│  │ (Employment Association)│                   │                   │ (Draft→Submitted→Apprv) │  │
│  └────────────┬────────────┘                   │                   └────────────┬────────────┘  │
│               │                                │                                │               │
│               ▼                                │                                ▼               │
│  ┌─────────────────────────┐                   │                   ┌─────────────────────────┐  │
│  │    Daily Attendance     │◄──────────────────┴───────────────────┤   Approved Leave Days   │  │
│  │ (Multi-Session Presence)│                                       │   (Balance Debited)     │  │
│  └────────────┬────────────┘                                       └────────────┬────────────┘  │
│               │                                                                 │               │
│               ▼                                                                 ▼               │
│  ┌─────────────────────────┐                                       ┌─────────────────────────┐  │
│  │    Workforce Time       │                                       │  Workforce Availability │  │
│  │(Regular/Break/Overtime) │                                       │ (Scheduled - Leave/Off) │  │
│  └────────────┬────────────┘                                       └────────────┬────────────┘  │
│               │                                                                 │               │
│               ▼                                                                 │               │
│  ┌─────────────────────────┐                                                    │               │
│  │   Periodic Timesheet    │                                                    │               │
│  │(Draft→Submitted→Apprvd) │                                                    │               │
│  └─────────────────────────┘                                                    │               │
└─────────────────────────────────────────────────────────────────────────────────┼───────────────┘
                                                                                  │
                                                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                External Operational Consumers                                   │
│                                                                                                 │
│  ┌──────────────────────────────┐                       ┌────────────────────────────────────┐  │
│  │    M3 Assignment Engine      │                       │        M11 Analytics Engine        │  │
│  │ (Read-only Capacity Signal)  │                       │ (Attendance, Overtime, Leave Rate) │  │
│  └──────────────────────────────┘                       └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Components

### 4.1 Domain Layer (`src/modules/workforce-time/domain`)
* **`WorkforceScheduleEntity`**: Represents fixed or flexible work schedule templates (working days, daily core hours, expected weekly duration, timezone).
* **`ScheduleDayValueObject`**: Configures day-of-week rules (e.g., Monday 09:00–17:00, 60m break).
* **`ScheduleAssignmentEntity`**: Associates an M2 `Employment` with a schedule across an effective date range with collision detection.
* **`AttendanceRecordEntity`**: Daily presence container tracking daily attendance status (`present`, `partial`, `absent`, `leave`, `holiday`, `rest_day`, `wfh`), total presence duration, and flags.
* **`AttendanceSessionEntity`**: Represents discrete check-in to check-out segments within a day.
* **`AttendanceCorrectionEntity`**: Append-only correction request tracking manual time adjustments, before/after values, and supervisor approval.
* **`WorkforceTimeRecordEntity`**: Granular UTC time intervals categorized as `regular`, `break`, `overtime`, or `other`.
* **`TimesheetEntity`**: Periodic aggregation container (weekly/bi-weekly/monthly) with lifecycle states (`draft`, `submitted`, `approved`, `rejected`, `cancelled`).
* **`TimesheetEntryEntity`**: Links daily time records and duration summaries to a parent timesheet.
* **`LeaveTypeEntity`**: Classification of leave (Annual, Sick, Casual, Unpaid, Paternity, Maternity).
* **`LeavePolicyEntity` & `LeavePolicyRuleEntity`**: Rules governing annual entitlement, accrual mode, maximum carryover, and documentation requirements.
* **`LeaveBalanceEntity`**: Tracks opening, accrued, adjusted, used, reserved, and net available balances per person/employment/type.
* **`LeaveRequestEntity`**: Employee leave application tracking date ranges, total days, reason, and lifecycle states.
* **`LeaveRequestHistoryEntity`**: Audit trail of leave approvals, rejections, and cancellations.
* **`WorkforceHolidayEntity`**: Organization and branch-specific non-working dates.
* **`WorkforceAvailabilityProjection`**: Pure computational domain service calculating capacity availability windows.

### 4.2 Repositories (`src/modules/workforce-time/infrastructure`)
* `WorkforceScheduleRepository`: Persistence for schedules, schedule days, and effective assignments.
* `AttendanceRepository`: Daily attendance records, session management, and correction storage.
* `WorkforceTimeRepository`: Time intervals, break segments, and overtime aggregations.
* `TimesheetRepository`: Periodic timesheet lifecycle and entry associations.
* `LeaveRepository`: Leave types, policies, balances, requests, and transition histories.
* `HolidayRepository`: Branch-aware calendar persistence and holiday lookup queries.

### 4.3 Application Services (`src/modules/workforce-time/application`)
* `ScheduleService`: Schedule definition, versioning, and employment assignment validation.
* `AttendanceService`: Check-in/check-out orchestration, multi-session tracking, automatic day classification, and correction workflows.
* `TimeTrackingService`: Start/stop time sessions, break logging, and overtime detection.
* `TimesheetService`: Timesheet generation, submission, manager approval/rejection, and final locking.
* `LeaveService`: Balance initialization, leave application submission, balance reservation, manager approval, and balance commit.
* `HolidayService`: Holiday calendar administration and branch overrides.
* `AvailabilityService`: Read-only projection queries for M3 Assignment capacity and M11 Analytics metrics.

### 4.4 API Controllers & Routers (`src/modules/workforce-time/api`)
* Mounted under canonical base: `/api/v1/organizations/:orgId/workforce-time`
* `ScheduleController`: `/schedules`, `/schedules/:id`, `/schedules/assignments`
* `AttendanceController`: `/attendance`, `/attendance/check-in`, `/attendance/check-out`, `/attendance/:id/corrections`
* `TimeTrackingController`: `/time-records`, `/time-records/:id`
* `TimesheetController`: `/timesheets`, `/timesheets/:id/submit`, `/timesheets/:id/approve`, `/timesheets/:id/reject`
* `LeaveController`: `/leave-types`, `/leave-policies`, `/leave-balances`, `/leave-requests`, `/leave-requests/:id/approve`
* `HolidayController`: `/holidays`, `/holidays/:id`

---

## 5. Implementation Milestones & Sequence

The M15 implementation must proceed in strict dependency order:

1. **Milestone 15.1 — Master Schedules, Calendars & Holidays**
   * Migration: `015_workforce_time_m15_schema.sql` (Part 1: Schedules, Schedule Days, Schedule Assignments, Holidays).
   * Repositories & Services: `ScheduleService`, `HolidayService`.
   * Unit tests: Schedule day calculation, overlapping assignment prevention, branch holiday resolution.

2. **Milestone 15.2 — Attendance & Multi-Session Tracking**
   * Migration: Schema Part 2 (`attendance_records`, `attendance_sessions`, `attendance_corrections`).
   * Service: `AttendanceService` (check-in, check-out, multi-session aggregation, correction audit).
   * Unit tests: Session overlap rules, automatic `rest_day`/`holiday` status resolution, correction audit flow.

3. **Milestone 15.3 — Granular Time Records & Timesheets**
   * Migration: Schema Part 3 (`workforce_time_records`, `workforce_timesheets`, `workforce_timesheet_entries`).
   * Services: `TimeTrackingService`, `TimesheetService`.
   * Unit tests: Regular vs Break vs Overtime validation, timesheet submission, approval immutability.

4. **Milestone 15.4 — Leave Engine & Balance Accounting**
   * Migration: Schema Part 4 (`leave_types`, `leave_policies`, `leave_balances`, `leave_requests`, `leave_request_history`).
   * Service: `LeaveService`.
   * Unit tests: Balance reservation math, submission $\rightarrow$ approval commit, cancellation balance release.

5. **Milestone 15.5 — Availability Projection & Analytics Source Registration**
   * Implementation: `AvailabilityService` (projection calculations).
   * Registry: Register M15 operational sources in M11 `ANALYTICS_SOURCE_REGISTRY`.
   * Consumer: M14 lifecycle event consumer (e.g. adjust schedule assignments upon termination).

6. **Milestone 15.6 — REST API, Permissions Middleware & E2E Integration**
   * Controller & Router mounting in `src/app.ts`.
   * Permission capability mapping enforcement (`workforce_time:view`, `workforce_time:create`, `workforce_time:manage`, `workforce_time:approve`, `workforce_time:admin`).
   * Comprehensive integration tests covering multi-tenancy (404 on cross-tenant), state machines, and M10 outbox event verification.

---

## 6. Testing Strategy & Conformance Matrix

| Test Category | Scope & Invariants Verified | Target Execution |
| :--- | :--- | :--- |
| **Unit Tests: Schedules** | Collision detection for schedule assignments; timezone normalization; fixed vs flexible schedule evaluations. | Vitest unit suite |
| **Unit Tests: Attendance** | Multi-session aggregation; missing checkout flags; append-only corrections; interaction with approved leave and holidays. | Vitest unit suite |
| **Unit Tests: Time Records** | Start/end ordering validation; non-overlapping regular work records; explicit break record tracking; overtime detection. | Vitest unit suite |
| **Unit Tests: Leave Balances** | Reserved vs available arithmetic; negative balance prevention; rollback upon request rejection/cancellation. | Vitest unit suite |
| **Tenant Isolation Tests** | Verification that cross-tenant access to schedules, attendance, timesheets, and leave requests returns HTTP 404 without data leak. | Supertest integration suite |
| **Authorization Tests** | Validation of capability boundaries: `workforce_time:create` for submissions vs `workforce_time:approve` for timesheet/leave final approvals. | Supertest API suite |
| **Outbox & Rollback Tests** | Verifying that failed mutations roll back state and stage zero outbox events, while successful commits dispatch events post-commit. | Vitest transaction suite |
| **M1–M14 Regression** | Complete execution of existing test suites across M1 through M14 to guarantee zero regression. | Full repository test suite |

---

## 7. Acceptance Criteria (Definition of Done)

* [x] Full database migration script `migrations/015_workforce_time_m15_schema.sql` cleanly applies, rolls back, and seeds without errors.
* [x] Work schedules support both fixed day/time rules and flexible weekly hours with collision-free employment assignments.
* [x] Attendance accurately models multiple sessions per day, records append-only corrections, and reflects approved leave and holidays.
* [x] Breaks are tracked canonically as explicit time records with `time_type = 'break'`, and regular work time intervals do not overlap.
* [x] Overtime is calculated and tracked strictly as operational workforce time without introducing any payroll, compensation, or wage logic.
* [x] Timesheets enforce explicit lifecycle states (`draft` $\rightarrow$ `submitted` $\rightarrow$ `approved`) and become strictly immutable once approved.
* [x] Leave balances enforce proper reservation on submission and commit on approval, releasing on rejection/cancellation.
* [x] M15 provides read-only availability signals to M3 without modifying assignments or project teams.
* [x] M15 registers operational sources in M11 Analytics Registry without implementing custom dashboards or parallel analytics engines.
* [x] All endpoints use standard API envelopes (`data`/`meta`), enforce `requireCapability()`, and return `404` on cross-tenant requests.
* [x] All mutations use M10 transactional outbox semantics with zero pre-commit event emissions.
* [x] Typecheck, build, migration reset, seed, and complete regression tests pass with 100% success.
