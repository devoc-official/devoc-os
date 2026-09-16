# DeVoc OS — F4 Employee, Developer & Project Manager Experience Architecture

## 1. Executive Summary

Milestone **F4** delivers the **Employee**, **Developer**, and **Project Manager** role experiences for DeVoc OS. Built on top of the locked backend (M1–M15) and frontend foundation (F1.2), this milestone provides three distinct, high-density, operational workspaces operating within the unified multi-tenant Business Operating System.

In accordance with the DeVoc OS Master Architecture, the frontend acts strictly as an **Experience Layer**, while the backend remains the sole domain source of truth:
```text
Person
  ↓
Role Contexts (Employee | Developer | Project Manager)
  ↓
Assignments (M3)
  ↓
Projects & Tasks (M4)
  ↓
Work (M5)
  ↓
Meetings (M6)
  ↓
Workforce Time & Leave (M15)
  ↓
Evaluations (M8)
  ↓
Analytics (M11)
```

---

## 2. Shared Core Architecture & Role Switching

### 2.1 Multi-Role Model
A single authenticated person in DeVoc OS may hold multiple concurrent roles (e.g., an individual who is an Employee, a Core Developer, and a Project Manager on specific deliverables). 
- **Unified Dashboard (`/dashboard`)**: Detects active roles from the backend and renders an aggregated summary covering personal contributions, sprint backlogs, workforce time status, and managed project health.
- **Context Banner & Role Switching**: The top navigation bar enables instant persona switching (`all` -> `employee` -> `developer` -> `project_manager`). Switching changes the active navigation tree, action bars, and operational views. It **never modifies or bypasses backend authorization**.

### 2.2 Design Aesthetics & Anti-AI-Slop Standard
- Strict adherence to the DeVoc OS design tokens (calm enterprise palette, neutral zinc surfaces, 4px grid spacing, Inter typography).
- Zero decorative gradients, zero glassmorphism, zero floating cards, and zero emoji-based iconography.
- Dense, keyboard-navigable operational tables with dual-encoded status badges (icon + semantic text) complying with **WCAG 2.2 AA**.

---

## 3. The Three Role Experiences

### 3.1 Employee Experience: "What am I responsible for and what do I need to do today?"
The Employee experience prioritizes daily personal accountability, attendance, contributions, and organizational lifecycle:

| View | Route | Primary Capabilities | Backend Source of Truth |
| :--- | :--- | :--- | :--- |
| **Employee Dashboard** | `/dashboard` | Daily work logs, assigned tasks, today's clock-in status, leave balances, upcoming reviews | M4, M5, M8, M15 |
| **My Work** | `/work` | Personal contribution ledger, draft creation, submit for approval, filter by category | M5 Work Engine |
| **My Tasks** | `/tasks` | High-density task table, status transitions (`todo` -> `in_progress` -> `in_review` -> `done`), dependency inspection | M4 Projects & Tasks |
| **Projects** | `/projects` | Directory of authorized projects where the employee holds active assignment context | M3 Assignments, M4 Projects |
| **Meetings** | `/meetings` | Project & BU syncs, structured agendas, decision notes, linked action-item tasks | M6 Meetings Engine |
| **Attendance** | `/workforce/attendance` | One-click Clock In / Clock Out, daily duration counter, historical session audit | M15 Workforce Time |
| **Timesheets** | `/workforce/timesheets` | Weekly timesheet generation, draft review, submission for managerial approval | M15 Timesheets |
| **Leave Management** | `/workforce/leave` | Leave balance ledger (annual, sick, unpaid), date-range request modal, approval tracking | M15 Leave Engine |
| **Evaluations** | `/evaluations` | Historical qualitative performance appraisals, evaluator feedback, recommendations | M8 Evaluation Engine |

### 3.2 Developer Experience: "What am I building, what is assigned to me, what work have I completed, and what evidence demonstrates it?"
The Developer workspace is engineered as a high-velocity command center for technical deliverables:

