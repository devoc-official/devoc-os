# Milestone 14 — Workforce Onboarding & Lifecycle Implementation Specification

## Status

**Architecture Draft — implementation pending.**

---

## 1. Purpose & Scope

Milestone 14 establishes the **Workforce Onboarding & Lifecycle Orchestration Engine** for DeVoc OS. It bridges post-hiring candidate conversion (M13 Recruitment) with active workforce placement, organizational movement (Transfers, Promotions), and controlled employee exits (Offboarding).

M14 acts as the operational orchestrator across the core employee lifecycle pipeline:

$$\text{Recruitment (M13)} \longrightarrow \text{Hire} \longrightarrow \text{Person + Employment (M2)} \longrightarrow \text{Onboarding (M14)} \longrightarrow \text{Placement (M3)} \longrightarrow \text{Workforce Movements} \longrightarrow \text{Offboarding}$$

### Key Boundaries & Architectural Invariants
1. **Identity & Employment Primacy**: M14 does NOT create duplicate `Person` or `Employee` records. It references existing M2 `Person` (`people`) and M2 `Employment` (`employments`) entities.
2. **Assignment Primacy**: M14 does NOT create duplicate `employee_projects`, `employee_teams`, or `onboarding_members`. It orchestrates organizational and project responsibilities exclusively through M3 `Assignments`.
3. **M2 Employment Lifecycle Ownership**: M2 remains authoritative for employment status (`active`, `suspended`, `terminated`, `resigned`). M14 orchestrates workflow requests (Transfers, Promotions, Offboarding) and updates M2 `employments` atomically upon final workflow approval/completion.
4. **No Document Content Storage**: Required onboarding items (documents, policy acknowledgements, equipment receipts) store metadata, status, and external references only. No binary file content or sensitive payloads are stored in M14.
5. **No Payroll / Financial Settlement**: Financial obligations remain under M9 Finance. M14 manages exit task clearances and handover confirmations without duplicating payroll or accounting.
6. **M10 Transactional Event Outbox**: All domain mutations wrap database transactions (`withTransaction`), staging audit logs and outbox events inside the transaction prior to `COMMIT` and post-commit event dispatching.

---

## 2. Conceptual Architecture & Operational Integration

```text
M13 Recruitment Engine
   │
   ▼ POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire
Atomic Conversion (M2 Person + M2 Employment)
   │
   ├── Trigger Canonical Outbox Event: recruitment.candidate.hired
   │
   ▼
M14 Workforce Onboarding Engine (POST /api/v1/organizations/:orgId/workforce/onboarding-plans)
   │
   ├── 1. Create Onboarding Plan (status = initiated) from Onboarding Template
   ├── 2. Generate Onboarding Tasks & Required Items (documents, equipment, policy acknowledgements)
   ├── 3. Orchestrate M3 Assignments (Mentor assignment, Team/BU assignment)
   ├── 4. Coordinate M6 Meetings (Onboarding check-ins) & M7 Learning (Onboarding programs)
   └── 5. Monitor Task & Item Progress (initiated → in_progress → completed)
         │
         ▼ Onboarding Plan Completed
Active Workforce Lifecycle (M14 Movement Orchestration)
   │
   ├── Transfer Process (Request → BU/Dept/Team Change Approval → M2 Employment & M3 Assignment Updates)
   ├── Promotion Process (Request → Job Title / Role Change Approval → M2 Employment Updates)
   └── Offboarding Process (Resignation / Termination Request → Exit Tasks & Clearances → Assignment Closure)
         │
         ▼ Offboarding Completed
M2 Employment Final Update (status = resigned / terminated, end_date set)
   │
   └── Trigger Canonical Event: workforce.offboarding.completed
```

---

## 3. Implementation Components

### 3.1 Domain Layer (`src/modules/workforce/domain`)
* **`OnboardingTemplateEntity`**: Defines organization-scoped onboarding templates with default task sequences, due offsets, mandatory flags, and required items metadata.
* **`OnboardingPlanEntity`**: Manages the onboarding plan for an M2 `Employment` (`draft` $\rightarrow$ `initiated` $\rightarrow$ `in_progress` $\rightarrow$ `completed` / `cancelled`).
* **`OnboardingTaskEntity`**: Tracks specific onboarding tasks, assignees (via M2 Person), due dates, and completion status (`pending` $\rightarrow$ `in_progress` $\rightarrow$ `completed` / `skipped` / `failed`).
* **`OnboardingItemEntity`**: Tracks compliance requirements (documents, policy acknowledgements, equipment confirm) (`pending` $\rightarrow$ `submitted` $\rightarrow$ `verified` / `waived`).
* **`WorkforceTransferEntity`**: Manages employee organizational transfer workflows (`requested` $\rightarrow$ `under_review` $\rightarrow$ `approved` $\rightarrow$ `executed` / `rejected` / `cancelled`).
* **`WorkforcePromotionEntity`**: Manages title/role promotion workflows (`requested` $\rightarrow$ `under_review` $\rightarrow$ `approved` $\rightarrow$ `executed` / `rejected` / `cancelled`).
* **`WorkforceOffboardingEntity`**: Manages exit workflows (`initiated` $\rightarrow$ `clearance_in_progress` $\rightarrow$ `cleared` $\rightarrow$ `completed` / `cancelled`).

