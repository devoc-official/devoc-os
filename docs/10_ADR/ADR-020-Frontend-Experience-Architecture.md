# ADR-020: Frontend Experience Architecture & Role-Centric Foundation

## Status

**Accepted**

---

## Context

DeVoc OS is an enterprise Business Operating System with 15 completed, verified backend engines (M1 through M15). To enable productive operational use by students, mentors, reviewers, engineers, founders, and administrators, a frontend architecture is required.

Previous software architectures traditionally organize frontends around backend modules (e.g. "People Screen", "Finance Screen", "Projects Screen"). However, at DeVoc, users engage with the system through distinct organizational responsibilities:
- A single person frequently holds multiple active roles simultaneously (e.g. Founder + Mentor, Developer + Reviewer).
- Forcing users into isolated role silos or forcing constant role switching creates operational friction.
- Conversely, granting client-side authorization based on role selection would introduce fatal security vulnerabilities.
- Furthermore, modern AI-assisted frontend development frequently suffers from "AI Slop" — excessive rainbow gradients, glassmorphism, decorative blobs, emoji icons, and generic "KPI card" clutter that detracts from serious enterprise workflows.

---

## Decision

We establish the **DeVoc OS Frontend Foundation (F1.2)** based on the following architectural decisions:

### 1. Frontend as Pure Experience Layer; Backend as Authoritative Source of Truth
The frontend does not duplicate backend validation, database state machines, or permission logic. It consumes REST V1 endpoints under `/api/v1/` using a centralized HTTP client.

### 2. Role-Centric Experience Architecture
The frontend organizes workflows around **Responsibilities (Roles)** rather than backend database tables. The primary flow is:
$$\text{Identity} \longrightarrow \text{Active Roles} \longrightarrow \text{Backend Capabilities} \longrightarrow \text{Context} \longrightarrow \text{Experience}$$

### 3. Unified Multi-Role Dashboard with Perspective Switching
- The landing dashboard consolidates high-level status across all of the user's active roles (`RoleOverviewCard`).
- The `RoleSwitcher` allows users to enter a dedicated role workspace when performing deep operational tasks in that role.
- **Strict Invariant**: Switching roles alters only the frontend UI perspective and visible menus. It **never** alters or bypasses backend authorization. All mutations are validated against the backend capability model.

### 4. Technology Stack
- **Framework**: Next.js 15 (App Router) located in `frontend/`.
- **Core**: React 19, TypeScript 5.
- **Styling**: Tailwind CSS configured with custom DeVoc enterprise tokens.
- **Server State**: TanStack Query v5 for caching, invalidation, and deduplication.
- **Component Primitives**: Headless accessible primitives (Radix UI) and Lucide React icons.
- **Testing**: Vitest, React Testing Library, and jsdom.

### 5. DeVoc Enterprise Design System & Anti-AI-Slop Invariants
The visual character is defined as **Premium enterprise software + calm productivity system + modern education platform**:
- Solid neutral surfaces (`#F8F9FA` light, `#111315` dark), restrained borders (`1px`), and structured typography (Inter with tabular numbers for metrics).
- Strict prohibition of glassmorphism, floating blobs, rainbow gradients, emoji interface icons, and excessive rounded cards.
- Restrained 4px-based spacing grid and enterprise radii (4px, 6px, 8px, 10px, 12px max).

### 6. Dynamic Declarative Navigation Registry
Navigation is resolved dynamically based on `Active Role + User Capabilities + Context Scope`, feeding both the collapsible `Sidebar` and the accessible `CommandPalette` (`Cmd + K`).

---

## Consequences

### Positive
- **Future-Proof**: F2 through F6 role workspaces can be implemented incrementally without re-architecting the application shell, navigation, or design system.
- **Security**: Strict separation between UI role perspective and backend authorization prevents privilege escalation.
- **User Efficiency**: Multi-role users gain immediate situational awareness on the unified dashboard without tedious account hopping.
- **Accessibility & Quality**: Full WCAG 2.2 AA compliance and elimination of AI visual slop ensures an enduring, professional product.
- **Repository Safety**: Locating the frontend in `frontend/` preserves the stability of existing M1–M15 backend modules and tests.

### Negative
- Requires maintaining role metadata mappings between backend role codes (`ROLE-FOUNDER`, `ROLE-MENTOR`) and frontend experience workspaces.
- Component development requires strict adherence to custom design tokens rather than relying on stock shadcn or generic template defaults.