| View | Route | Primary Capabilities | Backend Source of Truth |
| :--- | :--- | :--- | :--- |
| **Developer Dashboard** | `/developer` | Engineering Command Center: active sprint tasks, critical blockers, projects, logged hours | M4 Tasks, M5 Work |
| **Assignments** | `/developer/assignments` | Official assignment ledger: project target, technical role context, capacity (hrs/week), start/end dates | M3 Assignment Engine |
| **Evidence Ledger** | `/developer/evidence` | Verified deliverable artifacts: Pull Request URLs, Git commits, architecture RFC links linked to work records | M5 Work & Evidence |

### 3.3 Project Manager Experience: "What is happening across my projects, who is responsible, what is blocked, and what requires intervention?"
The Project Manager cockpit delivers comprehensive operational governance across project portfolios:

| View | Route | Primary Capabilities | Backend Source of Truth |
| :--- | :--- | :--- | :--- |
| **PM Portfolio** | `/pm/projects` | Authorized managed project directory, delivery velocity, sprint completion percentages, blocker alerts | M4 Projects |
| **Project Cockpit** | `/pm/projects/[projectId]` | Tabbed deep cockpit: Sprint Deliverables, Team & Responsibility, Work Contributions, Risks & Blockers | M3, M4, M5 |
| **Task Governance** | `/pm/tasks` | Cross-project task backlog, task creation dialog, priority scheduling, dependency resolution | M4 Tasks |
| **Team Responsibility** | `/pm/team` | Team capacity matrix synthesized from People, Projects, and M3 Assignments (`40h/wk`, active tasks) | M2 People, M3 Assignments |
| **PM Work Reviews** | `/pm/work` | Team contribution audit, managerial approval / rejection of submitted work records | M5 Work Engine |
| **Delivery Progress** | `/pm/progress` | Quantitative milestone completion metrics, task distribution by status, velocity analysis | M4, M11 Analytics |
| **Project Risks** | `/pm/risks` | Section 38 Authoritative Deferred Notice & active task blockers | M4 Tasks |

---

## 4. Section 38 Architecture Compliance: Risk Engine Status

Section 38 of the DeVoc OS Master Rules and F4 Execution Specification establishes:
> *"F4 may implement a frontend experience for existing risk data only if a risk domain/API already exists. If no Risk Engine exists, DO NOT create a new Risk Engine during F4. Document the gap, show no fabricated risk data, and defer Risk Engine to a future milestone."*

**Implementation Compliance**:
1. Zero client-side risk data models or synthetic mock scores were created.
2. In `/pm/risks` and within the deep project cockpit tab, an authoritative **Deferred Capability Notice** is rendered.
3. Live operational delivery risks are exposed strictly via verified blocked tasks (`status: 'blocked'`) queryable from the M4 Projects & Tasks Engine.

---

## 5. Security, Tenancy & Permissions

- **Tenant Boundary Enforcement**: Every client request transmits `X-Organization-Id`. All queries and mutations are strictly filtered by tenant scope server-side.
- **Contextual Authorization**:
  - Regular employees can view and submit their own work, attendance, and leave records, but cannot approve timesheets or alter organizational project assignments.
  - Project Managers can manage tasks and review work within projects where they hold assignment authority, but cannot bypass organization administration or finance boundaries.
- **Server-Authoritative State Transitions**:
  - Work status transitions (`draft` -> `submitted` -> `approved` / `rejected`) are verified atomically by backend domain services.
  - Timesheet lifecycle (`draft` -> `submitted` -> `approved`) prevents client mutation once approved.

---

## 6. Verification & Test Matrix

The F4 frontend implementation is fully validated across 25 Vitest + React Testing Library suites (87 passing tests):
- `f4-multi-role-switching.test.tsx`: Validates seamless persona switching (`all`, `employee`, `developer`, `pm`) and aggregated dashboard rendering.
- `employee-workspace.test.tsx`: Validates Employee dashboard, work contribution logging, task transitions, attendance clock-in, timesheet submission, and leave balance requests.
- `developer-workspace.test.tsx`: Validates Developer command center, assignment context verification, and evidence ledger links.
- `pm-workspace.test.tsx`: Validates PM project portfolio, deep cockpit progressive disclosure, task dependency governance, team capacity matrix, and Section 38 deferred risk compliance.
- `task-dependencies.test.tsx`: Validates visual blocker indicators, dependency addition, and cycle prevention.
