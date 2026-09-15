# DeVoc OS Navigation Architecture

## 1. Declarative Navigation Registry

Rather than hardcoding separate, disconnected sidebars across screens, DeVoc OS uses a **Centralized Navigation Registry**.

Each navigational entry is defined declaratively:

```typescript
export interface NavigationItem {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
  badge?: string | number;
  requiredCapability?: Capability;
  allowedRoles?: RoleCategory[];
  contextScope?: 'organization' | 'project' | 'team';
  children?: NavigationItem[];
}
```

---

## 2. Dynamic Navigation Resolution Pipeline

Navigation items are resolved at runtime through a strict pipeline:

```text
Static Navigation Registry
           ↓
Filter 1: Active Role Perspective
  (Shows items matching current role workspace or global items)
           ↓
Filter 2: Backend Capability Check
  (Removes items where usePermissions().can(requiredCapability) === false)
           ↓
Filter 3: Context Filter
  (Removes items outside the currently active organization or scope)
           ↓
Rendered Sidebar & Command Palette Tree
```

---

## 3. Foundational Role Navigation Definitions

F1.2 establishes the foundational navigation definitions for all key roles. These definitions outline future role workspaces (to be fully realized in F2+):

### 3.1 Student Workspace
- **Home**: Student landing overview
- **My Learning**: Active learning journey & syllabus
- **My Roadmap**: Custom milestone progression
- **Activities**: Self-paced exercises and lessons
- **Assessments**: Knowledge checks & coding tests
- **My Mentor**: Mentor syncs, notes, and guidance
- **Reviews**: Scheduled weekly milestone reviews
- **Feedback**: Reviewer evaluations & suggestion history
- **My Projects**: Student portfolio projects
- **Progress & Competencies**: Acquired competencies radar
- **Profile**: Student information

### 3.2 Mentor Workspace
- **Dashboard**: Mentorship queue & mentee health overview
- **My Students**: Active student roster & status
- **Learning Progress**: Milestone tracking across mentees
- **Reviews**: Upcoming reviews & past approval logs
- **Feedback**: Qualitative notes and recommendations
- **Meetings**: Scheduled mentor-student syncs
- **Assignments**: Student capacity and mentor load

### 3.3 Reviewer Workspace
- **Dashboard**: Evaluation queue and pending submissions
- **Review Queue**: Submissions awaiting assessment
- **Students**: Student history and past verdicts
- **Reviews**: Rubric-based qualitative scoring
- **Assessments**: Coding assessments & project code reviews
- **Feedback & Suggestions**: Actionable improvement suggestions
- **Review History**: Historical append-only decisions

### 3.4 Employee / Developer Workspace
- **Home**: Daily work overview
- **My Work**: Work log submissions and outcomes
- **My Tasks**: Sprint tasks and assignments
- **Projects**: Active assigned projects
- **Meetings**: Operational meetings & action items
- **Attendance**: Daily check-in / check-out presence
- **Timesheets**: Weekly timesheet submission & approval status
- **Leave**: Leave requests & available balance
- **Evaluations**: Periodic performance reviews
- **Profile**: Employment & skill records

### 3.5 Founder Workspace
- **Dashboard**: Executive overview & company vitals
- **Organization**: Branches, Business Units, Teams
- **People**: Directory, roles, and headcount
- **Academy**: Student enrollment & completion rates
- **Projects**: Portfolio status across all BUs
- **Work**: Work logs & strategy deliverables
- **Learning**: Curriculum and program performance
- **Evaluations**: Leadership reviews
- **Workforce**: Onboarding, probation, promotions
- **Recruitment**: Talent acquisition pipelines
- **Finance**: Budgets, cashflow, fee accounts
- **Meetings**: Strategic and cross-functional meetings
- **Analytics**: Company-wide KPI decisions
- **Administration**: Tenant configuration & security

### 3.6 Academy Head Workspace
- **Dashboard**: Academy operational health & enrollment
- **Students**: Student cohort management
- **Learning Programs**: Tracks, milestones, syllabi
- **Learning Progress**: Cohort velocity & roadblocks
- **Mentors**: Mentor allocation and mentee ratios
- **Review Management**: Reviewer schedule & standards
- **Assessments**: Assessment benchmark results
- **Projects**: Student capstone evaluations
- **Placement**: Career placement & hiring readiness
- **Academy Analytics**: Placement rate, satisfaction, completion

### 3.7 Project Manager Workspace
- **Dashboard**: Project health, milestones, and burnup
- **Projects**: Managed projects & specifications
- **Tasks**: Backlog, sprint boards, dependency trees
- **Team**: Project team composition & roles
- **Assignments**: Allocation & member capacity
- **Work**: Member work logs on project
- **Meetings**: Sprint standups & retrospectives
- **Risks**: Blockers and mitigation plans
- **Progress**: Milestone completion verification

---

## 4. Route Hierarchy & URL Conventions

```text
/                                   -> Landing & Root Auth Redirect
/login                              -> Authentication
/dashboard                          -> Unified Multi-Role Dashboard
/workspaces/:role                   -> Dedicated Role Workspace (F2+)
  /workspaces/student/learning
  /workspaces/mentor/students
  /workspaces/developer/tasks
  /workspaces/founder/organization
/settings/profile                   -> User Profile
/settings/organization              -> Organization Configuration
```

---

## 5. Command Palette Integration (`Cmd + K`)

The navigation registry feeds directly into the accessible Command Palette:
- Pressing `Cmd + K` (Mac) or `Ctrl + K` (Windows/Linux) opens a modal search.
- Users can instantly search and jump to any route permitted by their capabilities.
- Command Palette also lists quick actions: "Check in for today", "Request leave", "Create work log", "Switch role".
