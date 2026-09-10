# DeVoc OS

Enterprise-grade, multi-tenant Business Operating System for DeVoc.

DeVoc OS unifies People, Learning, Evaluation, Work, Projects, Finance, Permissions, Audit, and Analytics into an extensible platform designed for internal use first and future multi-organization SaaS.

---

## Current Status: Milestone 1 Completed

Milestone 1 (M1) is fully implemented, validated, and documented:
- Project Foundation & Modular Monolith Architecture
- PostgreSQL Database Connectivity & Migration System
- JWT Authentication & Bcrypt Credentials Hashing
- Strict Multi-Tenant Organization Context Resolution & Isolation
- Contextual Authorization Model (`Role + BU + Team + Project`)
- Complete Organization Engine (Organization, Branch, Business Unit, Department, Team)
- Operational Audit Logging & Internal Domain Events
- Operational Health & Readiness Endpoints
- Automated Test Suites (Unit, Integration, Auth, Tenant Isolation, API Contracts)

---

## Quick Start & Local Setup

### Prerequisites
- **Node.js**: v22.0.0 or higher (v24+ recommended)
- **npm**: v10.0.0 or higher
- **PostgreSQL**: v16 (Optional for production/local postgres; in-memory PGlite PostgreSQL runs automatically for tests)

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Database Migrations
Run schema migrations against PostgreSQL:
```bash
npm run migrate
```

To reset the database schema and re-apply:
```bash
npm run migrate:reset
```

### 4. Development Database Seeding
Seed development data (idempotent bootstrap):
```bash
npm run seed
```

### 5. Running the Application
Development mode:
```bash
npm run dev
```

Production build & start:
```bash
npm run build
npm start
```

Server runs by default at `http://localhost:3000`.

---

## Validation & Testing

Run all automated unit, integration, authentication, tenant-isolation, and API contract tests:
```bash
npm test
```

Run TypeScript static type checks:
```bash
npm run typecheck
```

---

## Core API Endpoints

- `GET /api/v1/health` — Liveness check
- `GET /api/v1/readiness` — PostgreSQL readiness check
- `POST /api/v1/auth/login` — Authenticate user identity
- `POST /api/v1/auth/logout` — Invalidate user session
- `GET /api/v1/auth/me` — Current user & tenant memberships
- `POST /api/v1/organizations/bootstrap` — Bootstrap new tenant organization
- `GET /api/v1/organizations` — List accessible tenant organizations
- `GET /api/v1/branches`, `POST /api/v1/branches` — Branch management
- `GET /api/v1/business-units`, `POST /api/v1/business-units` — Business Unit management
- `GET /api/v1/departments`, `POST /api/v1/departments` — Department management
- `GET /api/v1/teams`, `POST /api/v1/teams` — Permanent & temporary teams
- `GET /api/v1/memberships`, `POST /api/v1/memberships` — Organization membership management
- `GET /api/v1/audit-logs` — Tenant operational audit trail

All tenant-scoped requests require headers: `Authorization: Bearer <token>` and `X-Organization-Id: <org_uuid>`.

---

## Engineering Source of Truth

GitHub is the permanent engineering memory of DeVoc OS.

- `AGENTS.md` — AI development rules and guidelines
- `docs/Architecture-Index.md` — Engineering documentation index
- `docs/01_Implementation/Milestone-01-Foundation.md` — Milestone 1 Specification
- `docs/03_Database/Schema-M1.md` — Database schema documentation
- `docs/04_API/API-Contracts-M1.md` — API architecture & REST contracts
- `docs/05_Security/Auth-And-Tenancy.md` — Security and tenant isolation specification
- `docs/10_ADR/` — Architecture Decision Records (ADRs)
