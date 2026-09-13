# REST API Architecture & Contracts — M11 Analytics

## Base URL

`/api/v1/analytics`

All endpoints require JWT Authentication (`Authorization: Bearer <token>`) and mandatory Tenant Resolution via `X-Organization-Id` header or authenticated user organization context.

---

## Authorization & Security Rules

* **Tenant Isolation**: All operations mandate `organization_id`. Requests attempting to access metric definitions, results, or saved reports belonging to another tenant return HTTP `404 Not Found`.
* **Required Permissions**:
  * `analytics:view`: Required to list metric definitions, view metric definitions, compute metric results, list saved reports, and execute saved reports.
  * `analytics:define`: Required to create, update, or deactivate metric definitions and saved reports.
* **Per-Execution Contextual Scope Security**:
  * Metric computation and report execution automatically enforce the user's authorized organizational scope (`Role + Business Unit + Team + Project`).
  * Setting `isPublic = true` on a saved report shares the report layout definition (title, metrics list, dimensions) with authorized tenant users. It does **NOT** grant data access to underlying domain metrics or physical tables.
  * Every report execution independently re-evaluates the caller's organizational scope against every underlying metric and source table.

---

## Declarative Safety Validation

All `calculationSpec` structures submitted via `POST /api/v1/analytics/metrics` are validated against the **Analytics Source Registry**:
* Allowed logical source entities: `WORK_RECORD`, `WORK_CATEGORY`, `WORK_EVIDENCE`, `OUTCOME`, `WORK_OUTCOME`, `PROJECT`, `PROJECT_OWNER`, `PROJECT_BUSINESS_UNIT`, `TASK`, `TASK_DEPENDENCY`, `LEARNING_PROGRAM`, `LEARNING_PROGRAM_MILESTONE`, `LEARNING_ACTIVITY_DEFINITION`, `LEARNING_ENROLLMENT`, `ENROLLMENT_MILESTONE`, `LEARNING_ACTIVITY`, `LEARNING_REVIEW`, `LEARNING_ASSESSMENT`, `EVALUATION_TEMPLATE`, `EVALUATION_CRITERION`, `EVALUATION`, `CRITERION_RESULT`, `EVALUATION_OUTCOME`, `FINANCE_CATEGORY`, `FINANCIAL_PARTY`, `FINANCIAL_OBLIGATION`, `FINANCIAL_TRANSACTION`, `FINANCIAL_ALLOCATION`, `FINANCIAL_BUDGET`, `PERSON`, `ROLE`, `PERSON_ROLE`, `EMPLOYMENT`, `SKILL`, `PERSON_SKILL`, `ASSIGNMENT`, `MEETING_TYPE`, `MEETING`, `MEETING_TARGET`, `MEETING_PARTICIPANT`, `MEETING_AGENDA_ITEM`, `MEETING_NOTE`, `MEETING_DECISION`, `MEETING_ACTION_ITEM`, `AUDIT_LOG`, `EVENT_OUTBOX`.
* Allowed operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `between`, `is_null`, `is_not_null`.
* Allowed aggregations: `COUNT`, `SUM`, `AVERAGE`, `MIN`, `MAX`, `RATE`, `PERCENTAGE`, `WEIGHTED_AGGREGATION`, `TREND`.

Requests containing unlisted logical entity identifiers, physical table names, column names, raw SQL fragments, or dynamic code snippets return HTTP `400 Bad Request`.

---

## Response & Error Envelopes

### Success Envelope
```json
{
  "data": {},
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2026-09-13T18:50:00Z"
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to access analytics for this business unit",
    "details": []
  },
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2026-09-13T18:50:00Z"
  }
}
```

---

## Endpoint Contracts

### 1. Create Metric Definition
`POST /api/v1/analytics/metrics`

Creates a new declarative metric specification for the tenant.

**Permission**: `analytics:define`

