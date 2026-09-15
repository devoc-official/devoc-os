# DeVoc OS Role System

## 1. Architectural Source of Truth

> **CRITICAL INVARIANT**: The frontend NEVER creates an independent authorization role model or parallel role database.

All role definitions and user assignments originate in the backend:
- **Organization Membership**: Defined in `organization_memberships` (`org_admin` | `org_member`).
- **Domain Roles**: Defined in M2 `roles` table (e.g. `ROLE-FOUNDER`, `ROLE-EMPLOYEE`, `ROLE-MENTOR`, `ROLE-STUDENT`, `ROLE-REVIEWER`).
- **Assigned Person Roles**: Defined in M2 `person_roles` table, linking a `Person` to a `Role` with `status = 'active'`.

---

## 2. Active Role Resolution Lifecycle

```text
1. User logs in (/api/v1/auth/login)
   Returns: UserIdentity (id, email, fullName, isPlatformAdmin) + AccessToken

2. Fetch User Memberships (/api/v1/auth/me)
   Returns: Organizations the user belongs to + Membership role (org_admin / org_member)

3. Active Organization Selected
   Header: X-Organization-Id: <selectedOrgId>

4. Query Person in Organization (/api/v1/people?userId=<userId>)
   Returns: Person record associated with this user identity

5. Query Active Person Roles (/api/v1/people/:personId/roles)
   Filter: status === 'active' AND (endDate IS NULL OR endDate >= NOW())
   Returns: List of active PersonRole records

6. Role Resolver maps PersonRoles to Supported Experience Categories:
   - 'ROLE-FOUNDER'   ──► 'founder'
   - 'ROLE-MENTOR'    ──► 'mentor'
   - 'ROLE-REVIEWER'  ──► 'reviewer'
   - 'ROLE-STUDENT'   ──► 'student'
   - 'ROLE-EMPLOYEE'  ──► 'employee'
   - Developer/PM     ──► 'developer' / 'project_manager' (via assignment context)
```

---

## 3. Supported Experience Categories

| Experience Category | Role Code | Primary Value Proposition | Typical Capabilities |
| :--- | :--- | :--- | :--- |
| **Founder** | `ROLE-FOUNDER` | Executive control, multi-BU orchestration, company KPIs | `analytics:view`, `admin:manage`, `workforce:manage` |
| **Mentor** | `ROLE-MENTOR` | 1-on-1 student guidance, roadmap adaptation, reviews | `learning:view`, `learning:manage`, `evaluations:create` |
| **Reviewer** | `ROLE-REVIEWER`| Qualitative assessment, milestone verdicts, suggestions | `evaluations:create`, `evaluations:view` |
| **Student** | `ROLE-STUDENT` | Self-learning pace, milestone submissions, feedback | `learning:view`, `learning:submit` |
| **Employee** | `ROLE-EMPLOYEE`| Daily presence, work logging, timesheets, meetings | `workforce_time:create`, `work:create`, `meetings:view` |
| **Developer** | Assigned dev | Sprint tasks, feature implementation, repo work | `projects:view`, `tasks:manage`, `work:create` |
| **Academy Head** | Lead role | Program curriculums, mentor assignments, placement | `learning:admin`, `evaluations:approve`, `analytics:view` |
| **Project Manager**| Assigned PM | Backlogs, dependencies, sprint execution, blockers | `projects:manage`, `tasks:manage`, `assignments:manage` |
| **Administrator**| `org_admin` | Tenant configuration, member roles, billing | `admin:manage`, `organization:admin` |

---

## 4. Multi-Role Profiles in Practice

Real-world DeVoc staff frequently hold multiple roles simultaneously:
- **Founder + Mentor**: Oversees company growth while directly mentoring select students.
- **Developer + Reviewer**: Builds core SaaS features and conducts weekly milestone reviews for students.
- **Employee + Project Manager**: Executes engineering tasks while tracking team sprint delivery.

In DeVoc OS:
1. The **Unified Dashboard** displays high-level information across ALL active roles simultaneously.
2. The **RoleSwitcher** allows the user to focus on a specific role workspace whenever they need deep immersion in that role's workflows.
3. Switching roles **never alters backend capabilities or privileges**.

---

## 5. Security Invariant: Role Perspective vs Permission Authority

Switching roles in the frontend only updates the UI perspective (`activeRole`). It **never** sends an instruction to the backend to elevate privileges.

If an employee switches their frontend view to "Founder":
- The UI may switch to a founder workspace layout.
- Any attempt to fetch founder-only data or mutate restricted records will be intercepted by the backend:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Action requires one of the following roles: org_admin"
    },
    "requestId": "..."
  }
  ```
- The frontend gracefully displays a `Permission Denied` state with an explanation and an option to switch back to an authorized role.
