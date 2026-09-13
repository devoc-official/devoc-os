# REST API Architecture & Contracts — M13 Recruitment Engine

## API Specification Overview

* **Canonical Base URL**: `/api/v1/organizations/:orgId/recruitment`
* **Authentication**: Bearer JWT token required (`Authorization: Bearer <token>`).
* **Tenant Scoping & Multi-Tenant Defense**: All operations require an authenticated user with valid tenant membership in `:orgId`. All referenced cross-domain entities (BUs, departments, teams, roles, people) are strictly validated for same-organization ownership. Cross-tenant access returns HTTP `404 Not Found`.
* **Standard Response Envelope**:
```json
{
  "data": {},
  "meta": {
    "requestId": "req-12345-recruitment-01"
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
    "requestId": "req-12345-recruitment-02"
  }
}
```

---

## 1. Summary of Canonical Endpoints

| Method | Canonical Endpoint | Description | Required Capability |
|---|---|---|---|
| **POSITIONS** | | | |
| `POST` | `/api/v1/organizations/:orgId/recruitment/positions` | Create a new job requisition | `recruitment:create` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/positions` | List requisitions with filters | `recruitment:view` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/positions/:id` | Get details of a position | `recruitment:view` |
| `PATCH`| `/api/v1/organizations/:orgId/recruitment/positions/:id` | Update position attributes | `recruitment:manage` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/positions/:id/open` | Open position for hiring | `recruitment:manage` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/positions/:id/pause` | Temporarily pause hiring | `recruitment:manage` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/positions/:id/close` | Close position (terminal) | `recruitment:manage` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/positions/:id/archive`| Archive position | `recruitment:manage` |
| **CANDIDATES** | | | |
| `POST` | `/api/v1/organizations/:orgId/recruitment/candidates` | Create a candidate profile | `recruitment:create` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/candidates` | List candidates with filters | `recruitment:view` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/candidates/:id` | Get candidate profile & history | `recruitment:view` |
| `PATCH`| `/api/v1/organizations/:orgId/recruitment/candidates/:id` | Update candidate metadata | `recruitment:manage` |
| **PIPELINE STAGES** | | | |
| `GET` | `/api/v1/organizations/:orgId/recruitment/stages` | List configured pipeline stages | `recruitment:view` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/stages` | Create custom pipeline stage | `recruitment:admin` |
| `PATCH`| `/api/v1/organizations/:orgId/recruitment/stages/:id` | Update stage name or order | `recruitment:admin` |
| **APPLICATIONS** | | | |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications` | Apply candidate to position | `recruitment:create` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/applications` | List applications with filters | `recruitment:view` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/applications/:id` | Get application details & timeline| `recruitment:view` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/advance`| Advance application to next stage| `recruitment:manage` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/reject` | Reject application (terminal) | `recruitment:decide` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/withdraw`| Withdraw application (terminal)| `recruitment:manage` |
| **STAGE ASSESSMENTS & MEETINGS** | | | |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/stages/:stageId/evaluate` | Record triage / link M8 | `recruitment:assess` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/stages/:stageId/schedule-interview`| Schedule meeting via M6 | `recruitment:manage` |
| **TRIALS** | | | |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/trial` | Schedule candidate trial | `recruitment:manage` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/applications/:id/trial` | Get active trial details | `recruitment:view` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/trial/start` | Activate trial audition | `recruitment:manage` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/trial/complete`| Conclude trial with M8 review | `recruitment:manage` |
| **OFFERS** | | | |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/offer` | Issue formal employment offer | `recruitment:offer` |
| `GET` | `/api/v1/organizations/:orgId/recruitment/applications/:id/offer` | Get active offer details | `recruitment:view` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/offers/:offerId/accept` | Record offer acceptance | `recruitment:offer` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/offers/:offerId/reject` | Record offer decline (terminal)| `recruitment:offer` |
| `POST` | `/api/v1/organizations/:orgId/recruitment/offers/:offerId/rescind`| Rescind issued offer (terminal)| `recruitment:offer` |
| **HIRING CONVERSION** | | | |
| `POST` | `/api/v1/organizations/:orgId/recruitment/applications/:id/hire` | Explicit atomic candidate conversion | `recruitment:decide` |

---

## 2. Detailed Endpoint Contracts

### 2.1 Positions

#### `POST /api/v1/organizations/:orgId/recruitment/positions`
Creates a new recruitment requisition in `draft` status.