**Request Body**:
```json
{
  "name": "Student Placement Rate",
  "code": "KPI_PLACEMENT_RATE",
  "domainModule": "learning",
  "metricType": "PERCENTAGE",
  "calculationSpec": {
    "numerator": {
      "sourceEntity": "LEARNING_ENROLLMENT",
      "filter": { "status": "completed", "is_placed": true }
    },
    "denominator": {
      "sourceEntity": "LEARNING_ENROLLMENT",
      "filter": { "status": "completed" }
    }
  },
  "supportedDimensions": ["organization_id", "learning_program_id", "time_period"]
}
```

**Response (201 Created)**:
```json
{
  "data": {
    "id": "77a82b99-3c41-4822-a9e1-b841029c7821",
    "organizationId": "e2cca8ed-b8c2-476b-b77c-b0fcb50cae2a",
    "name": "Student Placement Rate",
    "code": "KPI_PLACEMENT_RATE",
    "domainModule": "learning",
    "metricType": "PERCENTAGE",
    "calculationSpec": {
      "numerator": {
        "sourceEntity": "LEARNING_ENROLLMENT",
        "filter": { "status": "completed", "is_placed": true }
      },
      "denominator": {
        "sourceEntity": "LEARNING_ENROLLMENT",
        "filter": { "status": "completed" }
      }
    },
    "supportedDimensions": ["organization_id", "learning_program_id", "time_period"],
    "createdBy": "user-admin-uuid",
    "isActive": true,
    "createdAt": "2026-09-13T18:50:00.000Z",
    "updatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-1", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 2. List Metric Definitions
`GET /api/v1/analytics/metrics`

Lists active metric definitions for the organization.

**Permission**: `analytics:view`

**Query Parameters**:
* `domainModule` (optional): Filter by domain module (`learning`, `finance`, `work`, etc.).
* `metricType` (optional): Filter by metric type (`COUNT`, `PERCENTAGE`, etc.).
* `limit` (optional, default 50): Pagination limit.
* `offset` (optional, default 0): Pagination offset.

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "77a82b99-3c41-4822-a9e1-b841029c7821",
      "name": "Student Placement Rate",
      "code": "KPI_PLACEMENT_RATE",
      "domainModule": "learning",
      "metricType": "PERCENTAGE",
      "supportedDimensions": ["organization_id", "learning_program_id", "time_period"],
      "isActive": true
    }
  ],
  "meta": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "requestId": "req-m11-2",
    "timestamp": "2026-09-13T18:50:00Z"
  }
}
```

---

### 3. Get Metric Definition by ID
`GET /api/v1/analytics/metrics/:id`

Retrieves single metric definition by primary key.

**Permission**: `analytics:view`

