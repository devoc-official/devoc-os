# REST API Architecture & Contracts — M13 Recruitment Engine

## API Specification Overview

* **Base URL**: `/api/v1/recruitment` (with tenant context header `X-Organization-Id` or route prefix `/api/v1/organizations/:orgId/recruitment`).
* **Authentication**: Bearer JWT token required (`Authorization: Bearer <token>`).
* **Tenant Scoping**: All operations require an authenticated user with valid tenant membership. Cross-tenant access returns HTTP `404 Not Found`.
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

## 1. Summary of Endpoints

| Method | Endpoint | Description | Required Capability |
|---|---|---|---|
| **POSITIONS** | | | |
| `POST` | `/api/v1/recruitment/positions` | Create a new job requisition | `recruitment:create` |
| `GET` | `/api/v1/recruitment/positions` | List requisitions with filters | `recruitment:view` |
| `GET` | `/api/v1/recruitment/positions/:id` | Get details of a position | `recruitment:view` |
| `PATCH`| `/api/v1/recruitment/positions/:id` | Update position attributes | `recruitment:manage` |
| `POST` | `/api/v1/recruitment/positions/:id/open` | Open position for hiring | `recruitment:manage` |
| `POST` | `/api/v1/recruitment/positions/:id/pause` | Temporarily pause hiring | `recruitment:manage` |
| `POST` | `/api/v1/recruitment/positions/:id/close` | Close position | `recruitment:manage` |
| `POST` | `/api/v1/recruitment/positions/:id/archive` | Archive position | `recruitment:manage` |
| **CANDIDATES** | | | |
| `POST` | `/api/v1/recruitment/candidates` | Create a candidate profile | `recruitment:create` |
| `GET` | `/api/v1/recruitment/candidates` | List candidates with filters | `recruitment:view` |
| `GET` | `/api/v1/recruitment/candidates/:id` | Get candidate profile & history | `recruitment:view` |
| `PATCH`| `/api/v1/recruitment/candidates/:id` | Update candidate metadata | `recruitment:manage` |
| **PIPELINE STAGES** | | | |
| `GET` | `/api/v1/recruitment/stages` | List configured pipeline stages | `recruitment:view` |
| `POST` | `/api/v1/recruitment/stages` | Create custom pipeline stage | `recruitment:admin` |
| `PATCH`| `/api/v1/recruitment/stages/:id` | Update stage name or order | `recruitment:admin` |
| **APPLICATIONS** | | | |
| `POST` | `/api/v1/recruitment/applications` | Apply candidate to position | `recruitment:create` |
| `GET` | `/api/v1/recruitment/applications` | List applications with filters | `recruitment:view` |
| `GET` | `/api/v1/recruitment/applications/:id` | Get application details & stages| `recruitment:view` |
| `POST` | `/api/v1/recruitment/applications/:id/advance` | Advance application to next stage| `recruitment:manage` |
| `POST` | `/api/v1/recruitment/applications/:id/reject` | Reject application | `recruitment:decide` |
| `POST` | `/api/v1/recruitment/applications/:id/withdraw` | Withdraw application | `recruitment:manage` |
| **STAGE ASSESSMENTS & MEETINGS** | | | |
| `POST` | `/api/v1/recruitment/applications/:id/stages/:stageId/evaluate` | Record evaluation / link M8 | `recruitment:assess` |
| `POST` | `/api/v1/recruitment/applications/:id/stages/:stageId/schedule-interview`| Schedule meeting via M6 | `recruitment:manage` |
| **TRIALS** | | | |
| `POST` | `/api/v1/recruitment/applications/:id/trial` | Schedule candidate trial | `recruitment:manage` |
| `GET` | `/api/v1/recruitment/applications/:id/trial` | Get active trial details | `recruitment:view` |
| `POST` | `/api/v1/recruitment/applications/:id/trial/start` | Activate trial & M3 assignment | `recruitment:manage` |
| `POST` | `/api/v1/recruitment/applications/:id/trial/complete`| Conclude trial with M8 review | `recruitment:manage` |
| **OFFERS** | | | |
| `POST` | `/api/v1/recruitment/applications/:id/offer` | Issue formal employment offer | `recruitment:offer` |
| `GET` | `/api/v1/recruitment/applications/:id/offer` | Get active offer details | `recruitment:view` |
| `POST` | `/api/v1/recruitment/offers/:offerId/accept` | Record offer acceptance | `recruitment:offer` |
| `POST` | `/api/v1/recruitment/offers/:offerId/reject` | Record offer rejection | `recruitment:offer` |
| `POST` | `/api/v1/recruitment/offers/:offerId/rescind`| Rescind issued offer | `recruitment:offer` |
| **HIRING CONVERSION** | | | |
| `POST` | `/api/v1/recruitment/applications/:id/hire` | Convert candidate to Person (M2)| `recruitment:decide` |

