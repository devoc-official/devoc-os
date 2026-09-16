# DeVoc OS — F5 Founder & Academy Head Experience Architecture

## 1. Executive Summary

Milestone **F5** delivers the **Founder Executive Suite** and **Academy Head Operations** for DeVoc OS. Built on top of the locked backend (M1–M15) and frontend foundations (F1.2 Foundation, F2 Student, F3 Mentor/Reviewer, F4 Employee/Developer/PM), this milestone provides comprehensive operational clarity for top-level leadership and academy management.

In accordance with the DeVoc OS Master Architecture, the frontend functions strictly as an **Experience Layer**, while the backend remains the sole domain source of truth:
```text
Organization (M1)
  ↓
People & Employments (M2)
  ↓
Assignments (M3)
  ↓
Projects & Tasks (M4)
  ↓
Work (M5) & Meetings (M6)
  ↓
Learning & Reviews (M7)
  ↓
Evaluations (M8)
  ↓
Finance & Economics (M9)
  ↓
Platform Administration & Audit (M10, M12)
  ↓
Workforce & Recruitment (M13, M14, M15)
  ↓
Analytics (M11)
```

---

## 2. Multi-Role Context & Navigation Switching

A person with Founder or Academy Head responsibilities may also hold developer, mentor, reviewer, or project manager assignments.
- **Unified Dashboard (`/dashboard`)**: Detects active roles and renders `FounderDashboardView` for the `founder` role or `AcademyHeadDashboardView` for `academy_head`.
- **Context Banner & Role Switching**: The top navigation bar supports instant switching between `all`, `founder`, `academy_head`, `employee`, `developer`, `project_manager`, `mentor`, and `reviewer`. Switching updates the navigation tree and view rendering without client-side permission forgery.
- **Universal Design Tokens**: Adherence to zinc surface tokens, 4px grid spacing, dual-encoded status badges (icon + semantic text), and WCAG 2.2 AA accessibility standards.

---

## 3. Founder Executive Suite

The Founder experience equips executive leadership with high-density command and governance across every business unit:

| Workspace | Route | Primary Capabilities | Backend Source of Truth |
| :--- | :--- | :--- | :--- |
| **Executive Command Center** | `/dashboard` | Executive KPIs (active headcount, BUs, projects, contribution hours, academy enrollments, open requisitions, revenue inflow, receivables), prioritized attention signals | M1, M2, M4, M5, M7, M9, M13, M15 |
| **Organizational Architecture** | `/organization` | Multi-tenant organization details, physical branches, configurable Business Units, departments, and teams | M1 Organization Engine |
| **People & Talent Directory** | `/people` | Cross-role talent registry, employment relationships, active BU assignments, contribution metrics | M2 People, M3 Assignments |
| **Academy Operations & Economics** | `/academy` | Educational cohort status, tuition revenue, fee obligations, collection rate, mentor coverage | M7 Learning, M9 Finance |
| **Portfolio Projects & Deliverables** | `/projects` | Project delivery lifecycle, task completion velocity, blocker alerts, multi-BU ownership | M4 Projects & Tasks |
| **Enterprise Work Stream** | `/work` | Cross-company contribution stream, duration analytics, category distribution, verification audit | M5 Work Engine |
| **Workforce & Capacity Intelligence** | `/workforce` | Person-level capacity utilization, weekly load monitoring, overload detection (>40h/wk), timesheet audit | M3 Assignments, M15 Workforce Time |
| **Talent Acquisition & Recruitment** | `/recruitment` | Open requisitions, candidate pipeline distribution, application review status | M13 Recruitment Engine |
| **Financial Treasury & Obligations** | `/finance` | Posted cash inflow/outflow, fee & vendor obligations, receivables aging, operational budgets | M9 Finance Engine |
| **Strategic Meetings & Governance** | `/meetings` | Cross-BU syncs, executive agendas, structured minutes, linked action-item task tracking | M6 Meetings Engine |
| **Executive Intelligence & Analytics** | `/analytics` | Real-time metric computations (hours, completion rates, contribution score), metric catalog, reports | M11 Analytics Engine |
| **Platform Administration & Security** | `/administration` | Tenant profile, active feature configuration, team member provisioning, immutable audit trail | M10 Audit, M12 Platform Admin |

---

## 4. Academy Head Operations

The Academy Head experience provides operational governance over student cohorts, curriculum progress, mentor allocations, reviews, and completion standards:

| Workspace | Route | Primary Capabilities | Backend Source of Truth |
| :--- | :--- | :--- | :--- |
| **Academy Head Command Center** | `/dashboard` | Cohort health KPIs (active students, programs, pending reviews, upcoming assessments, verified graduates), student health alerts | M7 Learning Engine |
| **Student Cohort Directory** | `/students` | Comprehensive student ledger with reusable `StudentContextPanel` (current milestone, mentor, activity history, assessment status) | M7 Learning Engine |
| **Curriculum & Programs** | `/learning/programs` | Active training programs, milestone structures, required competency requirements | M7 Learning Engine |
| **Roadmap & Progress Velocity** | `/learning/progress` | Milestone completion rates, repetition tracking, student pace distribution, progression flags | M7 Learning Engine |
| **Mentor Allocation & Cadence** | `/mentors` | Active mentor assignments, mentee ratios, cadence tracking, mentor reassignment | M3 Assignments, M7 Learning |
| **Quality & Review Operations** | `/reviews` | Comprehensive review log, qualitative mentor feedback, suggestions, reviewer assessment results | M7 Learning Reviews |
| **Assessment & Certification** | `/assessments` | Milestone assessments, passing scores, pending assessment submissions | M7 Learning Engine |
| **Academy Capstone Projects** | `/learning/projects` | Student portfolio and capstone projects, milestone project submissions | M4 Projects, M7 Learning |
| **Career & Placement Intelligence** | `/placement` | Section 26 Authoritative Deferred Capability Notice, verified course graduates (`status === 'completed'`) | M7 Learning Engine |
| **Academy Educational Analytics** | `/analytics` | Educational velocity metrics, milestone completion, satisfaction, retention | M11 Analytics Engine |

---

## 5. Architectural Compliance & Integrity

### 5.1 Section 26 Compliance (Career & Placement)
- The Career & Placement workspace (`/placement`) renders an authoritative **Deferred Capability Notice** stating that specialized placement CRM tracking and recruiter matchmaking will be integrated in future phases.
- Surfaces solely verified course graduates (`enrollment.status === 'completed'`) as placement-eligible candidates directly from the M7 Learning Engine.
- **Zero synthetic placement records or fabricated hire rates** are introduced.

### 5.2 Section 38 Compliance (Project Blockers & Risk)
- Surfaces genuine project blockers (`task.status === 'blocked'`) directly from M4 Projects & Tasks.
- Exposes concrete dependency blockers without inventing synthetic risk scores or unvalidated calculations.

### 5.3 Single Source of Truth
- All mutations and data resolutions rely on backend APIs (`/api/v1/...`).
- No mock fallbacks, local storage hacks, or client-side business logic bypasses exist.
