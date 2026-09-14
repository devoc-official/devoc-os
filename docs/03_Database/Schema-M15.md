# Database Architecture & Schema — M15 Attendance, Leave & Workforce Time Engine

## 1. Relational Database Principles

* **Database Engine**: PostgreSQL 15+.
* **Primary Key Strategy**: UUID v4 via `gen_random_uuid()`.
* **Mandatory Multi-Tenant Scoping**: Every table contains `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
* **Tenant Composite Indexing**: All primary entities include composite indices on `(organization_id, id)` and tenant-specific lookup keys to enforce performant, isolated data access.
* **Append-Only History & Immutability**: Historical records (e.g. attendance corrections, leave transition history, approved timesheets) are strictly append-only. Soft deletion is avoided; explicit state machines dictate operational validity.
* **Zero Duplication**: No shadow tables for employees, people, assignments, roles, or financial obligations.

---

## 2. Table Definitions

```sql
-- ============================================================================
-- 1. WORKFORCE SCHEDULES & CALENDARS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workforce_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    schedule_type VARCHAR(30) NOT NULL DEFAULT 'fixed' CHECK (schedule_type IN ('fixed', 'flexible', 'shift', 'seasonal')),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    expected_weekly_hours NUMERIC(5,2) NOT NULL DEFAULT 40.00 CHECK (expected_weekly_hours >= 0.00),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workforce_schedules_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS workforce_schedule_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES workforce_schedules(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIME NULL,
    end_time TIME NULL,
    break_duration_minutes INT NOT NULL DEFAULT 60 CHECK (break_duration_minutes >= 0),
    expected_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00 CHECK (expected_hours >= 0.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workforce_schedule_days_schedule_day UNIQUE (organization_id, schedule_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS workforce_schedule_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES workforce_schedules(id) ON DELETE RESTRICT,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'cancelled')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_schedule_assignment_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS workforce_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NULL REFERENCES branches(id) ON DELETE CASCADE, -- NULL indicates organization-wide holiday
    holiday_date DATE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    holiday_type VARCHAR(50) NOT NULL DEFAULT 'public' CHECK (holiday_type IN ('public', 'regional', 'company', 'religious', 'optional')),
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workforce_holidays_date_scope UNIQUE (organization_id, branch_id, holiday_date)
);

-- ============================================================================
-- 2. ATTENDANCE & MULTI-SESSION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'partial', 'absent', 'leave', 'holiday', 'rest_day', 'wfh')),
    total_presence_minutes INT NOT NULL DEFAULT 0 CHECK (total_presence_minutes >= 0),
    total_break_minutes INT NOT NULL DEFAULT 0 CHECK (total_break_minutes >= 0),
    total_work_minutes INT NOT NULL DEFAULT 0 CHECK (total_work_minutes >= 0),
    is_punctual BOOLEAN NOT NULL DEFAULT TRUE,
    has_missing_checkout BOOLEAN NOT NULL DEFAULT FALSE,
    has_correction BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_records_emp_date UNIQUE (organization_id, employment_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    check_in_at TIMESTAMPTZ NOT NULL,
    check_out_at TIMESTAMPTZ NULL,
    duration_minutes INT NULL CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
    check_in_ip VARCHAR(45) NULL,
    check_out_ip VARCHAR(45) NULL,
    device_metadata JSONB DEFAULT '{}'::jsonb,
    is_manual_entry BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_attendance_session_times CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    attendance_session_id UUID NULL REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    original_check_in_at TIMESTAMPTZ NULL,
    original_check_out_at TIMESTAMPTZ NULL,
    corrected_check_in_at TIMESTAMPTZ NOT NULL,
    corrected_check_out_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reason TEXT NOT NULL,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_by_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NULL,
    review_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_attendance_correction_times CHECK (corrected_check_out_at >= corrected_check_in_at)
);