**Response (200 OK)**:
```json
{
  "data": {
    "id": "77a82b99-3c41-4822-a9e1-b841029c7821",
    "organizationId": "e2cca8ed-b8c2-476b-b77c-b0fcb50cae2a",
    "name": "Student Placement Rate",
    "code": "KPI_PLACEMENT_RATE",
    "domainModule": "learning",
    "metricType": "PERCENTAGE",
    "calculationSpec": {
      "numerator": { "sourceEntity": "LEARNING_ENROLLMENT", "filter": { "status": "completed", "is_placed": true } },
      "denominator": { "sourceEntity": "LEARNING_ENROLLMENT", "filter": { "status": "completed" } }
    },
    "supportedDimensions": ["organization_id", "learning_program_id", "time_period"],
    "createdBy": "user-admin-uuid",
    "isActive": true,
    "createdAt": "2026-09-13T18:50:00.000Z",
    "updatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-3", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 4. Compute Metric Result
`POST /api/v1/analytics/metrics/:id/compute`

Computes metric result on-demand or retrieves a pre-computed historical snapshot.

**Permission**: `analytics:view`

**Request Body**:
```json
{
  "periodType": "month",
  "startDate": "2026-08-01T00:00:00Z",
  "endDate": "2026-08-31T23:59:59Z",
  "dimensionFilters": {
    "learning_program_id": "prog-fs-eng-uuid"
  },
  "useSnapshot": false,
  "calculationVersion": 1
}
```

**Response (200 OK)**:
```json
{
  "data": {
    "metricDefinitionId": "77a82b99-3c41-4822-a9e1-b841029c7821",
    "code": "KPI_PLACEMENT_RATE",
    "periodType": "month",
    "periodStart": "2026-08-01T00:00:00.000Z",
    "periodEnd": "2026-08-31T23:59:59.000Z",
    "dimensionValues": {
      "learning_program_id": "prog-fs-eng-uuid"
    },
    "numericValue": 85.7143,
    "details": {
      "numeratorCount": 18,
      "denominatorCount": 21
    },
    "calculationVersion": 1,
    "calculationRunId": "run-99b11a44-uuid",
    "calculatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-4", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 5. Create Saved Report Configuration
`POST /api/v1/analytics/reports`

Saves a reusable report query layout for tenant users.

**Permission**: `analytics:define`

**Request Body**:
```json
{
  "name": "Academy Placement & Finance Overview",
  "description": "Monthly report tracking placement rate and incoming revenue.",
  "metricIds": ["77a82b99-3c41-4822-a9e1-b841029c7821"],
  "dimensions": ["learning_program_id", "business_unit_id"],
  "filters": {
    "business_unit_id": "bu-academy-uuid"
  },
  "timeWindow": {
    "periodType": "month",
    "startDate": "2026-08-01T00:00:00Z",
    "endDate": "2026-08-31T23:59:59Z"
  },
  "groupBy": ["learning_program_id"],
  "sortBy": [{ "field": "numericValue", "direction": "DESC" }],
  "isPublic": true
}
```

**Response (201 Created)**:
```json
{
  "data": {
    "id": "rep-99b11a44-8c12-4211-9e45-123456789abc",
    "organizationId": "e2cca8ed-b8c2-476b-b77c-b0fcb50cae2a",
    "name": "Academy Placement & Finance Overview",
    "description": "Monthly report tracking placement rate and incoming revenue.",
    "metricIds": ["77a82b99-3c41-4822-a9e1-b841029c7821"],
    "dimensions": ["learning_program_id", "business_unit_id"],
    "filters": { "business_unit_id": "bu-academy-uuid" },
    "timeWindow": { "periodType": "month" },
    "groupBy": ["learning_program_id"],
    "sortBy": [{ "field": "numericValue", "direction": "DESC" }],
    "createdBy": "user-admin-uuid",
    "isPublic": true,
    "createdAt": "2026-09-13T18:50:00.000Z",
    "updatedAt": "2026-09-13T18:50:00.000Z"
  },
  "meta": { "requestId": "req-m11-5", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 6. List Saved Reports
`GET /api/v1/analytics/reports`

Lists saved report configurations available to the caller within the organization.

**Permission**: `analytics:view`

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "rep-99b11a44-8c12-4211-9e45-123456789abc",
      "name": "Academy Placement & Finance Overview",
      "description": "Monthly report tracking placement rate and incoming revenue.",
      "metricIds": ["77a82b99-3c41-4822-a9e1-b841029c7821"],
      "isPublic": true,
      "createdAt": "2026-09-13T18:50:00.000Z"
    }
  ],
  "meta": { "total": 1, "requestId": "req-m11-6", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---

### 7. Execute Saved Report
`POST /api/v1/analytics/reports/:id/execute`

Executes a saved report query configuration, evaluating included metrics and returning grouped result sets scoped to caller's permissions.

**Permission**: `analytics:view`

**Request Body (Optional Overrides)**:
```json
{
  "overrideTimeWindow": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-08-31T23:59:59Z"
  }
}
```

**Response (200 OK)**:
```json
{
  "data": {
    "reportId": "rep-99b11a44-8c12-4211-9e45-123456789abc",
    "reportName": "Academy Placement & Finance Overview",
    "executedAt": "2026-09-13T18:50:00.000Z",
    "results": [
      {
        "metricCode": "KPI_PLACEMENT_RATE",
        "metricName": "Student Placement Rate",
        "groupKey": { "learning_program_id": "prog-fs-eng-uuid" },
        "numericValue": 85.7143,
        "details": { "numeratorCount": 18, "denominatorCount": 21 }
      }
    ]
  },
  "meta": { "requestId": "req-m11-7", "timestamp": "2026-09-13T18:50:00Z" }
}
```

---
*Document frozen for Milestone 11 – Analytics API Contracts.*

