# DeVoc OS Experience Architecture

## 1. Core Paradigm: Role-Centric, Not Module-Centric

Traditional enterprise software forces users to navigate arbitrary database modules:

$$\text{User} \longrightarrow \text{People Module} \lor \text{Project Module} \lor \text{Finance Module}$$

In contrast, DeVoc OS organizes the frontend around **User Responsibilities and Experiences**:

```text
Unified Identity
      ↓
Active Roles (Multiple simultaneous)
      ↓
Backend Capabilities (Authority)
      ↓
Organizational Context
      ↓
Experience Resolver
      ↓
Unified Multi-Role Dashboard
      ↓ (Optional Role Switch)
Dedicated Role Workspace
      ↓
Operational Screens
```

A user is not a "User with an Admin Flag". A person at DeVoc may simultaneously be:
- A **Founder** reviewing company-wide project delivery and financial budgets.
- A **Mentor** guiding 4 engineering students in the Academy.
- A **Reviewer** evaluating weekly project submissions.
- A **Developer** contributing code to client software repositories.

---

## 2. Multi-Role Coexistence Without Forced Switching

Users with multiple active roles are never forced to repeatedly switch roles merely to monitor their daily responsibilities.

The **Unified Multi-Role Dashboard** aggregates overview summaries from each of the user's active roles on a single, consolidated landing screen:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Good morning, Sarah                                 Tuesday, Sep 15    │
│ Active Tenant: DeVoc Official                      All Active Roles    │
├────────────────────────────────────────────────────────────────────────┤
│ YOUR ACTIVE ROLES                                                      │
│                                                                        │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐ │
│ │ FOUNDER              │ │ MENTOR               │ │ DEVELOPER        │ │
│ │ 12 Active Projects   │ │ 4 Active Students    │ │ 3 Open Tasks     │ │
│ │ 32 Team Members      │ │ 2 Reviews Due Today  │ │ 1 Pending PR     │ │
│ │ [Open Workspace →]   │ │ [Open Workspace →]   │ │ [Open Workspace →]│
│ └──────────────────────┘ └──────────────────────┘ └──────────────────┘ │
│                                                                        │
│ ATTENTION & UPCOMING                                                   │
│ • [Review Due] Alex Morgan — Week 4 Milestone Submission (Due 17:00)   │
│ • [Timesheet] Week 37 Timesheet awaiting submission                    │
│                                                                        │
│ OPERATIONAL METRICS & ACTIVITY                                         │
│ [ Hours Logged: 38.5h ]  [ Velocity: 94% ]  [ Reviews Completed: 12 ] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Experience Layers: Three Levels of Depth

DeVoc OS defines three distinct visual depths:

```text
Level 1: Unified Multi-Role Dashboard
Level 2: Role Workspace (e.g. Mentor Workspace, Student Workspace)
Level 3: Operational Screen (e.g. Student Milestone Detail, Timesheet Review)
```

### Level 1: Unified Multi-Role Dashboard
- **Audience**: Anyone with one or more active roles.
- **Purpose**: At-a-glance situational awareness across all assigned responsibilities.
- **Content**: Role Overview Cards, critical attention list, cross-cutting contribution stats, and company updates.

### Level 2: Role Workspace
- **Trigger**: Selecting a specific role in the `RoleSwitcher` or clicking `[Open Workspace →]` on a role card.
- **Purpose**: Deep immersion in the workflows of that single role.
- **Content**: Role-focused navigation sidebar, role-specific metrics, dedicated pipelines, and filtered task queues.
- **Security Rule**: Switching to a role **never** elevates or alters permissions. It only focuses the workspace presentation.

### Level 3: Operational Screen
- **Purpose**: Focused task execution.
- **Examples**:
  - `ReviewEvaluationScreen`: Evaluating a student submission against criteria.
  - `TimesheetSubmissionScreen`: Entering hours and breaks for a work period.
  - `CandidateAssessmentScreen`: Submitting interview scorecard.
- **Properties**: Minimal surrounding chrome, high information density, clear primary call to action, and full auditability.

---

## 4. Separation of Role Perspective from Authorization

| Concern | Frontend Role Perspective | Backend Authorization (Capabilities) |
| :--- | :--- | :--- |
| **Source** | Selected in `RoleSwitcher` (`Founder`, `Mentor`, etc.) | Derived from JWT claims + Database `person_roles` + Org memberships |
| **Purpose** | Tunes navigation, active KPIs, and workflow focus | Validates whether actor can execute read/write mutations |
| **Spoofability** | Harmless UX state stored in client memory | Cryptographically verified and DB-validated on every request |
| **Example** | Switching to "Founder" view | Still cannot view Finance if backend user lacks `finance:admin` |

Switching roles in the UI adjusts which navigational menus and dashboards are visible. However, whenever an API request is dispatched, the backend independently verifies that the user possesses the required capability. If unauthorized, the API returns `403 Forbidden` or `404 Not Found`.

---

## 5. Context Resolution (Tenant & Operational Scope)

The user experience adapts to the selected organizational context:
- **Tenant Context**: Organization selected (e.g. `DeVoc Official` vs `DeVoc Academy`).
- **Operational Context**: Branch, Business Unit, Department, or Project filter.

Context filters restrict the data shown on screen (e.g. "Only show tasks for Project X"). Context filtering never confers unauthorized permissions.