-- ============================================================================
-- 3. WORKFORCE TIME RECORDS & TIMESHEETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workforce_time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    attendance_record_id UUID NULL REFERENCES attendance_records(id) ON DELETE SET NULL,
    attendance_session_id UUID NULL REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    time_type VARCHAR(30) NOT NULL DEFAULT 'regular' CHECK (time_type IN ('regular', 'break', 'overtime', 'other')),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    is_overtime BOOLEAN NOT NULL DEFAULT FALSE,
    overtime_status VARCHAR(30) NOT NULL DEFAULT 'none' CHECK (overtime_status IN ('none', 'pending', 'approved', 'rejected')),
    overtime_approved_by_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_time_record_duration CHECK (ended_at > started_at)
);

CREATE TABLE IF NOT EXISTS workforce_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
    total_regular_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (total_regular_hours >= 0.00),
    total_break_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (total_break_hours >= 0.00),
    total_overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (total_overtime_hours >= 0.00),
    total_billable_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (total_billable_hours >= 0.00),
    submitted_at TIMESTAMPTZ NULL,
    approved_by_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workforce_timesheets_emp_period UNIQUE (organization_id, employment_id, period_start_date, period_end_date),
    CONSTRAINT chk_timesheet_period_dates CHECK (period_end_date >= period_start_date)
);

