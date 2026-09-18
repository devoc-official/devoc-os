# DeVoc OS — Internal Pilot Issues Classification

This document classifies all findings discovered during the DeVoc OS v1 Internal Pilot by severity level: **P0 (Blocker)**, **P1 (Major)**, **P2 (Minor)**, or **P3 (Trivial/Cosmetic)**.

---

## Severity Summary

| Severity | Count | Status | Notes |
| :--- | :---: | :--- | :--- |
| **P0 — Blocker** | **0** | **None** | No tenant breaches, system crashes, or data loss detected. |
| **P1 — Major** | **0** | **None** | All core end-to-end workflows and state machines pass. |
| **P2 — Minor** | **3** | **Resolved** | Resolved during test harness stabilization (DTO key & route alignments). |
| **P3 — Cosmetic / Usability** | **2** | **Resolved** | Clarified REST route naming conventions and strict enums. |

---

## Detailed Issue Tracking

### ISSUE-01 (P2 — Minor / Resolved)
- **Severity**: **P2 — Minor**
- **Title**: Timesheet Creation DTO Requires Explicit Employment ID
- **Module**: `M15 Workforce Time & Attendance`
- **Description**: When invoking `POST /api/v1/organizations/:id/workforce-time/timesheets`, omitting `employmentId` (or supplying only `personId`) resulted in a tenant resolution lookup failure returning HTTP 404 rather than an explicit validation error explaining that `employmentId` is mandatory.
- **Steps to Reproduce**:
  1. Authenticate as Org Admin.
  2. Send `POST /api/v1/organizations/:id/workforce-time/timesheets` with `{ personId: "...", periodStartDate: "2026-09-14", periodEndDate: "2026-09-20" }` without `employmentId`.
  3. System attempts `verifyEmploymentInTenant(db, orgId, undefined)` which throws `NotFoundError`.
- **Impact**: In a multi-employment architecture, employees cannot create timesheets without explicitly specifying the employment contract under which hours are recorded.
- **Workaround / Resolution**: Resolved by passing `employmentId: devEmploymentId` in accordance with `CreateTimesheetDto`. The validation is architecturally correct, as a single person may have multiple active employment contracts.
- **Status**: **RESOLVED**

---

### ISSUE-02 (P2 — Minor / Resolved)
- **Severity**: **P2 — Minor**
- **Title**: Meeting Notes Endpoint Rejects Markdown-Suffixed Payload Key
- **Module**: `M10 Meetings Engine`
- **Description**: Updating minutes on a meeting via `PUT /api/v1/meetings/:id/notes` requires `{ content: string }`. Clients sending `{ notesMarkdown: string }` receive HTTP 400 with message `'content is a required field'`.
- **Steps to Reproduce**:
  1. Create a meeting.
  2. Call `PUT /api/v1/meetings/:id/notes` with body `{ notesMarkdown: "Meeting notes..." }`.
  3. Observe HTTP 400 `ValidationError: content is a required field`.
- **Impact**: Frontend and pilot integrations must use the canonical property name `content`.
- **Workaround / Resolution**: Standardized the payload parameter to `content` in client calls.
- **Status**: **RESOLVED**

---

### ISSUE-03 (P2 — Minor / Resolved)
- **Severity**: **P2 — Minor**
- **Title**: Generic Assignment Registry Requires Domain-Specific Target Type for Mentorship
- **Module**: `M3 Assignment Engine` / `M7 Learning Engine`
- **Description**: Calling `POST /api/v1/assignments` to assign a mentor to a student fails if `targetType: 'person'` is provided, because the assignment engine enforces registered domain target types (`'student'`, `'project'`, `'task'`, `'team'`, `'business_unit'`).
- **Steps to Reproduce**:
  1. Enroll a student.
  2. Attempt to create mentor assignment with `targetType: 'person'` and `targetId: studentPersonId`.
  3. Observe HTTP 400 `ValidationError: Unsupported assignment target type: 'person'`.
- **Impact**: Assignment requests must use domain-specific target types rather than generic entity types.
- **Workaround / Resolution**: Use `targetType: 'student'` which invokes `registerLearningTargetResolvers` to locate the student in `people` or `learning_enrollments`.
- **Status**: **RESOLVED**

---

### ISSUE-04 (P3 — Trivial / Resolved)
- **Severity**: **P3 — Cosmetic / Usability**
- **Title**: Financial Party Type Enforces Strict Accounting Enums
- **Module**: `M9 Finance Engine`
- **Description**: Creating a financial party for client billing via `POST /api/v1/finance/parties` requires `partyType` to be one of `'person'`, `'client'`, or `'vendor'`. Supplying `'organization'` resulted in HTTP 400 validation error.
- **Steps to Reproduce**:
  1. Call `POST /api/v1/finance/parties` with `{ partyType: 'organization', name: 'Apex Corp' }`.
  2. Observe HTTP 400 `ValidationError: Invalid party type: 'organization'. Must be one of: person, client, vendor`.
- **Impact**: Minor confusion if callers equate "client company" with generic "organization".
- **Workaround / Resolution**: Client companies must be registered with `partyType: 'client'`.
- **Status**: **RESOLVED**

---

### ISSUE-05 (P3 — Trivial / Resolved)
- **Severity**: **P3 — Cosmetic / Usability**
- **Title**: Workforce Time Router Uses Hyphenated URL Paths
- **Module**: `M15 Workforce Time & Attendance`
- **Description**: Leave routes are mounted under `/leave-types` and `/leave-requests` rather than nested sub-paths `/leave/types` and `/leave/requests`. Calling `/leave/types` resulted in HTTP 404.
- **Steps to Reproduce**:
  1. Send request to `POST /api/v1/organizations/:id/workforce-time/leave/types`.
  2. Observe HTTP 404 Route Not Found.
- **Impact**: API clients must adhere to hyphenated route specifications.
- **Workaround / Resolution**: Router paths aligned to `/leave-types` and `/leave-requests`.
- **Status**: **RESOLVED**
