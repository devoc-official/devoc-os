# REST API Architecture & Contracts M2 — People Engine

All M2 REST endpoints are mounted under `/api/v1/organisations/:orgId` or `/api/v1/organizations/:orgId` and require standard authentication headers (`Authorization: Bearer <token>`).

---

## 1. People Endpoints

### `POST /api/v1/organizations/:orgId/people`
Create a new Person record in the organization.
- **Request Body**:
  ```json
  {
    "userId": "uuid (optional)",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@example.com",
    "phone": "+1234567890",
    "bio": "Software Engineer",
    "metadata": {}
  }
  ```
- **Response**: `201 Created` with Person object.

### `GET /api/v1/organizations/:orgId/people`
List all people in the organization.
- **Response**: `200 OK` with array of Person objects.

### `GET /api/v1/organizations/:orgId/people/:personId`
Get details of a specific Person, including assigned roles and skills.
- **Response**: `200 OK` with Person object, roles, and skills.

---

## 2. Configurable Roles & Contextual Role Assignments

### `POST /api/v1/organizations/:orgId/roles`
Create a new custom role in the organization.
- **Request Body**:
  ```json
  {
    "name": "Tech Lead",
    "slug": "tech-lead",
    "description": "Technical Lead for BU"
  }
  ```

### `GET /api/v1/organizations/:orgId/roles`
List all roles in the organization.

### `POST /api/v1/organizations/:orgId/people/:personId/roles`
Assign a contextual role to a Person.
- **Request Body**:
  ```json
  {
    "roleId": "uuid",
    "businessUnitId": "uuid (optional)",
    "departmentId": "uuid (optional)",
    "teamId": "uuid (optional)"
  }
  ```

---

## 3. Employment & History Endpoints

### `POST /api/v1/organizations/:orgId/employments`
Create an employment record for a Person.
- **Request Body**:
  ```json
  {
    "personId": "uuid",
    "employmentType": "full_time",
    "jobTitle": "Senior Software Engineer",
    "startDate": "2026-01-01",
    "managerPersonId": "uuid (optional)",
    "businessUnitId": "uuid (optional)"
  }
  ```

### `GET /api/v1/organizations/:orgId/employments`
List all employments in the organization.

### `PATCH /api/v1/organizations/:orgId/employments/:employmentId/status`
Transition employment status in the state machine (`probation` -> `active` -> `suspended` -> `terminated`/`resigned`).
- **Request Body**:
  ```json
  {
    "newStatus": "active",
    "reason": "Passed probation review"
  }
  ```

### `GET /api/v1/organizations/:orgId/employments/:employmentId/history`
Get the append-only transition history of an employment record.

---

## 4. Skills Taxonomy Endpoints

### `POST /api/v1/organizations/:orgId/skills`
Create a new Skill in the organization taxonomy.
- **Request Body**:
  ```json
  {
    "name": "TypeScript",
    "category": "Engineering",
    "description": "Typed JavaScript"
  }
  ```

### `GET /api/v1/organizations/:orgId/skills`
List all skills in the organization.

### `POST /api/v1/organizations/:orgId/people/:personId/skills`
Assign a skill with proficiency to a Person.
- **Request Body**:
  ```json
  {
    "skillId": "uuid",
    "proficiencyLevel": "advanced"
  }
  ```
