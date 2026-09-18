# DeVoc OS — Internal Pilot Observations Log

This document records the empirical observations gathered during the execution of the DeVoc OS v1 Internal Pilot across all 15 domain engines and persona experiences. Every observation is classified under one of the canonical categories: **Bug**, **Usability Issue**, **Data Issue**, **Security Issue**, **Missing Requirement**, or **Feature Request**.

---

## Observation Matrix

| Obs ID | Title | Domain / Experience | Persona | Category | Impact | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OBS-01** | TargetResolver registry requires explicit registration for dynamic target domains | M3 Assignments | Mentor, Founder | **Usability Issue** | Low | Resolved in Pilot |
| **OBS-02** | Meeting notes upsert expects `content` payload field rather than markdown-suffixed key | M10 Meetings | Founder, PM | **Usability Issue** | Low | Resolved in Pilot |
| **OBS-03** | Timesheet creation requires explicit `employmentId` alongside `personId` | M15 Workforce Time | Developer, PM | **Data Issue** | Medium | Resolved in Pilot |
| **OBS-04** | Identity conflict safety correctly blocks duplicate person creation on hire | M13 Recruitment | Admin, Candidate | **Security Issue** *(Passed)* | High (Safeguard) | Verified Operational |
| **OBS-05** | Financial party type constrained to `'person' \| 'client' \| 'vendor'` | M9 Finance | Finance, Founder | **Usability Issue** | Low | Resolved in Pilot |
| **OBS-06** | Timesheet double-approval rejected with explicit 400 state transition error | M15 Workforce Time | PM, Operations | **Usability Issue** | Low | Verified Operational |
| **OBS-07** | Leave request route structure uses hyphenated REST convention (`leave-types`, `leave-requests`) | M15 Workforce Time | Employee, Admin | **Usability Issue** | Low | Resolved in Pilot |
| **OBS-08** | Meeting action item endpoint adheres to `/action-items` resource path | M10 Meetings | Founder, PM | **Usability Issue** | Low | Resolved in Pilot |
| **OBS-09** | Metric computation queries execute purely in read-only mode without mutating domain tables | M11 Analytics | Founder, Admin | **Feature Request** *(Verified)* | Low | Verified Operational |
| **OBS-10** | Cross-tenant isolation returns 404/403 with zero entity leakage | Multi-Tenant Core | All Personas | **Security Issue** *(Passed)* | Critical | Verified Operational |

---

## Detailed Observations

### OBS-01: TargetResolver Registry Dynamic Target Scope
- **Domain Engine**: M3 Assignment Engine / M7 Learning Engine
- **Persona Affected**: Mentor, Academy Head
- **Category**: **Usability Issue**
- **Description**: When binding a mentor to a student via the generic M3 Assignment Engine (`/api/v1/assignments`), specifying `targetType: 'person'` fails because the assignment engine's resolver registry purposely registers specific semantic targets (`'student'`, `'project'`, `'task'`, `'team'`, `'business_unit'`, etc.) rather than a generic person-to-person link.
- **Expected vs Actual**:
  - *Expected*: Calling `/api/v1/assignments` with `targetType: 'student'` correctly resolves the student's identity against the student registry or enrollment records.
  - *Actual*: Attempting to pass `targetType: 'person'` resulted in `ValidationError: Unsupported assignment target type: 'person'`.
  - *Resolution*: Pilot harness verified that passing `targetType: 'student'` routes through `registerLearningTargetResolvers` and resolves cleanly with 201 Created.

### OBS-02: Meeting Minutes Key Naming Standard
- **Domain Engine**: M10 Meetings Engine
- **Persona Affected**: Founder, Project Manager
- **Category**: **Usability Issue**
- **Description**: Updating draft minutes via `PUT /api/v1/meetings/:id/notes` requires `{ content: string }` rather than markdown-labeled keys (`notesMarkdown`).
- **Expected vs Actual**:
  - *Expected*: Consistent naming conventions across notes APIs.
  - *Actual*: Payload with `notesMarkdown` returned `ValidationError: content is a required field`.
  - *Resolution*: Standardized payload key to `content`.

### OBS-03: Timesheet Creation Requires Explicit Employment Binding
- **Domain Engine**: M15 Workforce Time & Attendance
- **Persona Affected**: Developer, Operations Admin
- **Category**: **Data Issue**
- **Description**: Because DeVoc OS architecture allows people to have multiple concurrent employments (or historical employment contracts) within an organization, timesheet creation requires explicit `employmentId` alongside `personId`.
- **Expected vs Actual**:
  - *Expected*: Clear validation message if `employmentId` is missing.
  - *Actual*: Omitting `employmentId` failed during tenant verification with a 404 because null ID cannot be found.
  - *Resolution*: The pilot harness explicitly passes `employmentId: devEmploymentId`, confirming that multi-employment ambiguity is completely prevented.

