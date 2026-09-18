# DeVoc OS — Internal Pilot Plan (v1 Pilot Candidate)

## 1. Executive Purpose & Scope

The **DeVoc OS Internal Pilot** validates the enterprise operating system under realistic day-to-day organizational conditions. Having completed foundational engineering across all 15 backend domain engines (M1–M15) and frontend persona portals (F1.2, F2–F6), this operational validation ensures that cross-module workflows execute seamlessly, tenant boundaries remain hermetically sealed, state machine transitions fail safely, and performance meets operational requirements.

### Core Objectives
1. **Validate Realistic User Workflows**: End-to-end execution of operational tasks across education, project delivery, internal tools, workforce management, and finance.
2. **Cross-Module Backbone Verification**: Seamless data and workflow propagation across the core backbone:
   $$\text{Person} \longrightarrow \text{Role} \longrightarrow \text{Assignment} \longrightarrow \text{Work} \longrightarrow \text{Outcome} \longrightarrow \text{Evaluation} \longrightarrow \text{Finance} \longrightarrow \text{Analytics}$$
3. **Role-Based Experience & Switching**: Validation of multi-role user personas switching contexts between Founder, Developer, and Project Manager without cross-contamination or authorization bypass.
4. **Hermetic Tenant Isolation**: Zero-leakage verification between DeVoc Pilot Organization and an external competitor tenant.
5. **State Transition Integrity**: Verification that illegal state jumps (skipping approval, illegal project transitions, duplicate hires) are rejected deterministically with standard error envelopes.
6. **Outbox & Audit Completeness**: Guarantee that every domain mutation generates an immutable audit record and a transactional outbox domain event.

---

## 2. Pilot Environment & Tenancy Architecture

The pilot operates on a dual-tenant topology to rigorously evaluate multi-tenancy and data isolation.

| Environment Component | Specification |
| :--- | :--- |
| **Primary Organization** | DeVoc Pilot Organization (`code: devoc-pilot`, ID: dynamically assigned UUID) |
| **Secondary Organization** | External Rival Organization (`code: rival-tenant`, ID: dynamically assigned UUID) |
| **Operating Branches** | Kerala Branch (`BR-KER`, Primary) & UAE Branch (`BR-UAE`, International Expansion) |
| **Active Business Units** | Academy (`BU-ACAD`), IT Solutions (`BU-SOL`), DeVoc Labs (`BU-LABS`) |
| **Operating Departments** | Engineering, Academy Operations, Management, Sales & Growth, Finance |
| **Functional Teams** | Core Platform Team, Academy Mentorship Team, Client Delivery Team |
| **Database Substrate** | PostgreSQL with strict `organization_id` foreign keys & UUIDv4 primary keys |
| **Tenant Middleware** | Header (`X-Organization-Id`) + JWT tenant resolution with zero blind trust |

---

## 3. Pilot Personas & Access Matrix

The pilot simulates 8 distinct operational roles and 1 multi-role executive persona.

| Persona ID | Name | Role(s) | Business Unit | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **P-FOUNDER** | Aswin Founder | Founder, PM, Developer *(Multi-Role)* | Labs / All | Executive oversight, strategic planning, cross-BU review, core architecture |
| **P-ACAD-HEAD**| Dr. Radhika Nair | Academy Head | Academy | Curriculum oversight, milestone approval, student progression, batch management |
| **P-MENTOR** | Maya Mentor | Mentor | Academy | Weekly reviews, code evaluation, 1-on-1 feedback, milestone guidance |
| **P-STUDENT** | Sam Student | Student | Academy | Milestone submissions, student project execution, self-paced learning, payments |
| **P-REVIEWER**| Alex Reviewer | Reviewer | Academy | Independent milestone assessments, project defense grading, quality assurance |
| **P-PM** | Priya PM | Project Manager | IT Solutions | Project scheduling, sprint tasks, capacity tracking, client milestone delivery |
| **P-DEV** | Dev Developer | Developer / Employee | IT Solutions | Task delivery, work logging with GitHub PR evidence, attendance, timesheets |
| **P-ADMIN** | Admin Operations| Org Admin / Operations | Operations | System settings, workforce onboarding, leave policies, audit trail queries |
| **P-CANDIDATE**| Vikram Applicant | Candidate $\rightarrow$ Hiree | Engineering | External recruitment, application, offer acceptance, employee onboarding |

