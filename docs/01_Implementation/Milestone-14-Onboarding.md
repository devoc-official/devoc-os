# Milestone 14 — Workforce Onboarding & Lifecycle Implementation Specification

## Status

**Architecture Draft — Revised, Pending Conformance Audit**

---

## 1. Purpose & Scope

Milestone 14 establishes the **Workforce Onboarding & Lifecycle Orchestration Engine** for DeVoc OS. It bridges post-hiring candidate conversion (M13 Recruitment) with active workforce placement, organizational movement (Transfers, Promotions), and controlled employee exits (Offboarding).

M14 acts as the operational orchestrator across the core employee lifecycle pipeline:

$$\text{Recruitment (M13)} \longrightarrow \text{Hire} \longrightarrow \text{Person + Employment (M2)} \longrightarrow \text{Onboarding (M14)} \longrightarrow \text{Placement (M3)} \longrightarrow \text{Workforce Movements} \longrightarrow \text{Offboarding}$$

### Key Boundaries & Architectural Invariants
1. **Identity & Employment Primacy**: M14 does NOT create duplicate `Person` or `Employee` records. It references existing M2 `Person` (`people`) and M2 `Employment` (`employments`) entities.
2. **Assignment Primacy & Task Responsibility**: M14 does NOT create duplicate assignment tables (`employee_projects`, `employee_teams`, `onboarding_members`, `onboarding_assignees`). Task responsibility is authoritatively maintained using M3 `Assignments` (`target_type = 'task'`, `target_id = task.id`). Mentor responsibility uses M3 `Assignments` (`target_type = 'team'`, `'department'`, `'student'`, or `'task'`, `assignment_type = 'mentor'`).
3. **M2 Employment Lifecycle Ownership**: M2 remains authoritative for employment status (`probation`, `active`, `suspended`, `terminated`, `resigned`). M14 orchestrates workflow requests (Transfers, Promotions, Offboarding) and triggers M2 `EmploymentService` transitions atomically upon final workflow approval/execution.
4. **Template Requirements & Metadata-Only Compliance**: Configurable template requirements (`workforce_onboarding_template_items`) define compliance requirements instantiated into plan items (`workforce_onboarding_items`). Required items (documents, policy acknowledgements, equipment receipts) store metadata, verification status, and external URL references only. No binary file content or sensitive payloads are stored in M14.
5. **Promotion Authority Boundaries**: Promotion processes explicitly distinguish:
   * **Job Title**: Updated in M2 `employments.job_title`.
   * **System / Organizational Role**: Updated in M2 `person_roles` / M12 `roles`.
   * **Operational Responsibility**: Updated in M3 `assignments`.
6. **No Payroll / Financial Settlement**: Financial obligations remain under M9 Finance. M14 exit clearance optionally references M9 `financial_obligations` via `financial_obligation_id` (with mandatory same-tenant validation) without duplicating accounting or payroll processing.
7. **Authoritative M13 Integration**: Automatic post-hire onboarding plan creation occurs via the M10 outbox event consumer handling `recruitment.candidate.hired`. Manual API initiation (`POST /onboarding-plans`) exists strictly as an authorized administrative backup operation (e.g. re-onboarding or manual overrides).
8. **M10 Transactional Event Outbox**: All domain mutations wrap database transactions (`withTransaction`), staging audit logs and outbox events inside the transaction prior to `COMMIT` and post-commit event dispatching.

---

## 2. Conceptual Architecture & Operational Integration

```text
M13 Recruitment Engine
   │
   ▼ POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire
Atomic Conversion (M2 Person + M2 Employment)
   │
   ├── Staged Outbox Event: recruitment.candidate.hired
   │
   ▼
M14 Event Consumer (Automatic Path)
   │
   ├── 1. Create Onboarding Plan (status = initiated) from Default/Selected Onboarding Template
   ├── 2. Instantiate Onboarding Tasks & Template Requirement Items
   ├── 3. Orchestrate M3 Assignments (target_type = 'task' for task assignees; target_type = 'team' for mentors)
   ├── 4. Coordinate M6 Meetings (Onboarding syncs) & M7 Learning (Onboarding programs)
   └── 5. Monitor Task & Requirement Progress (draft → initiated → in_progress → completed)
         │
         ▼ Onboarding Plan Completed
Active Workforce Lifecycle (M14 Movement Orchestration)
   │
   ├── Transfer Process (draft → submitted → pending_review → pending_approval → approved → executed)
   ├── Promotion Process (draft → submitted → pending_review → pending_approval → approved → executed)
   └── Offboarding Process (initiated → clearance_in_progress → cleared → completed)
         │
         ▼ Offboarding Completed
M2 Employment Final Update (M2 status = resigned / terminated, end_date set)
   │
   └── Staged Canonical Event: workforce.offboarding.completed
```

---

## 3. Implementation Components

