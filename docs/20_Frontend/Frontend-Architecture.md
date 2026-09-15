# DeVoc OS Frontend Architecture

## 1. Purpose & Guiding Principles

The DeVoc OS frontend is designed as the **Experience Layer** over the existing DeVoc OS M1–M15 backend. 

The backend remains the authoritative source of truth for:
- Identity, Authentication, and Multi-Tenant Scoping (M1)
- People, Employment, and Domain Roles (M2)
- Generic Assignments & Capacity (M3)
- Projects, Tasks, and Deliverables (M4)
- Work Logs, Outcomes, and Evidence (M5)
- Meetings, Agendas, and Action Items (M6)
- Academy Learning Journeys, Milestones, and Competencies (M7)
- Qualitative Performance Evaluations and Approvals (M8)
- Financial Accounts, Transactions, and Fee Schedules (M9)
- Audit Logs and Transactional Outbox Events (M10)
- Operational Analytics and Decision Support Snapshots (M11)
- Tenant Administration and Platform Configurations (M12)
- Recruitment Pipelines and Talent Acquisition (M13)
- Workforce Lifecycle, Onboarding, and Probation (M14)
- Attendance, Leave, Timesheets, and Workforce Time (M15)

The frontend **never recreates or duplicates backend business logic, permission rules, or transactional constraints**. Instead, it maps authoritative backend data into an intuitive, role-aware, context-sensitive operational environment.

---

## 2. High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     DeVoc OS Backend Engines (M1–M15)                   │
│                                                                         │
│  PostgreSQL / PGlite ──── Domain Services ──── REST Endpoints (/api/v1) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ JSON Envelopes ({ data, meta })
                                     │ Auth: Bearer JWT
                                     │ Tenancy: X-Organization-Id
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Centralized API Integration Layer                    │
│                                                                         │
│           Typed HTTP Client (api/client.ts) ── Error Normalization       │
│           Domain Modules: Auth, People, Org, Analytics, Time, Projects   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Server State Management                         │
│                                                                         │
│        TanStack Query v5 Cache ── Automatic Invalidation & Mutations    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Experience Resolution & Context                     │
│                                                                         │
│     User Identity ──► Active Roles ──► Capabilities ──► Context Filter  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Application Shell & Navigation                     │
│                                                                         │
│     TopBar (Tenant, Context, Cmd+K, RoleSwitcher, Theme, Profile)       │
│     Sidebar (Dynamic Navigation Registry filtered by Capability & Role) │
│     Breadcrumbs (Hierarchical navigation path)                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Presentation & Screens                          │
│                                                                         │
│     Unified Multi-Role Dashboard ── Role Overview Cards ── Metrics      │
│     Core UI Primitives ── Data Tables ── Status Badges ── States        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

The frontend is housed in `frontend/`, keeping the root backend modular monolith clean and stable.

