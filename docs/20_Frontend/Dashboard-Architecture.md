# DeVoc OS Dashboard Architecture

## 1. Objective & Philosophy

The DeVoc OS Dashboard is **not a single rigid dashboard**, nor is it a random collection of 6 KPI cards and 2 decorative charts. 

Instead, it is a **Composable Operational Hub** engineered around:
1. **Multi-Role Aggregation**: Presenting high-value summaries from all of the user's active roles without forcing role switching.
2. **Actionable Priority**: Highlighting things requiring immediate attention (deadlines, pending reviews, timesheet submissions).
3. **Real Operational Signals**: Powered by authentic M1–M15 domain records and M11 analytics snapshots, never simulated or fabricated metrics.
4. **Resilience**: Comprehensive handling of loading states, empty states, and partial failure states.

---

## 2. Dashboard Component Hierarchy

```text
DashboardPage
  ├── DashboardHeader
  │     ├── Greeting & User Name
  │     ├── Active Organization Badge
  │     └── Current Operational Date
  │
  ├── RoleOverviewSection
  │     ├── Section Title ("Your Active Roles")
  │     └── RoleOverviewCard Grid
  │           ├── FounderCard (Projects, Headcount, Active BUs)
  │           ├── MentorCard (Assigned Students, Reviews Due, Syncs)
  │           ├── ReviewerCard (Review Queue, Suggestions, Pending)
  │           ├── DeveloperCard (Open Tasks, Current Work, Timesheet)
  │           └── StudentCard (Active Journey, Current Milestone, Next Review)
  │
  ├── AttentionSection ("Needs Attention")
  │     ├── AttentionItem (Urgent Review due today)
  │     ├── AttentionItem (Timesheet pending submission)
  │     └── AttentionItem (Scheduled 1-on-1 meeting)
  │
  ├── MetricsSection ("Key Metrics")
  │     ├── MetricCard (Work Hours Logged this Week)
  │     ├── MetricCard (Tasks Completed this Sprint)
  │     └── MetricCard (Operational Velocity / Contribution)
  │
  └── ActivitySection ("Recent Operational Activity")
        └── ActivityFeed (Latest Audit Logs & Domain Events)
```

---

## 3. Role Overview Card Architecture

Each `RoleOverviewCard` provides an executive glance into a specific active role:

```typescript
export interface RoleOverviewCardProps {
  role: RoleCategory;
  title: string;
  subtitle: string;
  badgeText?: string;
  metrics: Array<{ label: string; value: string | number }>;
  attentionCount?: number;
  onOpenWorkspace: (role: RoleCategory) => void;
}
```

- Clicking `[Open Workspace →]` switches the user's active perspective to that role's full operational workspace.
- The card displays only genuine metrics pulled from domain services (e.g. `M7 Learning` for students, `M8 Evaluation` for reviewers, `M15 Workforce Time` for employees).

---

## 4. State Handling Protocol

### 4.1 Loading State
- Uses **Skeleton Placeholders** mimicking the exact card geometry and typography rather than a generic centered spinning loader.
- Prevents layout shift (CLS) during server state resolution.

### 4.2 Empty State
- When a user has no active assignments or pending tasks in a role:
  - Explains what is missing: *"No active students assigned for mentorship."*
  - Contextual guidance: *"Students will appear here once allocated by the Academy Head."*
  - Action button: *"View Academy Directory"* (if authorized).

### 4.3 Partial Data & Error State
- If one data section fails to load (e.g. M11 Analytics service timeout), the rest of the dashboard remains fully interactive.
- The failed section renders an `InlineSectionError` with a "Retry" button rather than crashing the entire dashboard.
