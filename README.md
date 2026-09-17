# DeVoc OS

Enterprise-grade, multi-tenant Business Operating System for DeVoc.

DeVoc OS unifies People, Learning, Evaluation, Work, Projects, Finance, Permissions, Audit, and Analytics into an extensible platform designed for internal use first and future multi-organization SaaS.

---

## Repository Structure

DeVoc OS uses a clean monorepo structure managed via npm Workspaces containing independently executable backend and frontend applications:

```text
devoc-os/
│
├── backend/
│   ├── src/                 # Modular monolith domain engines (M1–M15)
│   ├── tests/               # Unit, integration, auth, tenant isolation, and hardening test suites
│   ├── migrations/          # PostgreSQL schema migrations (001–015)
│   ├── dist/                # Compiled backend output (gitignored)
│   ├── package.json         # Backend dependencies and scripts
│   ├── tsconfig.json        # Backend TypeScript configuration
│   └── vitest.config.ts     # Backend test configuration
│
├── frontend/
│   ├── src/                 # Next.js 15 App Router experience layer (F1.2–F6)
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies and scripts
│   ├── tsconfig.json        # Frontend TypeScript configuration
│   └── vitest.config.ts     # Frontend test configuration
│
├── docs/                    # Architectural source of truth (ADRs, specs, domain rules)
├── .env.example             # Environment variable template
├── package.json             # Root workspace manifest (npm Workspaces)
├── package-lock.json        # Single unified dependency lockfile
└── README.md
```

---

## Quick Start & Local Setup

### Prerequisites
- **Node.js**: v22.0.0 or higher (v24+ recommended)
- **npm**: v10.0.0 or higher
- **PostgreSQL**: v16 (Optional for local PostgreSQL; in-memory PGlite PostgreSQL runs automatically for tests)

### 1. Installation
Install all workspace dependencies via a single root command:
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Database Migrations
Run schema migrations (001–015) against PostgreSQL:
```bash
# From workspace root
npm run migrate

# Or directly targeting workspace
npm --workspace=backend run migrate
```

To reset the database schema and re-apply:
```bash
npm run migrate:reset
```

### 4. Development Database Seeding
Seed development data (idempotent bootstrap):
```bash
# From workspace root
npm run seed

# Or directly targeting workspace
npm --workspace=backend run seed
```

---

## Development & Execution Workflows

### Running Applications

#### From Workspace Root:
- **Backend Dev**: `npm run dev:backend` (runs on `http://localhost:3000`)
- **Frontend Dev**: `npm run dev:frontend` (runs on `http://localhost:3001`)
- **Combined Dev**: `npm run dev`

#### Independently in Applications:
- **Backend**: `cd backend && npm run dev`
- **Frontend**: `cd frontend && npm run dev`

### Production Build:
```bash
# Build both backend and frontend
npm run build

# Or individually
npm run build:backend
npm run build:frontend
```

---

## Validation & Testing

### Test Suites
```bash
# Run both test suites from root
npm test

# Run backend test suite (53 suites, 527 tests)
npm run test:backend

# Run frontend test suite (42 suites, 145 tests)
npm run test:frontend
```

### TypeScript Static Typecheck
```bash
# Check both applications
npm run typecheck

# Individually
npm run typecheck:backend
npm run typecheck:frontend
```

---

## Engineering Source of Truth

GitHub is the permanent engineering memory of DeVoc OS.

- `AGENTS.md` — AI development master rules and guidelines
- `docs/Architecture-Index.md` — Complete engineering documentation index
- `docs/30_Hardening/Repository-Structure.md` — Repository architecture and boundaries
- `docs/30_Hardening/Repository-Structure-Migration.md` — Migration audit report
- `docs/01_Implementation/` — Milestone specifications (M1–M15, F1–F6)
- `docs/03_Database/` — Database schemas (M1–M15)
- `docs/04_API/` — REST API contracts (M1–M15)
- `docs/05_Security/Auth-And-Tenancy.md` — Security and tenant isolation specification
- `docs/10_ADR/` — Architecture Decision Records (ADRs)
- `docs/20_Frontend/` — Frontend design system & experience architecture
