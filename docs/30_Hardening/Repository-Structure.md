# Repository Structure Architecture

## Overview

DeVoc OS uses a single Git repository containing independently deployable backend and frontend applications, unified under **npm Workspaces**:

> **DeVoc OS uses a single Git repository containing independently deployable backend and frontend applications.**
> **Repository separation is logical and deployment boundaries are independent.**

This architecture is a clean modular monolith with a dedicated modern frontend experience layer. It avoids duplicate `node_modules` installations through npm Workspaces hoisting while preserving strict module boundaries.

---

## Repository Boundaries

```text
devoc-os/
│
├── backend/                  # Backend Application (Node.js, TypeScript, Express, PostgreSQL)
│   ├── src/                  # Domain engines (M1–M15), auth, tenant, database, permissions
│   ├── tests/                # Automated test suites (53 suites, 527 tests)
│   ├── migrations/           # Database schema migrations (001–015)
│   ├── dist/                 # Production compiled JavaScript (gitignored)
│   ├── package.json          # Backend package manifest
│   ├── tsconfig.json         # Backend TypeScript compiler configuration
│   ├── vitest.config.ts      # Backend Vitest runner configuration
│   └── .env.example          # Backend environment variable template
│
├── frontend/                 # Frontend Application (Next.js 15, React 19, Tailwind CSS)
│   ├── src/                  # App Router pages, features (F2–F6), UI components, auth/role contexts
│   ├── public/               # Static web assets
│   ├── package.json          # Frontend package manifest
│   ├── tsconfig.json         # Frontend TypeScript configuration
│   └── vitest.config.ts      # Frontend Vitest runner configuration
│
├── docs/                     # Architectural Source of Truth
│   ├── 01_Implementation/   # Milestone specifications (M1–M15, F1.2–F6)
│   ├── 02_Domain/           # Domain models and business rules
│   ├── 03_Database/         # Schema specifications
│   ├── 04_API/              # REST API contracts
│   ├── 05_Security/         # Auth, tenancy, capability permissions
│   ├── 10_ADR/              # Architecture Decision Records (ADR-001–020)
│   ├── 20_Frontend/         # Frontend architecture, design system, tokens, UX
│   ├── 30_Hardening/        # Security, performance, test coverage, migration reports
│   └── AI/                  # AI development rules and workflows
│
├── .gitignore                # Workspace ignore rules
├── .env.example              # Workspace-level environment template
├── package.json              # Workspace orchestration manifest (npm Workspaces)
├── package-lock.json         # Unified dependency lockfile
└── README.md                 # Project orientation and developer onboarding
```

---

## Component Boundaries

### 1. Backend (`backend/`)
- **Domain Modules**: `backend/src/modules/` houses all 15 modular monolith engines:
  - `organization` (M1)
  - `people` (M2)
  - `assignments` (M3)
  - `projects-tasks` (M4)
  - `work` (M5)
  - `meetings` (M6)
  - `learning` (M7)
  - `evaluation` (M8)
  - `finance` (M9)
  - `audit-events` (M10)
  - `analytics` (M11)
  - `admin` (M12)
  - `recruitment` (M13)
  - `workforce` (M14)
  - `workforce-time` (M15)
- **Infrastructure & Cross-Cutting**: `auth`, `tenant`, `permissions`, `database`, `events`, `audit`, `shared`.
- **Database Migrations**: `backend/migrations/` holds raw SQL migrations `001_initial_m1_schema.sql` through `015_workforce_time_m15_schema.sql`.
- **Tests**: `backend/tests/` contains all unit, integration, tenant-isolation, security, and transaction-safety tests.
- **Independence**: Can be built (`npm run build:backend`), tested (`npm run test:backend`), and run (`npm run start:backend` / `npm run dev:backend`) via workspace orchestration or independently inside `backend/`.

### 2. Frontend (`frontend/`)
- **Architecture**: Next.js 15 App Router, React 19, Tailwind CSS.
- **Experience Modules**:
  - Foundation & Design System (F1.2)
  - Student Experience (F2)
  - Mentor & Reviewer Experience (F3)
  - Employee, Developer & Project Manager Experience (F4)
  - Founder & Academy Head Experience (F5)
  - Admin & Operations Experience (F6)
- **Centralized API Client**: `frontend/src/api/client.ts` communicating over REST to the backend at `/api/v1/`.
- **Role Switching**: Context-switching and role-driven UI navigation without bypassing server-side security.
- **Independence**: Can be built (`npm run build:frontend`), tested (`npm run test:frontend`), and run (`npm run dev:frontend`) via workspace orchestration or independently inside `frontend/`.

### 3. Documentation (`docs/`)
- Kept strictly at the repository root.
- Unifies backend, frontend, domain rules, ADRs, security models, and operational hardening into a single authoritative engineering source of truth.

### 4. Database (`backend/migrations/`)
- Located within `backend/` because database migrations are an intrinsic part of backend persistence and schema management.
- Executed via `backend/src/database/migrate.ts`.

---

## Workspace Orchestration

The root `package.json` uses **npm Workspaces**:
```json
{
  "name": "devoc-os-workspace",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ]
}
```
All dependencies are hoisted into a single root `node_modules/` directory with a single unified `package-lock.json`. No duplicate `node_modules` trees exist on disk.