```text
frontend/
├── package.json                   # Next.js 15, React 19, Tailwind, TanStack Query
├── tsconfig.json                  # Strict TypeScript configuration with @/* path alias
├── next.config.ts                 # Next.js App Router configuration
├── tailwind.config.ts             # DeVoc enterprise design system tokens
├── postcss.config.mjs             # PostCSS processing
├── vitest.config.ts               # Frontend unit & integration test runner
├── public/                        # Static assets and brand logos
└── src/
    ├── app/                       # Next.js App Router routes
    │   ├── layout.tsx             # Root HTML layout with font and providers
    │   ├── page.tsx               # Root redirect / landing logic
    │   ├── globals.css            # CSS variables for light & true dark themes
    │   ├── login/                 # Authentication screen
    │   │   └── page.tsx
    │   └── dashboard/             # Unified multi-role dashboard
    │       └── page.tsx
    ├── api/                       # Centralized API integration layer
    │   ├── client.ts              # Fetch client wrapping { data, meta }
    │   ├── auth.api.ts            # Login, logout, current user (/api/v1/auth)
    │   ├── people.api.ts          # People, employments, roles (/api/v1/people)
    │   ├── organization.api.ts    # Tenants, BUs, departments, teams
    │   ├── analytics.api.ts       # Metrics and snapshots (/api/v1/analytics)
    │   └── workforce-time.api.ts  # Attendance, timesheets, leave (M15)
    ├── auth/                      # Authentication & session context
    │   ├── auth.context.tsx       # AuthProvider storing tokens & current user
    │   ├── auth.types.ts          # UserIdentity, UserMembershipInfo
    │   └── use-auth.ts            # Hook for consuming authentication
    ├── permissions/               # Capability authorization UX
    │   ├── permissions.types.ts   # Canonical M1–M15 capabilities
    │   └── use-permissions.ts     # can(capability) hook for conditional rendering
    ├── roles/                     # Domain role resolution & switching
    │   ├── roles.types.ts         # Supported role categories and metadata
    │   ├── role-resolver.ts       # Maps backend PersonRoles to active roles
    │   └── role.context.tsx       # Active role perspective provider
    ├── navigation/                # Declarative navigation registry
    │   ├── navigation.registry.ts # Dynamic menu items with role/capability guards
    │   ├── navigation.types.ts    # NavigationItem, NavigationSection
    │   └── use-navigation.ts      # Hook returning filtered navigation tree
    ├── layouts/                   # Application shell layouts
    │   ├── app-shell.tsx          # Shell layout (desktop & mobile responsive)
    │   ├── sidebar.tsx            # Navigation sidebar with collapsed state
    │   ├── topbar.tsx             # Header with context, role switch, command bar
    │   ├── breadcrumbs.tsx        # Route breadcrumbs
    │   ├── role-switcher.tsx      # Multi-role perspective switcher
    │   ├── context-switcher.tsx   # Organization and structure switcher
    │   └── command-palette.tsx    # Accessible modal command palette (Cmd+K)
    ├── components/
    │   ├── ui/                    # Foundational UI primitives (Button, Input, Card...)
    │   ├── data/                  # Data components (DataTable, MetricCard...)
    │   └── devoc/                 # Specialized DeVoc patterns (RoleOverviewCard...)
    ├── features/
    │   └── dashboard/             # Composable dashboard sections
    │       ├── dashboard-header.tsx
    │       ├── role-overview-section.tsx
    │       ├── attention-section.tsx
    │       ├── metrics-section.tsx
    │       └── activity-section.tsx
    ├── hooks/                     # Utility hooks (use-theme, use-debounce...)
    └── lib/                       # Utility libraries (cn, query-client)
```

---

## 4. State Management Strategy

1. **Server State (TanStack Query v5)**:
   - All asynchronous data fetched from the backend is managed by TanStack Query.
   - Handles caching, deduplication, background re-fetching, optimistic updates, loading states, and error handling.
   - Mutation hooks trigger granular query cache invalidation.
2. **Client Authentication & Context State (React Context)**:
   - Auth Context: Current JWT token, user identity, and active organization membership.
   - Role Context: Currently active role perspective (e.g. `founder`, `mentor`, `developer`, or `all`).
   - Tenant Context: Active organization ID and selected branch/department filter.
   - Theme Context: `light` vs `dark` theme stored in `localStorage` with system preference detection.
3. **Transient UI State (Component State)**:
   - Dialog open/close, dropdown visibility, mobile sidebar toggle, command palette search term, and form inputs.

---

## 5. Security & Tenant Boundaries

- Every authenticated request sent by `api/client.ts` automatically attaches:
  - `Authorization: Bearer <accessToken>`
  - `X-Organization-Id: <currentOrganizationId>`
- Frontend permission checks (`can("workforce_time:approve")`) are strictly for user experience (e.g., hiding or disabling controls). They never function as security boundaries.
- Backend controllers and middleware execute mandatory authorization checks on every operation. If a frontend view displays a button the user is unauthorized to use, the backend rejects the call with HTTP `403 Forbidden` or `404 Not Found`.
