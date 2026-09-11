# ADR-009 — Work Engine

## Status

**Accepted / Frozen for M5 implementation**

## Context

DeVoc OS needs a durable representation of actual contribution across founders, employees, mentors, reviewers, trainers, freelancers, and other people. Projects and Tasks define planned work, while Assignments define responsibility. Neither records what was actually performed, supporting evidence, or resulting outcomes.

The system also needs founder contribution tracking without creating a separate founder-only subsystem.

## Decision

Introduce a generic Work Engine centered on `work_records`.

The model is:

**Person → Assignment → Target → Work → Evidence / Outcome**

Assignment remains the responsibility model. Work is the contribution record.

### 1. One work model

Founders and other people use the same Work Record entity. Founder-specific categories may identify management, strategy, business development, engineering, academy, or other founder work. No founder work table is created.

### 2. Optional polymorphic target

Work may target a Project, Task, Business Unit, Department, or Team. Targetless work is allowed for internal/organizational contribution.

Target IDs are not generic FKs. A WorkTargetResolverRegistry validates existence, assignability, and tenant ownership, following the proven M3 registry pattern.

### 3. Optional assignment context

A Work Record may reference an Assignment. If present, the assignment must belong to the same person and organization and be compatible with the work target. Work must not become a duplicate responsibility model.

### 4. Evidence is separate

Evidence is modeled as child records so one work item can have multiple supporting artifacts and provider-specific metadata does not pollute the Work entity.

### 5. Outcomes are separate and many-to-many

An Outcome may be produced by multiple Work Records, and a Work Record may contribute to multiple Outcomes. Therefore the relationship is explicit through `work_outcomes`.

### 6. Controlled lifecycle

Work uses `draft`, `submitted`, `approved`, `rejected`, and `cancelled`. State transitions are explicit; approved and cancelled are terminal.

### 7. Security and tenancy

Existing authentication and contextual authorization are reused. Tenant checks apply to every referenced entity. Cross-tenant access must not disclose resource existence.

### 8. Audit and events

Material work mutations and lifecycle transitions use the existing audit/event infrastructure. Events are in-process in the modular monolith.

## Consequences

### Positive

- Consistent contribution tracking across all people categories
- Founder work becomes measurable without special-case architecture
- Strong foundation for Evaluation and Analytics
- Evidence-backed accountability
- Reusable target model for future domains
- Clear separation between planned work, responsibility, and actual contribution

### Negative / trade-offs

- Polymorphic targets require resolver infrastructure and service-level validation
- Many-to-many outcomes require an additional relationship table
- Approval introduces lifecycle and permission rules
- Historical work data requires deliberate retention/deletion policy

## Explicit non-decisions

This ADR does not define Meetings, Learning, Evaluations, Finance, Analytics dashboards, Notifications, or AI. Those remain separate milestones.

## Alternatives rejected

### Founder-specific work tables

Rejected because it duplicates the Work model and prevents unified contribution analytics.

### Project/task-specific work tables

Rejected because work may be internal or attached to future target types.

### Embedding evidence directly in Work

Rejected because multiple evidence items and provider-specific metadata require a separate entity.

### Single outcome_id on Work

Rejected because contribution is many-to-many.

### Microservice Work service

Rejected for V1 because DeVoc OS remains a modular monolith and does not yet require distributed service boundaries.

## Implementation constraint

Any change to these architectural decisions requires an updated ADR before implementation proceeds.
