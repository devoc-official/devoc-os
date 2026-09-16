# DeVoc OS — F6 Admin & Operations Experience Architecture

## 1. Executive Summary

Milestone **F6 — Admin & Operations Experience** provides authorized administrators and operations users with a high-density, controlled, and auditable interface for managing and configuring the DeVoc OS platform.

F6 is built directly on top of the locked backend (M1–M15) and frontend foundations (F1.2 Foundation, F2 Student, F3 Mentor/Reviewer, F4 Employee/Developer/PM, F5 Founder/Academy Head).

The frontend functions strictly as an **Experience Layer** composing existing domain APIs, while backend authorization remains authoritative:
```text
M12 Platform Administration Engine (Settings, Members, Features, System Roles)
  ↕
M1 Organization Engine (Tenant Metadata, Physical Branches, Business Units, Departments, Teams)
  ↕
M2 People Engine (Personnel Directory, User Account Linkages, Contextual Roles)
  ↕
M5 Work & M6 Meetings (Taxonomies: Work Categories, Meeting Types)
  ↕
M8 Evaluation Engine (Evaluation Templates, Scoring Dimensions)
  ↕
M10 Audit Engine (Immutable Security Audit Stream, Append-Only Events)
```

---

## 2. Admin Role & Permission Model

Admin capability is resolved from the existing M12 role/permission architecture without inventing any new identity structures:
- **Capabilities Checked**:
  - `platform:admin`
  - `organization:admin`
  - `structure:manage`
  - `membership:manage`
  - `people:admin`
  - `roles:manage`
  - `masterdata:manage`
  - `finance:admin`
  - `features:manage`
  - `audit:view`
- **Multi-Role Switching**:
  - An administrator who also has developer, mentor, reviewer, or founder responsibilities can freely switch personas via the top bar `RoleSwitcher`.
  - Switching to `admin` loads the dedicated Section 3 administrative navigation tree and renders `AdminDashboardView` on `/dashboard`.

---

## 3. Implemented Workspaces & Routes

| Workspace | Route | Primary Capabilities | Backend Source of Truth |
| :--- | :--- | :--- | :--- |
| **Admin Command Center** | `/admin` | Operational health indicators, critical attention items (pending invites, suspended accounts, unlinked people), quick actions | M12 Administration, M10 Audit |
| **Organization Profile** | `/admin/organization` | Tenant profile, legal name, slug, domain identifiers, and physical branch locations | M1 Organization, M12 Admin |
| **Business Structure** | `/admin/structure` | Distinct management for Business Units, Branches, Departments, and Teams without flattening relationships | M1 Organization Engine |
| **User Memberships** | `/admin/users` | Organization member roster, invitation modal, role assignment (`org_admin`, `org_member`), activation and suspension | M12 Administration Engine |
| **People & Identities** | `/admin/people` | Personnel records, user account linking/unlinking, contextual role assignments scoped to BU/Dept/Team | M2 People, M12 Roles |
| **Roles & Capabilities** | `/admin/roles` | System role catalog and capability matrix inspection | M12 Administration Engine |
| **Master Data Taxonomies** | `/admin/master-data` | Configurable master data: work categories, meeting types, evaluation templates, and skill catalogs | M5 Work, M6 Meetings, M8 Evaluation |
| **Feature Configuration** | `/admin/features` | Server-enforced feature flags, tenant toggle overrides, safety descriptions | M12 Administration Engine |
| **Operational Settings** | `/admin/settings` | Operational timezone, locale, reporting currency, date/time formats, default branch and BU | M12 Administration Engine |
| **Security Audit Stream** | `/admin/audit` | Immutable audit log table with action filters, actor inspection, before/after change review | M10 Audit & Events Engine |

---

## 4. Architectural & Safety Principles

1. **Anti-AI-Slop & Enterprise Aesthetic**:
   - Zero decorative slop, no artificial gradients or glassmorphism.
   - High-density tabular layouts, 4px grid spacing, Inter typography.
   - Dual-encoded status badges (icon + semantic text) compliant with WCAG 2.2 AA.
2. **Branch vs Business Unit Separation**:
   - Strictly enforces the architectural distinction between physical branches (operational locations) and business units (cost/revenue centers). Branches do not assume ownership of every BU.
3. **Personnel vs User Account Separation**:
   - Preserves M2 People as human records separate from M12 user authentication accounts. Account linking and unlinking is explicit and auditable.
4. **Contextual Role Scoping**:
   - Roles can be assigned globally or scoped to a specific Business Unit, Department, or Team, matching the effective authorization model: `Role + Business Unit + Team + Project`.
5. **Multi-Tenant Isolation**:
   - All client queries strictly inject the active tenant context (`X-Organization-Id`).
   - Server-side authorization enforces tenant boundaries, and client models handle authorization fallback gracefully.

---

## 5. Verification & Quality Gates

| Gate | Criterion | Result | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Tests** | Vitest + React Testing Library | 42 test files, 145 tests passed | **PASSED (100%)** |
| **Frontend Typecheck** | `tsc --noEmit` | 0 errors | **PASSED** |
| **Frontend Production Build** | `next build` | 74 routes compiled & statically optimized | **PASSED** |
| **Backend Regression Suite** | M1–M15 backend tests | 49 test files, 504 tests passed | **PASSED (100%)** |
| **Git Working Tree** | Clean working tree | All changes tracked & verified | **READY TO LOCK** |
