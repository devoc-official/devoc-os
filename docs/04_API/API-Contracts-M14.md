# REST API Architecture & Contracts — M14 Workforce Onboarding & Lifecycle Engine

## API Specification Overview

* **Canonical Base URL**: `/api/v1/organizations/:orgId/workforce`
* **Authentication**: Bearer JWT token required (`Authorization: Bearer <token>`).
* **Tenant Scoping & Multi-Tenant Defense**: All operations require an authenticated user with valid tenant membership in `:orgId`. Cross-tenant references produce HTTP `404 Not Found`.
* **Standard Response Envelope**:
```json
{
  "data": {},
  "meta": {
    "requestId": "req-12345-workforce-01"
  }
}
```
* **Standard Error Envelope**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation of error",
    "details": {}
  },
  "meta": {
    "requestId": "req-12345-workforce-02"
  }
}
```

---

## 1. Summary of Canonical Endpoints

| Method | Canonical Endpoint | Description | Required Capability |
|---|---|---|---|
| **TEMPLATES** | | | |
| `POST` | `/api/v1/organizations/:orgId/workforce/templates` | Create onboarding template | `workforce:admin` |
| `GET` | `/api/v1/organizations/:orgId/workforce/templates` | List onboarding templates | `workforce:view` |
| `GET` | `/api/v1/organizations/:orgId/workforce/templates/:id` | Get template details | `workforce:view` |
| `PATCH`| `/api/v1/organizations/:orgId/workforce/templates/:id` | Update template attributes | `workforce:admin` |
| **ONBOARDING PLANS** | | | |
| `POST` | `/api/v1/organizations/:orgId/workforce/onboarding-plans` | Initiate onboarding plan | `workforce:create` |
| `GET` | `/api/v1/organizations/:orgId/workforce/onboarding-plans` | List onboarding plans | `workforce:view` |
| `GET` | `/api/v1/organizations/:orgId/workforce/onboarding-plans/:id` | Get plan details & task list | `workforce:view` |
| `POST` | `/api/v1/organizations/:orgId/workforce/onboarding-plans/:id/complete` | Mark plan completed | `workforce:manage` |
| `POST` | `/api/v1/organizations/:orgId/workforce/onboarding-plans/:id/cancel` | Cancel onboarding plan | `workforce:manage` |
| **TASKS & REQUIREMENTS** | | | |
| `PATCH`| `/api/v1/organizations/:orgId/workforce/onboarding-tasks/:id` | Update task status / assignee | `workforce:manage` |
| `POST` | `/api/v1/organizations/:orgId/workforce/onboarding-items/:id/submit` | Submit requirement metadata | `workforce:manage` |
| `POST` | `/api/v1/organizations/:orgId/workforce/onboarding-items/:id/verify` | Verify requirement item | `workforce:manage` |
| **TRANSFERS** | | | |
| `POST` | `/api/v1/organizations/:orgId/workforce/transfers` | Request organizational transfer | `workforce:create` |
| `GET` | `/api/v1/organizations/:orgId/workforce/transfers` | List transfer workflows | `workforce:view` |
| `GET` | `/api/v1/organizations/:orgId/workforce/transfers/:id` | Get transfer workflow details | `workforce:view` |
| `POST` | `/api/v1/organizations/:orgId/workforce/transfers/:id/approve` | Approve transfer request | `workforce:approve` |
| `POST` | `/api/v1/organizations/:orgId/workforce/transfers/:id/execute` | Execute transfer (updates M2 & M3) | `workforce:approve` |
| **PROMOTIONS** | | | |
| `POST` | `/api/v1/organizations/:orgId/workforce/promotions` | Request promotion process | `workforce:create` |
| `GET` | `/api/v1/organizations/:orgId/workforce/promotions` | List promotion workflows | `workforce:view` |
| `GET` | `/api/v1/organizations/:orgId/workforce/promotions/:id` | Get promotion workflow details | `workforce:view` |
| `POST` | `/api/v1/organizations/:orgId/workforce/promotions/:id/approve` | Approve promotion request | `workforce:approve` |
| `POST` | `/api/v1/organizations/:orgId/workforce/promotions/:id/execute` | Execute promotion (updates M2) | `workforce:approve` |
| **OFFBOARDING** | | | |
| `POST` | `/api/v1/organizations/:orgId/workforce/offboardings` | Initiate offboarding exit | `workforce:manage` |
| `GET` | `/api/v1/organizations/:orgId/workforce/offboardings` | List offboardings | `workforce:view` |
| `GET` | `/api/v1/organizations/:orgId/workforce/offboardings/:id` | Get offboarding & clearance state | `workforce:view` |
| `POST` | `/api/v1/organizations/:orgId/workforce/offboardings/:id/clearances/:clearanceId/verify` | Verify exit clearance item | `workforce:manage` |
| `POST` | `/api/v1/organizations/:orgId/workforce/offboardings/:id/complete` | Finalize exit & terminate M2 employment | `workforce:approve` |
| **LIFECYCLE HISTORY** | | | |
| `GET` | `/api/v1/organizations/:orgId/workforce/employments/:employmentId/history` | Aggregated lifecycle audit history | `workforce:view` |

---

## 2. Detailed Endpoint Payloads

### 2.1 Onboarding Plans

#### `POST /api/v1/organizations/:orgId/workforce/onboarding-plans`
Initiates an onboarding plan for an M2 `Employment`.

* **Request Body**:
```json
{
  "employmentId": "6e4a2f55-3d45-7f7c-cb00-8ca5904371e5",
  "templateId": "7f5b3a66-4e56-8a8d-dc11-9db6015482f6",
  "targetCompletionDate": "2026-10-31",
  "notes": "Standard engineering onboarding plan"
}
```

* **Success Response (`201 Created`)**:
```json
{
  "data": {
    "id": "8a6c4b77-5f67-9b9e-ed22-0ec7126593a7",
    "organizationId": "3b1d9c22-0a12-4c4f-9e77-5f72671048b2",
    "employmentId": "6e4a2f55-3d45-7f7c-cb00-8ca5904371e5",
    "personId": "4c2e0d33-1b23-5d5a-af88-6a83782159c3",
    "templateId": "7f5b3a66-4e56-8a8d-dc11-9db6015482f6",
    "status": "initiated",
    "targetCompletionDate": "2026-10-31",
    "createdAt": "2026-09-14T02:40:00Z"
  },
  "meta": {
    "requestId": "req-12345-wf-01"
  }
}
```

---

### 2.2 Workforce Transfers

#### `POST /api/v1/organizations/:orgId/workforce/transfers/:id/execute`
Executes an approved organizational transfer. Atomically updates M2 `employments` (`business_unit_id`, `department_id`, `team_id`, `manager_id`) and adjusts M3 `assignments`.

* **Request Body**: `{}`

* **Success Response (`200 OK`)**:
```json
{
  "data": {
    "id": "9b7d5c88-6a78-0c0f-fe33-1fd8237604b8",
    "organizationId": "3b1d9c22-0a12-4c4f-9e77-5f72671048b2",
    "employmentId": "6e4a2f55-3d45-7f7c-cb00-8ca5904371e5",
    "status": "executed",
    "effectiveDate": "2026-10-01",
    "executedAt": "2026-09-14T02:45:00Z"
  },
  "meta": {
    "requestId": "req-12345-wf-02"
  }
}
```

---

### 2.3 Workforce Offboarding

#### `POST /api/v1/organizations/:orgId/workforce/offboardings/:id/complete`
Finalizes employee exit process. Atomically updates M2 `employments.status` to `resigned` or `terminated`, sets `end_date`, closes active M3 `assignments`, and stages `workforce.offboarding.completed` outbox event.

* **Request Body**:
```json
{
  "notes": "Exit interview completed, all equipment returned and access revoked."
}
```

* **Success Response (`200 OK`)**:
```json
{
  "data": {
    "id": "0c8e6d99-7b89-1d1a-af44-2ae9348715c9",
    "organizationId": "3b1d9c22-0a12-4c4f-9e77-5f72671048b2",
    "employmentId": "6e4a2f55-3d45-7f7c-cb00-8ca5904371e5",
    "personId": "4c2e0d33-1b23-5d5a-af88-6a83782159c3",
    "exitReason": "resignation",
    "status": "completed",
    "exitDate": "2026-09-30",
    "completedAt": "2026-09-14T02:50:00Z"
  },
  "meta": {
    "requestId": "req-12345-wf-03"
  }
}
```