* **Request Body**:
```json
{
  "title": "Senior Backend Developer",
  "code": "REQ-ENG-2026-01",
  "businessUnitId": "3b1d9c22-0a12-4c4f-9e77-5f72671048b2",
  "departmentId": "4c2e0d33-1b23-5d5a-af88-6a83782159c3",
  "teamId": "5d3f1e44-2c34-6e6b-ba99-7b94893260d4",
  "targetRoleId": "6e4a2f55-3d45-7f7c-cb00-8ca5904371e5",
  "employmentType": "full_time",
  "openingsCount": 2,
  "hiringManagerId": "7f5b3a66-4e56-8a8d-dc11-9db6015482f6",
  "recruiterId": "8a6c4b77-5f67-9b9e-ed22-0ec7126593a7",
  "description": "Lead core platform micro-monolith services development in TypeScript.",
  "requirements": "Strong PostgreSQL, architecture principles, TypeScript, Vitest.",
  "minSalary": 80000,
  "maxSalary": 110000,
  "currency": "USD",
  "targetStartDate": "2026-10-01"
}
```

* **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "9b7d5c88-6a78-0c0f-fe33-1fd8237604b8",
    "organizationId": "df368955-d081-442c-a7a7-8d392be561f7",
    "title": "Senior Backend Developer",
    "code": "REQ-ENG-2026-01",
    "status": "draft",
    "openingsCount": 2,
    "hiredCount": 0,
    "createdAt": "2026-09-14T10:00:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-pos-01"
  }
}
```

* **Error Codes**:
  - `400 VALIDATION_ERROR`: Invalid currency, negative openings, or minSalary > maxSalary.
  - `403 FORBIDDEN`: Missing `recruitment:create` capability.
  - `404 NOT_FOUND`: Target BU, department, team, role, or manager does not belong to `:orgId`.
  - `409 CONFLICT`: Position code already exists in tenant organization.

---

#### `POST /api/v1/organizations/:orgId/recruitment/positions/:id/close`
Transitions position status from `open` or `paused` to `closed`. Closed requisitions cannot be reopened; reopening is prohibited to maintain clean time-to-fill analytics in M11.

* **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "9b7d5c88-6a78-0c0f-fe33-1fd8237604b8",
    "status": "closed",
    "closedAt": "2026-09-14T10:05:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-pos-02"
  }
}
```

---

### 2.2 Candidates

#### `POST /api/v1/organizations/:orgId/recruitment/candidates`
Registers a new candidate in the recruitment engine.

* **Request Body**:
```json
{
  "firstName": "Alex",
  "lastName": "Mercer",
  "email": "alex.mercer@example.com",
  "phone": "+1-555-0199",
  "source": "referral",
  "sourceDetails": "Referred by John Doe (Tech Lead)",
  "resumeUrl": "https://storage.devoc.internal/resumes/alex-mercer-2026.pdf",
  "portfolioUrl": "https://github.com/alexmercer",
  "skills": ["TypeScript", "PostgreSQL", "Node.js", "Docker"]
}
```

* **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "organizationId": "df368955-d081-442c-a7a7-8d392be561f7",
    "firstName": "Alex",
    "lastName": "Mercer",
    "email": "alex.mercer@example.com",
    "source": "referral",
    "status": "active",
    "createdAt": "2026-09-14T10:10:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-cand-01"
  }
}
```

---

### 2.3 Applications

#### `POST /api/v1/organizations/:orgId/recruitment/applications`
Initiates an application for a candidate against a position.

* **Request Body**:
```json
{
  "candidateId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "positionId": "9b7d5c88-6a78-0c0f-fe33-1fd8237604b8",
  "notes": "Expresses strong interest in enterprise architecture."
}
```

* **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "organizationId": "df368955-d081-442c-a7a7-8d392be561f7",
    "candidateId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "positionId": "9b7d5c88-6a78-0c0f-fe33-1fd8237604b8",
    "currentStage": {
      "stageCode": "APPLIED",
      "name": "Application Received"
    },
    "status": "applied",
    "appliedAt": "2026-09-14T10:15:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-app-01"
  }
}
```

* **Error Codes**:
  - `404 NOT_FOUND`: Candidate or position does not exist in `:orgId`.
  - `409 CONFLICT`: Candidate already has an active application for this position.
  - `422 UNPROCESSABLE_ENTITY`: Position is not in `open` status.

---

#### `POST /api/v1/organizations/:orgId/recruitment/applications/:id/reject`
Rejects an application. This is a terminal state for the specific application; the candidate remains in `active` status and eligible for other or future applications.

