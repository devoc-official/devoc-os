# DeVoc OS Architecture Index

This index is the primary navigation point for engineering documentation.

## Implementation Specifications

- [Milestone 1 — Foundation, Database, Authentication & Multi-Tenant Organization](01_Implementation/Milestone-01-Foundation.md)
- [Milestone 2 — People Engine & Employment Architecture](01_Implementation/Milestone-02-People.md)
- [Milestone 3 — Generic Assignment Engine](01_Implementation/Milestone-03-Assignments.md)
- [Milestone 4 — Projects & Tasks Engine](01_Implementation/Milestone-04-Projects-Tasks.md)

## Engineering Contracts & Security

- [Database Architecture & Schema M1](03_Database/Schema-M1.md)
- [Database Architecture & Schema M2](03_Database/Schema-M2.md)
- [Database Architecture & Schema M3](03_Database/Schema-M3.md)
- [Database Architecture & Schema M4](03_Database/Schema-M4.md)
- [REST API Architecture & Contracts M1](04_API/API-Contracts-M1.md)
- [REST API Architecture & Contracts M2](04_API/API-Contracts-M2.md)
- [REST API Architecture & Contracts M3](04_API/API-Contracts-M3.md)
- [REST API Architecture & Contracts M4](04_API/API-Contracts-M4.md)
- [Authentication, Tenant Resolution & Security](05_Security/Auth-And-Tenancy.md)

## AI Development & Workflow

- [AI Development & Documentation Workflow](AI/Development-Workflow.md)
- [AI Development Master Rules](../AGENTS.md)

## Domain Architecture

- [Organization Domain](02_Domain/Organization.md)
- [People Domain](02_Domain/People.md)
- [Assignments Domain](02_Domain/Assignments.md)
- [Projects & Tasks Domain](02_Domain/Projects-Tasks.md)
- [Learning Domain](02_Domain/Learning.md)
- Work Engine — planned documentation
- Evaluation Engine — planned documentation
- Finance Engine — planned documentation
- Analytics Engine — planned documentation

## Architecture Decisions (ADRs)

- [ADR-001 — Multi-Tenancy](10_ADR/ADR-001-Multi-Tenant.md)
- [ADR-002 — Organization Model](10_ADR/ADR-002-Organization-Model.md)
- [ADR-003 — People Domain](10_ADR/ADR-003-People-Domain.md)
- [ADR-004 — Learning Domain](10_ADR/ADR-004-Learning-Domain.md)
- [ADR-005 — TypeScript Node Modular Monolith Architecture](10_ADR/ADR-005-TypeScript-Node-Modular-Monolith.md)
- [ADR-006 — People Engine & Employment Model](10_ADR/ADR-006-People-Engine-And-Employment-Model.md)
- [ADR-007 — Generic Assignment Engine](10_ADR/ADR-007-Assignment-Engine.md)
- [ADR-008 — Projects & Tasks Engine](10_ADR/ADR-008-Projects-And-Tasks-Engine.md)

## Documentation Ownership

AI coding agents maintain implementation documentation as part of feature delivery according to `AGENTS.md` and `docs/AI/Development-Workflow.md`.

Humans are responsible for reviewing and deciding foundational architectural changes.

## Repository Principle

GitHub is the permanent engineering memory of DeVoc OS. Documentation evolves with tested code rather than being maintained as a separate manual activity.
