# DeVoc OS Architecture Index

This index is the navigation point for engineering documentation.

## AI Development

- [AI Development & Documentation Workflow](AI/Development-Workflow.md)
- [AI Development Master Rules](../AGENTS.md)

## Domain Architecture

- [Organization Domain](02_Domain/Organization.md)
- [People Domain](02_Domain/People.md)
- [Learning Domain](02_Domain/Learning.md)
- Assignment Engine — planned documentation
- Work Engine — planned documentation
- Project Domain — planned documentation
- Task Domain — planned documentation
- Evaluation Engine — planned documentation
- Finance Engine — planned documentation
- Analytics Engine — planned documentation

## Architecture Decisions

- [ADR-001 — Multi-Tenancy](10_ADR/ADR-001-Multi-Tenant.md)
- [ADR-002 — Organization Model](10_ADR/ADR-002-Organization-Model.md)
- [ADR-003 — People Domain](10_ADR/ADR-003-People-Domain.md)
- [ADR-004 — Learning Domain](10_ADR/ADR-004-Learning-Domain.md)
- Future foundational decisions must be recorded as ADRs.

## Engineering Contracts

The following documentation areas are maintained as implementation progresses:

- Database architecture and migrations
- REST API architecture and contracts
- Authentication and authorization
- Audit and domain events
- Analytics definitions
- Testing strategy

## Documentation Ownership

AI coding agents maintain implementation documentation as part of feature delivery according to `AGENTS.md` and `docs/AI/Development-Workflow.md`.

Humans are responsible for reviewing and deciding foundational architectural changes.

## Repository Principle

GitHub is the permanent engineering memory of DeVoc OS. Documentation should evolve with the code rather than being maintained as a separate manual activity.