* **Request Body**:
```json
{
  "reason": "Insufficient experience in PostgreSQL query optimization."
}
```

* **Success Response (200 OK)**:
```json
{
  "data": {
    "applicationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "status": "rejected",
    "rejectedAt": "2026-09-14T10:18:00.000Z",
    "candidateStatus": "active"
  },
  "meta": {
    "requestId": "req-recruitment-app-reject"
  }
}
```

---

### 2.4 Application Stage Triage & Evaluations

#### `POST /api/v1/organizations/:orgId/recruitment/applications/:id/stages/:stageId/evaluate`
Records a stage outcome. M8 Evaluation Engine is authoritative for formal scorecards; this endpoint links an `evaluationId` or records lightweight non-evaluative triage notes.

* **Request Body**:
```json
{
  "status": "passed",
  "evaluationId": "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
  "notes": "Passed live architecture review. Evaluation scorecard recorded in M8."
}
```

* **Success Response (200 OK)**:
```json
{
  "data": {
    "stageId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    "status": "passed",
    "evaluationId": "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
    "completedAt": "2026-09-14T10:25:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-stage-eval"
  }
}
```

---

### 2.5 Employment Offers

#### `POST /api/v1/organizations/:orgId/recruitment/applications/:id/offer`
Issues a formal compensation offer. Transitions `application.status` to `offered`. Only one offer may be in `draft` or `issued` status for an application.

* **Request Body**:
```json
{
  "proposedRoleId": "6e4a2f55-3d45-7f7c-cb00-8ca5904371e5",
  "employmentType": "full_time",
  "baseSalary": 95000,
  "currency": "USD",
  "compensationFrequency": "annual",
  "proposedStartDate": "2026-10-15",
  "expiresAt": "2026-09-30T23:59:59.000Z",
  "termsConditions": "Standard full-time employment agreement with healthcare benefits."
}
```

* **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
    "applicationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "applicationStatus": "offered",
    "status": "issued",
    "baseSalary": 95000,
    "currency": "USD",
    "proposedStartDate": "2026-10-15",
    "issuedAt": "2026-09-14T10:30:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-offer-01"
  }
}
```

---

#### `POST /api/v1/organizations/:orgId/recruitment/offers/:offerId/accept`
Records candidate acceptance of an employment offer. Marks `offer.status = 'accepted'`. `application.status` remains `offered`. This satisfies the prerequisite for the explicit `/hire` conversion operation without automatically converting the candidate.

* **Request Body**:
```json
{
  "responseNotes": "Candidate signed digital offer letter."
}
```

* **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
    "applicationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "status": "accepted",
    "applicationStatus": "offered",
    "respondedAt": "2026-09-14T10:35:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-offer-accept"
  }
}
```

---

### 2.6 Authoritative Candidate Conversion & Hiring

#### `POST /api/v1/organizations/:orgId/recruitment/applications/:id/hire`
The single authoritative conversion operation. Converts an accepted candidate into an M2 `Person` and creates an M2 `Employment` contract atomically. Automatically withdraws all other active applications for the same candidate.

* **Eligibility Preconditions**:
  1. `application.status == 'offered'`
  2. Associated offer has `status == 'accepted'`
  3. Position has available headcount: `hired_count < openings_count`

* **Request Body**:
```json
{
  "offerId": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b"
}
```

* **Success Response (200 OK)**:
```json
{
  "data": {
    "applicationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "candidateId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "personId": "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
    "employmentId": "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "status": "hired",
    "hiredAt": "2026-09-14T10:40:00.000Z",
    "withdrawnConcurrentApplications": [
      "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"
    ],
    "positionStatus": "open",
    "positionHiredCount": 1,
    "positionOpeningsCount": 2
  },
  "meta": {
    "requestId": "req-recruitment-hire-01"
  }
}
```

* **Error Codes**:
  - `400 VALIDATION_ERROR`: Application is not in `offered` status, or associated offer is not in `accepted` status, or target position has no available openings.
  - `403 FORBIDDEN`: Caller lacks `recruitment:decide` capability.
  - `404 NOT_FOUND`: Application or offer does not belong to `:orgId`.
  - `409 IDENTITY_CONFLICT`: Candidate email matches an existing M2 Person in the organization, but candidate has no verified `internal_person_id`. Explicit administrative resolution required (no silent auto-linking).
  - `409 CONFLICT`: Application or candidate is already marked as `hired`.