### 3.1 Domain Layer (`src/modules/workforce/domain`)
* **`OnboardingTemplateEntity`**: Defines organization-scoped onboarding templates with default task sequences, due offsets, and mandatory flags.
* **`OnboardingTemplateItemEntity`**: Defines template-level required compliance items, document references, and policy acknowledgements.
* **`OnboardingPlanEntity`**: Manages the onboarding plan instance for an M2 `Employment` (`draft` $\rightarrow$ `initiated` $\rightarrow$ `in_progress` $\rightarrow$ `completed` / `cancelled`).
* **`OnboardingTaskEntity`**: Tracks concrete onboarding task instances, due dates, role context, and completion status (`pending` $\rightarrow$ `in_progress` $\rightarrow$ `completed` / `skipped` / `failed`).
* **`OnboardingItemEntity`**: Tracks compliance requirements instantiated from template items (`pending` $\rightarrow$ `submitted` $\rightarrow$ `verified` / `rejected` / `skipped`).
* **`WorkforceTransferEntity`**: Manages employee organizational transfer workflows (`draft` $\rightarrow$ `submitted` $\rightarrow$ `pending_review` $\rightarrow$ `pending_approval` $\rightarrow$ `approved` $\rightarrow$ `executed` / `rejected` / `cancelled`).
* **`WorkforcePromotionEntity`**: Manages title/role promotion workflows (`draft` $\rightarrow$ `submitted` $\rightarrow$ `pending_review` $\rightarrow$ `pending_approval` $\rightarrow$ `approved` $\rightarrow$ `executed` / `rejected` / `cancelled`).
* **`WorkforceOffboardingEntity`**: Manages exit workflows (`initiated` $\rightarrow$ `clearance_in_progress` $\rightarrow$ `cleared` $\rightarrow$ `completed` / `cancelled`).
* **`WorkforceOffboardingClearanceEntity`**: Manages department exit sign-offs and optional M9 `financial_obligation_id` balance checks.

### 3.2 Repositories (`src/modules/workforce/infrastructure`)
* `OnboardingTemplateRepository`: Template persistence and task/item definition queries.
* `OnboardingPlanRepository`: Plan persistence, task aggregation, progress calculation.
* `OnboardingTaskRepository`: Task status update persistence and M3 task assignment queries.
* `OnboardingItemRepository`: Compliance requirement verification persistence.
* `WorkforceTransferRepository`: Transfer workflow record persistence and history tracking.
* `WorkforcePromotionRepository`: Promotion workflow record persistence and history tracking.
* `WorkforceOffboardingRepository`: Exit process and clearance tracking persistence.
* `WorkforceTenantValidator`: Service-level multi-tenant cross-reference validation (`organization_id` defense).

### 3.3 Application Services (`src/modules/workforce/application`)
* `OnboardingTemplateService`: Template CRUD and default workflow setup.
* `OnboardingService`: Plan creation (`draft`), initiation (`initiated`), task progression, item verification, plan completion.
* `WorkforceTransferService`: Transfer request creation, submission, review, approval, and execution (coordinating M2 Employment & M3 Assignment updates).
* `WorkforcePromotionService`: Promotion request creation, submission, review, approval, and execution (coordinating M2 Employment job title, M2 PersonRole system role, and M3 Assignment updates).
* `WorkforceOffboardingService`: Exit initiation, clearance tracking, M9 obligation validation, assignment teardown, and final M2 Employment status termination (`resigned`/`terminated`).

### 3.4 API Controllers (`src/modules/workforce/api`)
* `WorkforceController`: Canonical REST endpoints under `/api/v1/organizations/:orgId/workforce/...`.

---

## 4. Workforce Lifecycle & State Machines

### 4.1 Onboarding Plan Lifecycle
```text
[Draft] ──(initiate)──> [Initiated] ──(start task)──> [InProgress] ──(all mandatory tasks completed)──> [Completed]
   │                         │                              │
   └──(cancel)───────────────┴──(cancel)────────────────────┴──(cancel)──> [Cancelled]
```

### 4.2 Onboarding Task Lifecycle
```text
[Pending] ──(start)──> [InProgress] ──(complete)──> [Completed]
    │                        │
    ├──(skip)────────────────┼──(skip)──> [Skipped]
    └──(fail)────────────────└──(fail)──> [Failed]
```

### 4.3 Onboarding Requirement / Item Verification Lifecycle
```text
[Pending] ──(submit metadata)──> [Submitted] ──(verify)──> [Verified]
    │                                 │
    ├──(reject)───────────────────────┼──(reject)──> [Rejected]
    └──(skip)─────────────────────────┴──(skip)────> [Skipped]
```

### 4.4 Workforce Movement Lifecycle (Transfer / Promotion)
```text
[Draft] ──(submit)──> [Submitted] ──(review)──> [PendingReview] ──(request approval)──> [PendingApproval] ──(approve)──> [Approved] ──(execute effective date)──> [Executed]
   │                      │                          │                                     │                         │
   └──(cancel)────────────┴──(cancel)────────────────┴──(reject)───────────────────────────┴──(reject)──────────────────┴──(cancel)──> [Rejected / Cancelled]
```