---

## 4. Operational Scenario Test Matrix

The pilot executes 20+ end-to-end integration scenarios mapping across all domain modules:

| Scenario ID | Domain Engine(s) | Description | Expected Operational Behavior |
| :--- | :--- | :--- | :--- |
| **SC-01** | M1 Organization | Branch, BU, Dept, Team creation | Hierarchical structure formed with valid tenant context |
| **SC-02** | M2 People | Person, role, and multi-role assignments | Multi-role persona has Founder + PM + Developer active roles |
| **SC-03** | M3 Assignments | Generic assignment creation (Project, Student) | Target types resolved dynamically via registry; capacity tracked |
| **SC-04** | M4 Projects/Tasks | Internal Tool & Student projects + Epics/Tasks | Project key scoping, hierarchy, task status transitions |
| **SC-05** | M5 Work | Work logging with PR evidence & durations | Draft $\rightarrow$ Submitted $\rightarrow$ Approved with time allocation |
| **SC-06** | M6 Outcomes | Outcome deliverable creation & linking | Deliverables linked to work logs, contribution scores updated |
| **SC-07** | M7 Learning | Program, enrollment, milestones, weekly reviews | Self-learning progression, milestone activation on review |
| **SC-08** | M8 Evaluation | Quantitative & qualitative performance review | Multi-criteria scoring, qualitative notes, immutable storage |
| **SC-09** | M9 Finance | Student tuition & client milestones, EMI, payments| Inflow posted, allocations to obligations, balance computed |
| **SC-10** | M10 Meetings | Architecture sync, participants, agenda, notes | Notes markdown stored, decision recorded, action linked to task |
| **SC-11** | M11 Analytics | Computation of revenue & completion KPIs | Metric computed on operational data without altering source |
| **SC-12** | M12 Administration| Org settings, feature overrides, audit logs | Tenant-scoped configuration updates, full audit queryability |
| **SC-13** | M13 Recruitment | Position $\rightarrow$ Candidate $\rightarrow$ Offer $\rightarrow$ Hire | Explicit `/hire` boundary enforced; collision prevention |
| **SC-14** | M14 Workforce | Onboarding plan & job title promotion | Job title updated independently of system permissions |
| **SC-15** | M15 Time & Leave | Attendance check-in/out, timesheets, leave | Session duration logged, timesheet approval, balance deduction |
| **SC-16** | Cross-Tenant | Org B attempts access to Org A resources | Returns 403 Forbidden or 404 Not Found; zero leakage |
| **SC-17** | State Machines | Invalid status strings & duplicate approvals | Safe rejection with 400/422 status and error envelope |
| **SC-18** | Event Outbox | Transactional event staging & audit persistence | Outbox records staged atomically with database transactions |

---

## 5. Verification & Acceptance Criteria

1. **Zero Data Leakage**: Org B cannot read or write any record belonging to Org A across Projects, Tasks, Work, Finance, Learning, or Audit.
2. **Deterministic Error Handling**: All rejected operations return standard JSON error envelopes (`{ error: { code, message, statusCode, requestId } }`).
3. **Multi-Role Security**: Personas switching roles retain strict least-privilege security boundaries based on the active role context.
4. **Historical Record Immutability**: Evaluations, audit logs, and financial allocations are append-only; historical data is never silently mutated.
5. **No Speculative Schema Alterations**: The pilot operates exclusively against the finalized M1–M15 database schema and production migrations.
