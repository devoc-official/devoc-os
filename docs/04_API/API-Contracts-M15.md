# REST API Architecture & Contracts — M15 Attendance, Leave & Workforce Time Engine

## 1. Overview & Canonical Base

All M15 Attendance, Leave & Workforce Time Engine REST APIs are strictly versioned, tenant-isolated, and mounted under:

```text
/api/v1/organizations/:orgId/workforce-time
```

### Standard Envelopes

Every successful response wraps data inside a standard envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "req-98f24a18-d716-43e5-9c88-12c47bc86e01",
    "timestamp": "2026-09-14T08:00:00.000Z"
  }
}
```

Standard error envelope:

```json
{
  "error": {
    "code": "WORKFORCE_TIME_INVALID_STATE_TRANSITION",
    "message": "Cannot submit timesheet in 'approved' status",
    "details": {},
    "request_id": "req-98f24a18-d716-43e5-9c88-12c47bc86e01"
  }
}
```

---

## 2. Capability & Authorization Mapping

M15 enforces authorization via the approved capability model:

| HTTP Method & Endpoint | Required Capability | Contextual Scope | Description |
| :--- | :--- | :--- | :--- |
| `GET /schedules` | `workforce_time:view` | Organization / Branch | List all schedules |
| `POST /schedules` | `workforce_time:manage` | Organization | Create a new work schedule |
| `GET /schedules/:id` | `workforce_time:view` | Organization / Branch | Get schedule details & working days |
| `PUT /schedules/:id` | `workforce_time:manage` | Organization | Update schedule & working days |
| `POST /schedules/assignments` | `workforce_time:manage` | Employment | Assign schedule to employment |
| `GET /schedules/assignments` | `workforce_time:view` | Employment | List schedule assignments |
| `GET /attendance` | `workforce_time:view` | Employment / Team | Query attendance records |
| `GET /attendance/:id` | `workforce_time:view` | Employment | Get daily attendance record with sessions |
| `POST /attendance/check-in` | `workforce_time:create` | Self (Employment) | Clock-in daily session |
| `POST /attendance/check-out` | `workforce_time:create` | Self (Employment) | Clock-out daily session |
| `POST /attendance/:id/corrections` | `workforce_time:create` | Self / Manager | Request attendance record correction |
| `PATCH /attendance/corrections/:id/review` | `workforce_time:approve` | Manager / HR | Approve or reject correction |
| `GET /time-records` | `workforce_time:view` | Employment / Team | List time records |
| `POST /time-records` | `workforce_time:create` | Self / Manager | Create time record (work/break) |
| `GET /time-records/:id` | `workforce_time:view` | Employment | Get specific time record |
| `PATCH /time-records/:id` | `workforce_time:create` | Self / Manager | Update time record |
| `PATCH /time-records/:id/overtime/review` | `workforce_time:approve` | Manager | Approve or reject overtime |
| `GET /timesheets` | `workforce_time:view` | Employment / Team | Query periodic timesheets |
| `POST /timesheets` | `workforce_time:create` | Self / Manager | Generate draft timesheet |
| `GET /timesheets/:id` | `workforce_time:view` | Employment | Get timesheet with line entries |
| `PATCH /timesheets/:id/submit` | `workforce_time:create` | Self / Manager | Submit timesheet for approval |
| `PATCH /timesheets/:id/approve` | `workforce_time:approve` | Manager / HR | Approve timesheet (locks entries) |
| `PATCH /timesheets/:id/reject` | `workforce_time:approve` | Manager / HR | Reject timesheet back to draft |
| `PATCH /timesheets/:id/cancel` | `workforce_time:create` | Self / Manager | Cancel draft timesheet |
| `GET /leave-types` | `workforce_time:view` | Organization | List available leave types |
| `POST /leave-types` | `workforce_time:admin` | Organization | Configure new leave type |
| `GET /leave-policies` | `workforce_time:view` | Organization | List leave policies |
| `POST /leave-policies` | `workforce_time:admin` | Organization | Create leave policy |
| `GET /leave-balances` | `workforce_time:view` | Employment | Query leave balances |
| `POST /leave-balances/adjust` | `workforce_time:manage` | Employment | Adjust leave balance |
| `GET /leave-requests` | `workforce_time:view` | Employment / Team | List leave requests |
| `POST /leave-requests` | `workforce_time:create` | Self / HR | Create draft leave request |
| `GET /leave-requests/:id` | `workforce_time:view` | Employment | Get leave request details |
| `PATCH /leave-requests/:id/submit` | `workforce_time:create` | Self / HR | Submit request (reserves balance) |
| `PATCH /leave-requests/:id/approve` | `workforce_time:approve` | Manager / HR | Approve request (commits balance) |
| `PATCH /leave-requests/:id/reject` | `workforce_time:approve` | Manager / HR | Reject request (releases balance) |
| `PATCH /leave-requests/:id/cancel` | `workforce_time:create` | Self / HR | Cancel request (releases balance) |
| `GET /holidays` | `workforce_time:view` | Branch / Org | List calendar holidays |
| `POST /holidays` | `workforce_time:manage` | Branch / Org | Create calendar holiday |
| `DELETE /holidays/:id` | `workforce_time:manage` | Branch / Org | Delete holiday entry |
| `GET /availability` | `workforce_time:view` | Employment / Org | Project forward-looking availability |

---

## 3. Endpoints & Data Transfer Objects (DTOs)

### 3.1 Schedules & Days

#### `POST /schedules`
Creates a schedule template with working day configurations.

**Request Schema**:
```json
{
  "name": "Standard Engineering Schedule",
  "code": "ENG-STD-40",
  "description": "Monday to Friday 09:00 to 17:00 with 1 hour lunch break",
  "scheduleType": "fixed",
  "timezone": "Asia/Kolkata",
  "expectedWeeklyHours": 40.0,
  "branchId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "isDefault": true,
  "workingDays": [
    {
      "dayOfWeek": 1,
      "isWorkingDay": true,
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "breakDurationMinutes": 60,
      "expectedHours": 8.0
    },
    {
      "dayOfWeek": 2,
      "isWorkingDay": true,
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "breakDurationMinutes": 60,
      "expectedHours": 8.0
    },
    {
      "dayOfWeek": 3,
      "isWorkingDay": true,
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "breakDurationMinutes": 60,
      "expectedHours": 8.0
    },
    {
      "dayOfWeek": 4,
      "isWorkingDay": true,
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "breakDurationMinutes": 60,
      "expectedHours": 8.0
    },
    {
      "dayOfWeek": 5,
      "isWorkingDay": true,
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "breakDurationMinutes": 60,
      "expectedHours": 8.0
    },
    {
      "dayOfWeek": 6,
      "isWorkingDay": false,
      "expectedHours": 0.0
    },
    {
      "dayOfWeek": 0,
      "isWorkingDay": false,
      "expectedHours": 0.0
    }
  ]
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "e0b5368a-6b58-45a9-b684-25e1dfa8397a",
    "organizationId": "8239458b-ab47-40c3-971a-69c9e43b2295",
    "branchId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "name": "Standard Engineering Schedule",
    "code": "ENG-STD-40",
    "scheduleType": "fixed",
    "timezone": "Asia/Kolkata",
    "expectedWeeklyHours": 40.0,
    "isDefault": true,
    "isActive": true,
    "createdAt": "2026-09-14T08:00:00.000Z"
  },
  "meta": {
    "requestId": "req-1"
  }
}
```

#### `POST /schedules/assignments`
Assigns a schedule to an M2 employment across an effective date range.

**Request Schema**:
```json
{
  "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "personId": "f7dae4d7-6512-4bcf-8de2-84d008501b42",
  "scheduleId": "e0b5368a-6b58-45a9-b684-25e1dfa8397a",
  "effectiveFrom": "2026-10-01",
  "effectiveTo": null,
  "notes": "Assigned to Core Engineering standard hours"
}
```

---

### 3.2 Attendance & Multi-Session Tracking

#### `POST /attendance/check-in`
Clock in for work. Automatically creates or updates today's `attendance_records` and appends an `attendance_sessions` row.

**Request Schema**:
```json
{
  "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "personId": "f7dae4d7-6512-4bcf-8de2-84d008501b42",
  "checkInAt": "2026-09-14T09:02:15.000Z",
  "isWfh": false,
  "deviceMetadata": {
    "client": "web",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "attendanceRecord": {
      "id": "7b0d2d3a-1e4e-4f7f-9b1b-d10f2c4e6a8b",
      "attendanceDate": "2026-09-14",
      "status": "present",
      "totalPresenceMinutes": 0,
      "isPunctual": true,
      "hasMissingCheckout": true
    },
    "session": {
      "id": "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
      "checkInAt": "2026-09-14T09:02:15.000Z",
      "checkOutAt": null
    }
  },
  "meta": {
    "requestId": "req-2"
  }
}
```

#### `POST /attendance/check-out`
Clock out of current session. Closes the active session and recalculates daily totals.

**Request Schema**:
```json
{
  "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "personId": "f7dae4d7-6512-4bcf-8de2-84d008501b42",
  "checkOutAt": "2026-09-14T17:35:00.000Z"
}
```

#### `POST /attendance/:id/corrections`
Submits an append-only correction request for missed check-in/out or inaccurate logs.

**Request Schema**:
```json
{
  "attendanceSessionId": "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
  "correctedCheckInAt": "2026-09-14T09:00:00.000Z",
  "correctedCheckOutAt": "2026-09-14T17:30:00.000Z",
  "reason": "Forgot to clock in on arrival due to network outage"
}
```

---

### 3.3 Workforce Time Records

#### `POST /time-records`
Creates an explicit, validated workforce time record (e.g. work interval or break).

**Request Schema**:
```json
{
  "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "personId": "f7dae4d7-6512-4bcf-8de2-84d008501b42",
  "timeType": "break",
  "startedAt": "2026-09-14T12:30:00.000Z",
  "endedAt": "2026-09-14T13:30:00.000Z",
  "description": "Lunch break"
}
```

---

### 3.4 Timesheets

#### `POST /timesheets`
Generates a draft timesheet for an employment across a calendar period.

**Request Schema**:
```json
{
  "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "personId": "f7dae4d7-6512-4bcf-8de2-84d008501b42",
  "periodStartDate": "2026-09-01",
  "periodEndDate": "2026-09-07",
  "notes": "Week 36 Timesheet"
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c",
    "organizationId": "8239458b-ab47-40c3-971a-69c9e43b2295",
    "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "periodStartDate": "2026-09-01",
    "periodEndDate": "2026-09-07",
    "status": "draft",
    "totalRegularHours": 40.0,
    "totalBreakHours": 5.0,
    "totalOvertimeHours": 2.5,
    "totalBillableHours": 42.5
  },
  "meta": {
    "requestId": "req-3"
  }
}
```

#### `PATCH /timesheets/:id/submit`
Submits draft timesheet for manager review.

#### `PATCH /timesheets/:id/approve`
Approves timesheet with `workforce_time:approve`. Timesheet and aggregated entries become strictly immutable.

**Request Schema**:
```json
{
  "approvedBy": "admin-person-uuid",
  "notes": "Approved for operational verification"
}
```

---

### 3.5 Leave Management & Balances

#### `POST /leave-requests`
Creates and optionally submits a leave request.

**Request Schema**:
```json
{
  "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "personId": "f7dae4d7-6512-4bcf-8de2-84d008501b42",
  "leaveTypeId": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
  "startDate": "2026-10-12",
  "endDate": "2026-10-14",
  "isHalfDay": false,
  "totalDays": 3.0,
  "reason": "Personal family commitment",
  "autoSubmit": true
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
    "organizationId": "8239458b-ab47-40c3-971a-69c9e43b2295",
    "leaveTypeId": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    "startDate": "2026-10-12",
    "endDate": "2026-10-14",
    "totalDays": 3.0,
    "status": "submitted",
    "balanceReserved": 3.0
  },
  "meta": {
    "requestId": "req-4"
  }
}
```

#### `PATCH /leave-requests/:id/approve`
Approves leave request using `workforce_time:approve`. Moves days from `reserved_balance` to `used_balance`.

---

### 3.6 Availability Projection

#### `GET /availability?employmentId=:empId&startDate=2026-10-01&endDate=2026-10-31`
Computes net workforce availability across date ranges for M3 Assignment planning and M11 Analytics.

**Response (`200 OK`)**:
```json
{
  "data": {
    "employmentId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "startDate": "2026-10-01",
    "endDate": "2026-10-31",
    "totalCalendarDays": 31,
    "scheduledWorkingDays": 22,
    "scheduledWorkingHours": 176.0,
    "holidayDays": 2,
    "holidayHours": 16.0,
    "approvedLeaveDays": 3.0,
    "approvedLeaveHours": 24.0,
    "netAvailableDays": 17.0,
    "netAvailableHours": 136.0
  },
  "meta": {
    "requestId": "req-5"
  }
}
```

---

## 4. Error Code Matrix

| Error Code | HTTP Status | Trigger Condition |
| :--- | :--- | :--- |
| `WORKFORCE_TIME_NOT_FOUND` | `404` | Schedule, attendance, time record, timesheet, or leave request not found in tenant. |
| `WORKFORCE_TIME_CROSS_TENANT_ACCESS` | `404` | Attempted cross-tenant reference to employment, person, branch, or schedule. |
| `WORKFORCE_TIME_SCHEDULE_COLLISION` | `409` | Active schedule assignment already exists for employment in specified date range. |
| `WORKFORCE_TIME_OVERLAPPING_TIME_RECORD`| `409` | Time record overlaps with an existing regular workforce time record for same employment. |
| `WORKFORCE_TIME_INVALID_TIMESTAMPS` | `400` | `endedAt <= startedAt` or duration calculation non-positive. |
| `WORKFORCE_TIME_MISSING_CHECKOUT` | `409` | Attempted new check-in while an existing session remains open without check-out. |
| `WORKFORCE_TIME_INSUFFICIENT_LEAVE_BALANCE` | `422` | Requested leave days exceed `available_balance` and policy does not permit negative balance. |
| `WORKFORCE_TIME_INVALID_STATE_TRANSITION` | `422` | State transition violated (e.g. attempting to mutate approved timesheet or approved leave). |
| `WORKFORCE_TIME_UNAUTHORIZED_APPROVAL` | `403` | User lacks `workforce_time:approve` or contextual management hierarchy for target employment. |