### 4.5 Offboarding Exit Lifecycle
```text
[Initiated] ──(submit clearances)──> [ClearanceInProgress] ──(all clearances completed)──> [Cleared] ──(finalize exit)──> [Completed]
     │                                     │                                                      │
     └──(cancel)───────────────────────────┴──(cancel)────────────────────────────────────────────┴──(cancel)──> [Cancelled]
```

---

## 5. Cross-Engine Integration Architecture

| Engine | Integration Mechanism & Architectural Ownership |
|---|---|
| **M2 People** | **Authoritative Identity & Employment**. M14 references `people.id` and `employments.id`. M14 orchestrates transfers, promotions, and exits, updating M2 `employments` (`job_title`, `department_id`, `business_unit_id`, `manager_id`, `end_date`, `status`) atomically upon execution. M2 status machine (`probation` $\rightarrow$ `active` $\rightarrow$ `suspended` $\rightarrow$ `terminated`/`resigned`) is strictly respected. |
| **M3 Assignments** | **Authoritative Placement & Task Responsibility**. M14 orchestrates task responsibilities (M3 `Assignments` with `target_type = 'task'`) and mentor/placement responsibilities (M3 `Assignments` with `target_type = 'team'`, `'department'`, `'student'`, or `'task'`). Zero assignment data duplication in M14. |
| **M6 Meetings** | References `meeting_id` for onboarding syncs, check-in meetings, and exit interviews. |
| **M7 Learning** | References `learning_program_id` for onboarding learning paths and milestone requirements. |
| **M8 Evaluation** | References `evaluation_id` for probation period evaluations and performance reviews. |
| **M9 Finance** | References `financial_obligation_id` on exit clearances for balance sign-offs with same-tenant validation. No payroll. |
| **M10 Audit & Events** | Transactional outbox staging (`event_outbox`) and audit logging (`audit_logs`) inside `withTransaction`, post-commit event dispatching. Handles `recruitment.candidate.hired` event to automatically initiate onboarding plans. |
| **M11 Analytics** | Downstream read-only metrics over M14 onboarding plans, task completion rates, movement frequencies, and exit reasons. |
| **M12 Admin** | Shared capability-based authorization (`workforce:view`, `workforce:create`, `workforce:manage`, `workforce:admin`, `workforce:approve`). |
| **M13 Recruitment** | Post-hire trigger: `recruitment.candidate.hired` event automatically creates M14 onboarding plan in `initiated` state. Manual creation endpoint exists for administrative override only. |

---

## 6. Security, Authorization & Tenant Scoping

Recruitment permissions use the centralized capability framework in `src/permissions/permissions.middleware.ts`:

| Endpoint Action | Required Capability | Permitted Roles |
|---|---|---|
| Onboarding & Lifecycle Read Operations | `workforce:view` | Org Admin, Org Member |
| Onboarding Plan Initiation & Task Completion | `workforce:manage` | Org Admin, Org Member (Manager/Assignee) |
| Onboarding Requirement Verification | `workforce:manage` | Org Admin, Org Member (HR/Verifier) |
| Onboarding Template Administration | `workforce:admin` | Org Admin |
| Transfer & Promotion Requests & Submissions | `workforce:create` | Org Admin, Org Member |
| Transfer & Promotion Approval & Execution | `workforce:approve` | Org Admin |
| Offboarding Initiation & Task Clearances | `workforce:manage` | Org Admin, Org Member (Manager/HR) |
| Offboarding Finalization & Employment Termination | `workforce:approve` | Org Admin |

Multi-tenant scoping requires `organization_id` on all M14 tables. Cross-tenant entity lookups fail safely with HTTP `404 Not Found`.

---

## 7. Canonical Domain Events (M14 Catalog)

1. `workforce.onboarding_plan.created`
2. `workforce.onboarding_plan.initiated`
3. `workforce.onboarding_plan.completed`
4. `workforce.onboarding_plan.cancelled`
5. `workforce.onboarding_task.updated`
6. `workforce.onboarding_task.completed`
7. `workforce.onboarding_item.submitted`
8. `workforce.onboarding_item.verified`
9. `workforce.transfer.requested`
10. `workforce.transfer.submitted`
11. `workforce.transfer.reviewed`
12. `workforce.transfer.approved`
13. `workforce.transfer.completed`
14. `workforce.promotion.requested`
15. `workforce.promotion.submitted`
16. `workforce.promotion.reviewed`
17. `workforce.promotion.approved`
18. `workforce.promotion.completed`
19. `workforce.offboarding.initiated`
20. `workforce.offboarding.clearance_updated`
21. `workforce.offboarding.completed`
22. `workforce.offboarding.cancelled`

---

## 8. Non-Goals

M14 explicitly excludes:
- Recruitment & Applicant Sourcing (M13).
- Payroll disbursement, tax calculation, or salary processing (M9 / External).
- Time tracking, attendance logs, or leave request management.
- Benefits administration or insurance enrollment.
- Document binary file storage (S3 / blob storage handles binaries; M14 holds metadata/URLs).
- Identity & Access Management infrastructure (M12).
- Performance scorecards or grading engine (M8).
- Learning content authoring (M7).
- Microservices infrastructure.