### 3.2 Repositories (`src/modules/workforce/infrastructure`)
* `OnboardingTemplateRepository`: Template persistence and task definition queries.
* `OnboardingPlanRepository`: Plan persistence, task aggregation, progress calculation.
* `OnboardingTaskRepository`: Task assignment and status update persistence.
* `OnboardingItemRepository`: Compliance requirement verification persistence.
* `WorkforceTransferRepository`: Transfer workflow record persistence and history tracking.
* `WorkforcePromotionRepository`: Promotion workflow record persistence and history tracking.
* `WorkforceOffboardingRepository`: Exit process and clearance tracking persistence.
* `WorkforceTenantValidator`: Service-level multi-tenant cross-reference validation (`organization_id` defense).

### 3.3 Application Services (`src/modules/workforce/application`)
* `OnboardingTemplateService`: Template CRUD and default workflow setup.
* `OnboardingService`: Plan initiation, task progression, item verification, plan completion.
* `WorkforceTransferService`: Transfer request creation, review, approval, and execution (coordinating M2 Employment & M3 Assignment updates).
* `WorkforcePromotionService`: Promotion request creation, review, approval, and execution (coordinating M2 Employment updates).
* `WorkforceOffboardingService`: Exit initiation, clearance tracking, assignment teardown, final M2 Employment status termination.

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
    └──(waive)────────────────────────┴──(waive)──> [Waived]
```

### 4.4 Workforce Movement Lifecycle (Transfer / Promotion)
```text
[Requested] ──(submit review)──> [UnderReview] ──(approve)──> [Approved] ──(execute effective date)──> [Executed]
     │                                │                            │
     └──(cancel)──────────────────────┴──(reject)──────────────────┴──(cancel)──> [Rejected / Cancelled]
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
| **M2 People** | **Authoritative Identity & Employment**. M14 references `people.id` and `employments.id`. M14 orchestrates transfers, promotions, and exits, updating M2 `employments` (`job_title`, `department_id`, `business_unit_id`, `manager_id`, `end_date`, `status`) atomically upon approval. |
| **M3 Assignments** | **Authoritative Placement**. M14 orchestrates mentor assignments and team/project placements by creating/updating M3 `assignments` records. Zero assignment data duplication in M14. |
| **M6 Meetings** | References `meeting_id` for onboarding syncs, check-in meetings, and exit interviews. |
| **M7 Learning** | References `learning_program_id` for onboarding learning paths and milestone requirements. |
| **M8 Evaluation** | References `evaluation_id` for probation period evaluations and performance reviews. |
| **M9 Finance** | References `financial_obligation_id` for equipment deposit / clearance records if necessary. No payroll. |
| **M10 Audit & Events** | Transactional outbox staging (`event_outbox`) and audit logging (`audit_logs`) inside `withTransaction`, post-commit event dispatching. |
| **M11 Analytics** | Downstream read-only metrics over M14 onboarding plans, task completion rates, movement frequencies, and exit reasons. |
| **M12 Admin** | Shared capability-based authorization (`workforce:view`, `workforce:create`, `workforce:manage`, `workforce:admin`, `workforce:approve`). |
| **M13 Recruitment** | Post-hire trigger: `recruitment.candidate.hired` event or explicit initiation after M13 `/hire`. |

---

## 6. Security, Authorization & Tenant Scoping

Recruitment permissions use the centralized capability framework in `src/permissions/permissions.middleware.ts`:

| Endpoint Action | Required Capability | Permitted Roles |
|---|---|---|
| Onboarding & Lifecycle Read Operations | `workforce:view` | Org Admin, Org Member |
| Onboarding Plan Initiation & Task Completion | `workforce:manage` | Org Admin, Org Member (Manager/Assignee) |
| Onboarding Requirement Verification | `workforce:manage` | Org Admin, Org Member (HR/Verifier) |
| Onboarding Template Administration | `workforce:admin` | Org Admin |
| Transfer & Promotion Requests | `workforce:create` | Org Admin, Org Member |
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
10. `workforce.transfer.approved`
11. `workforce.transfer.completed`
12. `workforce.promotion.requested`
13. `workforce.promotion.approved`
14. `workforce.promotion.completed`
15. `workforce.offboarding.initiated`
16. `workforce.offboarding.clearance_updated`
17. `workforce.offboarding.completed`
18. `workforce.offboarding.cancelled`

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