### OBS-04: Strict Identity Boundary Enforced During Recruitment Hire
- **Domain Engine**: M13 Recruitment Engine / M2 People Engine
- **Persona Affected**: HR Operations, Candidates
- **Category**: **Security Issue** *(Verified Safeguard)*
- **Description**: Accepting an employment offer alone does **not** create or convert a candidate into a Person or Employee. Conversion requires an explicit `POST .../applications/:id/hire` call. When a candidate's email already matches an active Person in the organization, `/hire` throws `IdentityConflictError` (HTTP 409) with machine-readable code `IDENTITY_CONFLICT`.
- **Expected vs Actual**:
  - *Expected*: Zero accidental duplicate Person records or silent overwrites of existing staff identities.
  - *Actual*: The system rejected the collision with HTTP 409 `IDENTITY_CONFLICT` and prevented duplicate database inserts.

### OBS-05: Financial Party Types Strictly Validated
- **Domain Engine**: M9 Finance Engine
- **Persona Affected**: Finance Admin, Founder
- **Category**: **Usability Issue**
- **Description**: `FinancialPartyEntity` enforces a strict enum of party types: `'person'`, `'client'`, and `'vendor'`. Passing generic labels such as `'organization'` triggers `ValidationError: Invalid party type: 'organization'`.
- **Expected vs Actual**:
  - *Expected*: Clear party classifications reflecting accounting roles.
  - *Actual*: Validated that `'client'` represents external corporate billing accounts cleanly.

### OBS-06: Strict State Machine Guards on Timesheets & Projects
- **Domain Engine**: M4 Projects & M15 Workforce Time
- **Persona Affected**: Project Manager, Org Admin
- **Category**: **Usability Issue**
- **Description**: State machine transitions require explicit legal pathways. Calling `POST /timesheets/:id/approve` on an already approved timesheet immediately returns HTTP 400 (`WorkforceTimeInvalidStateTransitionError`). Similarly, transitioning a project to an unconfigured status returns HTTP 400.
- **Expected vs Actual**:
  - *Expected*: State corruption is prevented at the application layer.
  - *Actual*: Deterministic 400 rejection across all illegal state jumps.

### OBS-07: REST Resource Hyphenation in Workforce Time Router
- **Domain Engine**: M15 Workforce Time & Attendance
- **Persona Affected**: Developers, API Consumers
- **Category**: **Usability Issue**
- **Description**: The router adopts hyphenated resource names (`/leave-types`, `/leave-requests`, `/leave-policies`) rather than nested slash structures (`/leave/types`).
- **Expected vs Actual**:
  - *Expected*: Standard resource-oriented REST conventions.
  - *Actual*: Hyphenated routes eliminate ambiguous route collision and maintain consistency.

### OBS-08: Meeting Action Items Endpoint Conventions
- **Domain Engine**: M10 Meetings Engine
- **Persona Affected**: Founder, Project Manager
- **Category**: **Usability Issue**
- **Description**: Action items attached to meetings are accessed via `/api/v1/meetings/:id/action-items`.
- **Expected vs Actual**:
  - *Expected*: Semantic REST endpoints.
  - *Actual*: Endpoint binds action items directly to project tasks via `taskId`.

### OBS-09: Non-Mutating Metric Computations
- **Domain Engine**: M11 Analytics Engine
- **Persona Affected**: Founder, Academy Head
- **Category**: **Feature Request** *(Verified Requirement)*
- **Description**: The Analytics Engine computes complex aggregation metrics (such as revenue recognition and student milestone completion rates) purely as a read/decision-support query over operational tables.
- **Expected vs Actual**:
  - *Expected*: Zero write mutations or artificial state updates on underlying transactional tables (`financial_transactions`, `learning_enrollments`).
  - *Actual*: Verified that computation leaves source rows pristine and persists snapshots only to analytics-specific snapshot tables.

### OBS-10: Absolute Tenant Isolation Across All Query Patterns
- **Domain Engine**: Multi-Tenant Core Architecture (M1–M15)
- **Persona Affected**: All Tenants
- **Category**: **Security Issue** *(Verified Safeguard)*
- **Description**: When a user belonging to Rival Org attempts to query or mutate resources belonging to DeVoc Pilot Org (Projects, Tasks, Work, Finance, Learning Programs, or Audit Trail), the system consistently returns 404 Not Found or 403 Forbidden.
- **Expected vs Actual**:
  - *Expected*: Zero data leakage or cross-tenant visibility under all conditions.
  - *Actual*: Total tenant containment verified across all 6 cross-tenant integration assertions.