CREATE TABLE IF NOT EXISTS workforce_timesheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    timesheet_id UUID NOT NULL REFERENCES workforce_timesheets(id) ON DELETE CASCADE,
    time_record_id UUID NULL REFERENCES workforce_time_records(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL,
    time_type VARCHAR(30) NOT NULL CHECK (time_type IN ('regular', 'break', 'overtime', 'other')),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    hours NUMERIC(5,2) NOT NULL CHECK (hours > 0.00),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. LEAVE ENGINE & BALANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    requires_documentation BOOLEAN NOT NULL DEFAULT FALSE,
    allow_negative_balance BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leave_types_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    employment_type VARCHAR(50) NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance', 'all')),
    accrual_frequency VARCHAR(30) NOT NULL DEFAULT 'annual' CHECK (accrual_frequency IN ('annual', 'monthly', 'quarterly', 'none')),
    annual_allowance_days NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (annual_allowance_days >= 0.00),
    max_carry_forward_days NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (max_carry_forward_days >= 0.00),
    min_service_days_required INT NOT NULL DEFAULT 0 CHECK (min_service_days_required >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leave_policies_type_emp UNIQUE (organization_id, leave_type_id, employment_type)
);

CREATE TABLE IF NOT EXISTS leave_policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    leave_policy_id UUID NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    min_days_notice INT NOT NULL DEFAULT 0,
    max_consecutive_days INT NULL,
    documentation_threshold_days INT NULL,
    rule_configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    opening_balance NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    accrued_balance NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    adjusted_balance NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    used_balance NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (used_balance >= 0.00),
    reserved_balance NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (reserved_balance >= 0.00),
    available_balance NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leave_balances_emp_type_year UNIQUE (organization_id, employment_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employment_id UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    half_day_period VARCHAR(20) NULL CHECK (half_day_period IS NULL OR half_day_period IN ('morning', 'afternoon')),
    total_days NUMERIC(4,2) NOT NULL CHECK (total_days > 0.00),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
    reason TEXT NOT NULL,
    attachment_url TEXT NULL,
    approved_by_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leave_request_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS leave_request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    from_status VARCHAR(30) NULL,
    to_status VARCHAR(30) NOT NULL,
    actor_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. PERFORMANCE & LOOKUP INDEXES
-- ============================================================================

-- Schedules & Days
CREATE INDEX IF NOT EXISTS idx_workforce_schedules_org ON workforce_schedules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workforce_schedule_days_sched ON workforce_schedule_days(organization_id, schedule_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_workforce_schedule_assignments_emp ON workforce_schedule_assignments(organization_id, employment_id, status, effective_from);
CREATE INDEX IF NOT EXISTS idx_workforce_holidays_lookup ON workforce_holidays(organization_id, branch_id, holiday_date);

-- Attendance & Sessions
CREATE INDEX IF NOT EXISTS idx_attendance_records_lookup ON attendance_records(organization_id, employment_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(organization_id, attendance_date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_rec ON attendance_sessions(organization_id, attendance_record_id, check_in_at);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_rec ON attendance_corrections(organization_id, attendance_record_id, status);

-- Time Records & Timesheets
CREATE INDEX IF NOT EXISTS idx_workforce_time_records_lookup ON workforce_time_records(organization_id, employment_id, started_at, ended_at);
CREATE INDEX IF NOT EXISTS idx_workforce_time_records_overtime ON workforce_time_records(organization_id, is_overtime, overtime_status);
CREATE INDEX IF NOT EXISTS idx_workforce_timesheets_emp ON workforce_timesheets(organization_id, employment_id, period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_workforce_timesheets_status ON workforce_timesheets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_workforce_timesheet_entries_sheet ON workforce_timesheet_entries(organization_id, timesheet_id, entry_date);

-- Leave & Balances
CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_leave_policies_type ON leave_policies(organization_id, leave_type_id, employment_type);
CREATE INDEX IF NOT EXISTS idx_leave_balances_lookup ON leave_balances(organization_id, employment_id, leave_type_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(organization_id, employment_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_request_history_req ON leave_request_history(organization_id, leave_request_id, created_at);
```

---

## 3. Entity Relationships & Foreign Key Matrix

| Table Name | Foreign Key Target | Action on Delete | Architectural Purpose |
| :--- | :--- | :--- | :--- |
| `workforce_schedules` | `organizations(id)` | `CASCADE` | Strict multi-tenant isolation. |
| `workforce_schedules` | `branches(id)` | `SET NULL` | Optional branch scoping. |
| `workforce_schedule_days` | `workforce_schedules(id)`| `CASCADE` | Cascade removal with parent schedule. |
| `workforce_schedule_assignments` | `employments(id)` | `CASCADE` | Direct association with M2 Employment. |
| `workforce_schedule_assignments` | `workforce_schedules(id)`| `RESTRICT` | Prevent deletion of active schedules. |
| `workforce_holidays` | `branches(id)` | `CASCADE` | Clean branch deletion cascade. |
| `attendance_records` | `employments(id)` | `CASCADE` | Daily attendance linked to M2 Employment. |
| `attendance_sessions` | `attendance_records(id)` | `CASCADE` | Daily session containment. |
| `attendance_corrections` | `attendance_records(id)` | `CASCADE` | Correction request tracking. |
| `attendance_corrections` | `users(id)` | `RESTRICT` | Audit preservation of requester. |
| `workforce_time_records` | `attendance_records(id)` | `SET NULL` | Preserves time entries if record reset. |
| `workforce_timesheets` | `employments(id)` | `CASCADE` | Timesheet period linked to M2 Employment. |
| `workforce_timesheet_entries` | `workforce_timesheets(id)`| `CASCADE` | Line item association with timesheet. |
| `leave_policies` | `leave_types(id)` | `CASCADE` | Rules governing specific leave types. |
| `leave_balances` | `leave_types(id)` | `CASCADE` | Balance allocation per leave type. |
| `leave_requests` | `leave_types(id)` | `RESTRICT` | Prevents removing in-use leave types. |
| `leave_request_history` | `leave_requests(id)` | `CASCADE` | Audit record of status changes. |

---

## 4. Tenant Integrity & Deletion Strategy

1. **Foreign Key Limitations**: As defined across all DeVoc OS architectural standards, PostgreSQL foreign keys alone do NOT prove tenant boundary integrity. All application services (`ScheduleService`, `AttendanceService`, `TimeTrackingService`, `TimesheetService`, `LeaveService`) perform mandatory same-tenant validation on every cross-referenced foreign key (`employment_id`, `person_id`, `schedule_id`, `leave_type_id`, `branch_id`).
2. **404 Defenses**: Any lookup or foreign reference across mismatched tenants throws `NotFoundError` (`404`), completely concealing the presence of data belonging to other organizations.
3. **Immutability of Finalized Records**: Approved timesheets (`status = 'approved'`), finalized attendance corrections, and approved leave records are immutable. Corrections must follow audit workflows rather than destructive updates.
