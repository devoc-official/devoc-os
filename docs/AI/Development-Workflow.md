# DeVoc OS — AI Development & Documentation Workflow

## Purpose

This document defines how humans, ChatGPT, and AI coding agents work together on DeVoc OS without allowing implementation to silently drift away from the architecture.

## Source of Truth

- **GitHub** is the permanent engineering source of truth.
- **`docs/`** contains finalized architecture, domain rules, database/API contracts, and ADRs.
- **`AGENTS.md`** contains instructions for AI coding agents.
- **Notion** is for product management: roadmap, backlog, sprint, meetings, ideas, KPIs, team, risks, and releases.
- **ChatGPT architecture discussions** are a workshop. Important decisions must be committed to GitHub before they are considered permanent.

## Who Updates Documentation?

The developer does not need to manually maintain every Markdown file.

When an AI coding agent implements a feature, the agent is responsible for updating the relevant engineering documentation when implementation changes an established behavior, contract, schema, domain rule, state machine, permission, event, or architecture decision.

The developer's responsibility is to review important architectural decisions and approve proposed changes; it is not to manually synchronize every implementation detail.

## Standard Feature Workflow

1. Read `AGENTS.md`.
2. Read the relevant `docs/` files and ADRs.
3. Inspect the existing code and tests.
4. Classify the change:
   - Type A — implementation only
   - Type B — domain/business-rule change
   - Type C — architecture change
   - Type D — product/UX change
5. Implement the smallest architecture-consistent change.
6. Add or update tests.
7. Update affected documentation.
8. If architecture changed, create/update an ADR.
9. Run validation and tests.
10. Commit code, tests, migrations, and required documentation together.
11. Report changed files, tests, and any unresolved architectural issue.

## Documentation Update Rules

Documentation must be updated when a change affects:

- Domain boundaries
- Entities or relationships
- Business rules
- State transitions
- Permissions
- Tenant isolation
- API endpoints or contracts
- Database schema or constraints
- Domain events
- Audit behavior
- Analytics definitions
- Configuration/extensibility
- Security behavior
- Major architectural patterns

Documentation does **not** need to be changed for ordinary refactoring that preserves the documented behavior.

## Architecture Conflict Rule

If the requested implementation conflicts with a finalized architecture document or ADR, the AI agent must not silently redesign the system.

The agent must:

1. Identify the conflict.
2. Explain the impact.
3. Stop before making a foundational change.
4. Propose an ADR or architecture update.
5. Continue only after the architectural decision is resolved.

## Commit Rule

A feature commit should keep implementation and documentation synchronized whenever possible.

Example:

`feat(assignments): implement generic assignment engine`

may include:

- application/domain code
- migrations
- API handlers
- tests
- `docs/02_Domain/Assignments.md`
- `docs/03_Database/...`
- `docs/04_API/...`
- ADR changes when required

## Human Review Boundary

Humans should review:

- New architecture decisions
- Changes to tenancy/security
- Changes to core domain boundaries
- Changes to financial rules
- Changes to permission models
- Destructive data migrations
- Major technology changes

AI agents may handle routine documentation synchronization and implementation details within those boundaries.

## Golden Rule

**Code should never become more authoritative than the documented architecture, and documentation should never describe behavior that the tested code does not actually implement.**
