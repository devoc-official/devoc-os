# ADR-005: Node.js / TypeScript Modular Monolith Architecture

* **Status:** Accepted  
* **Date:** 2026-09-10  
* **Deciders:** DeVoc Engineering Team  
* **Subsystem:** Core Architecture & Runtime Foundation  

---

## Context and Problem Statement

DeVoc OS requires a production-grade, maintainable foundation for V1. The platform must unify multiple business domains (Organization, People, Assignments, Learning, Work, Evaluation, Finance, Analytics) into a cohesive enterprise system.

Key requirements:
- Maintainable modular-monolith structure.
- Strict multi-tenant isolation.
- REST API under `/api/v1/`.
- PostgreSQL database with raw SQL schema migrations and UUID primary keys.
- Domain logic isolated in application/domain services.
- Fast local development with zero external dependencies when running unit/integration tests.

---

## Decision Drivers

1. Static type safety across domain entities, DTOs, and API contracts.
2. Fast execution of automated unit, integration, authentication, authorization, and multi-tenant isolation tests.
3. Clean domain module isolation (`modules/organization`, `modules/people`, etc.) following `AGENTS.md`.
4. High maintainability and extensibility without introducing microservices prematurely.

---

## Considered Options

1. **Node.js (TypeScript) + Express** (Modular Monolith architecture with PGlite in-memory testing and PostgreSQL 16 production engine).
2. **Python + FastAPI / Django** (Modular monolith architecture).
3. **Go + Gin / Chi** (Modular monolith architecture).

---

## Decision Outcome

**Chosen Option:** **Node.js (TypeScript) + Express**

### Rationale

- **TypeScript v5.8** provides strong static typing, preventing runtime errors and enabling typed DTO validation with Zod.
- **Express.js** provides a lightweight REST routing framework allowing thin controllers while business logic remains in application/domain services.
- **PostgreSQL 16** serves as the transactional database. The node-postgres (`pg`) driver and `@electric-sql/pglite` embedded engine provide 100% PostgreSQL SQL dialect compatibility in tests without requiring external background database services.
- **Modular Monolith**: Code is organized into cohesive modules (`src/modules/organization/`, `src/auth/`, `src/tenant/`, `src/permissions/`, `src/audit/`, `src/events/`).

---

## Consequences

### Positive
- Unified language (TypeScript) across backend and future web apps.
- Strict tenant isolation enforced at middleware and repository layers.
- In-process event bus (`EventEmitter`) enables audit logging and event handling without introducing Kafka/RabbitMQ brokers prematurely.
- Instant, repeatable test execution via Vitest and PGlite.

### Negative / Trade-offs
- Must maintain strict module boundaries to prevent circular dependencies between domain modules as future milestones (People, Assignments, Work, Learning) are added.