---

## 2. Detailed Endpoint Contracts

### 2.1 Positions

#### `POST /api/v1/recruitment/positions`
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
  - `409 CONFLICT`: Position code already exists in tenant organization.

---

#### `POST /api/v1/recruitment/positions/:id/open`
Transitions position status from `draft` or `paused` to `open`.

* **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "9b7d5c88-6a78-0c0f-fe33-1fd8237604b8",
    "status": "open",
    "openedAt": "2026-09-14T10:05:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-pos-02"
  }
}
```

---

### 2.2 Candidates

#### `POST /api/v1/recruitment/candidates`
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

#### `POST /api/v1/recruitment/applications`
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
  - `409 CONFLICT`: Candidate already has an active application for this position.
  - `422 UNPROCESSABLE_ENTITY`: Position is not in `open` status.

---

#### `POST /api/v1/recruitment/applications/:id/advance`
Advances an application to the next pipeline stage.

* **Request Body**:
```json
{
  "nextStageId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
  "notes": "Passed technical assessment with 92/100 score."
}
```

* **Success Response (200 OK)**:
```json
{
  "data": {
    "applicationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "previousStageCode": "TECH_ASSESSMENT",
    "currentStageCode": "PANEL_INTERVIEW",
    "status": "interview",
    "updatedAt": "2026-09-14T10:20:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-app-02"
  }
}
```

---

### 2.4 Candidate Trials

#### `POST /api/v1/recruitment/applications/:id/trial`
Schedules an operational audition trial for an application.

* **Request Body**:
```json
{
  "startDate": "2026-09-20",
  "endDate": "2026-10-04",
  "mentorId": "7f5b3a66-4e56-8a8d-dc11-9db6015482f6",
  "objectives": "Implement prototype feature in Billing BU; participate in daily standups."
}
```

* **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
    "applicationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "startDate": "2026-09-20",
    "endDate": "2026-10-04",
    "status": "scheduled",
    "mentorId": "7f5b3a66-4e56-8a8d-dc11-9db6015482f6"
  },
  "meta": {
    "requestId": "req-recruitment-trial-01"
  }
}
```

---

### 2.5 Employment Offers

#### `POST /api/v1/recruitment/applications/:id/offer`
Issues a formal compensation offer.

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

#### `POST /api/v1/recruitment/offers/:offerId/accept`
Records candidate acceptance of an employment offer.

* **Request Body**:
```json
{
  "responseNotes": "Candidate formally signed digital offer letter."
}
```

* **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
    "status": "accepted",
    "respondedAt": "2026-09-14T10:35:00.000Z"
  },
  "meta": {
    "requestId": "req-recruitment-offer-02"
  }
}
```

---

### 2.6 Candidate Conversion & Hiring

#### `POST /api/v1/recruitment/applications/:id/hire`
Converts an accepted candidate into an authoritative organizational `Person` and creates an `Employment` record in M2.

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
  - `400 VALIDATION_ERROR`: Offer must be in `accepted` status before conversion can occur.
  - `409 CONFLICT`: Candidate or application is already marked as `hired`.
  - `403 FORBIDDEN`: Missing `recruitment:decide` capability.
