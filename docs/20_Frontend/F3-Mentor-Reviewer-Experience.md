# F3 — Mentor + Reviewer Experience Architecture

## 1. Objective & Role-Centric Overview

The F3 milestone delivers two specialized, production-grade workspaces on top of the DeVoc OS foundation (F1.2) and Learning Engine (F2):
1. **Mentor Workspace**: Relationship, guidance, and velocity-centric ("Who are my students? Where is each mentee in their journey? What needs my attention? Did the mentee act on my previous advice?").
2. **Reviewer Workspace**: Review context, evaluation, and progression-decision centric ("What exact stage is the candidate at? What was previously advised? What changed since then? What is the current evidence? What progression decision should be issued?").

Both workspaces operate strictly as the frontend experience layer over the existing, authoritative M1–M15 backend domains (primarily M7 Learning, M3 Assignments, M4 Projects/Tasks, M5 Work, M6 Meetings, M2 People, and M11 Analytics).

---

## 2. Route Architecture

### 2.1 Mentor Routes
- `/dashboard` — Unified dashboard dynamically mounting `MentorDashboardView` when active role is `mentor`.
- `/mentor/students` — Complete operational directory of assigned mentees with status filtering and search.
- `/mentor/students/[studentId]` — Comprehensive student detail workspace (journey progress, active deliverables, reviews, feedback, projects, meetings).
- `/mentor/progress` — Cohort-wide progression velocity, deliverable completion, and review cadence adherence.
- `/mentor/reviews` — Historical archive of reviews and sync sessions conducted with mentees.
- `/mentor/reviews/[reviewId]` — Detailed view of an individual review notes record.
- `/mentor/feedback` — Suggestion and follow-up ledger tracking advice resolution across review cycles.
- `/mentor/meetings` — Mentorship 1:1 sessions, milestone review calls, agendas, and decisions via M6 Meetings.
- `/mentor/assignments` — Official M3 Assignment records detailing capacity, target objects, and active responsibilities.

### 2.2 Reviewer Routes
- `/dashboard` — Unified dashboard dynamically mounting `ReviewerDashboardView` when active role is `reviewer`.
- `/reviewer/queue` & `/reviewer/reviews` — Prioritized operational review queue ordered by urgency, days since last evaluation, and pending deliverables.
- `/reviewer/reviews/[reviewId]` — Critical All-in-One Review Workspace assembling full contextual evaluation elements.
- `/reviewer/students` — Searchable directory of enrolled candidates available for milestone evaluations.
- `/reviewer/assessments` — Assessment submission monitoring and attempt history.
- `/reviewer/suggestions` & `/reviewer/feedback` — Cross-student suggestion continuity ledger preventing duplicate recommendations.
- `/reviewer/history` — Chronological archive of finalized evaluations with progression decision filtering (`advance`, `continue`, `improve`, `repeat`).

---

## 3. Critical Reviewer Workspace Architecture (Master Requirement)

A central architectural mandate of F3 is that reviewers must never have to jump between disconnected pages to perform an evaluation. `ReviewerWorkspaceView` (`/reviewer/reviews/[reviewId]`) orchestrates all contextual elements on a single screen:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Student & Program Context Header (StudentContextPanel)                    │
│    Student Identity, Enrolled Track, Progress %, Assigned Mentor, Status    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Authoritative Learning Journey (LearningJourneyProgress)                 │
│    Highlighting Current Active Milestone Stage                              │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 3. Left Column: Context & Evidence   │ 4. Right Column: Evaluation & Action │
│    a. Changes Since Previous Review  │    a. Progression Decision Radio     │
│       - Prior Review Advice Baseline │       (advance / continue / improve) │
│       - Previous Suggestions Status  │    b. Executive Summary              │
│       - M7 Review Changes Applied    │    c. Qualitative Observations       │
│    b. Current Work & Submissions     │    d. Actionable Suggestions Input   │
│       - Current Activity Objectives  │    e. Optional Roadmap Action        │
│       - Connected M4/M5 Project Work │       (complete_milestone / skip)    │
│       - Milestone Assessments        │    f. Submit Final Review (Mutation) │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 4. Shared Evaluation & Context Primitives

1. **`StudentContextPanel`** (`features/shared/student-context-panel.tsx`):
   - Reusable across Mentor, Reviewer, and future Academy Head / Founder workspaces.
   - Dual-layer disclosure: Immediate operational bar (program, current milestone, progress percentage, assigned mentor) + expandable details (embedded learning journey, prior review quote, open suggestions).
2. **`ProgressionDecisionBadge`** (`features/reviewer/components/progression-decision-badge.tsx`):
   - Dual-encoded badge (icon + label + restrained border) mapping M7 decisions (`advance`, `continue`, `improve`, `repeat`).
3. **`ChangesSinceReviewPanel`** (`features/reviewer/components/changes-since-review-panel.tsx`):
   - Tracks the progression link: Prior review advice -> student actions/evidence -> authoritative roadmap changes (`complete_milestone`, `add_activity`, `skip_milestone`).
4. **`ReviewForm`** (`features/reviewer/components/review-form.tsx`):
   - Form built with React Hook Form + Zod validation handling review creation, suggestion lists, and optional roadmap actions.

---

## 5. Security, Authorization & Tenant Isolation

- **Zero Client State Machines**: Learning milestones, review creation, review changes, and assignments are validated server-side.
- **Contextual Role Switching**: Role switching via `RoleContext` alters navigation and workspace layout without elevating permissions.
- **Strict Tenant Boundary**: All requests pass `X-Organization-Id` and tenant-scoped URL endpoints. Direct URL access to another tenant or non-assigned candidate is rejected with 403/404 by the backend.
