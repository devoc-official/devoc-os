# DeVoc OS — AI Development Master Rules

## 1. Purpose

DeVoc OS is an enterprise-grade, multi-tenant Business Operating System for DeVoc. It is designed to unify People, Learning, Evaluation, Work, Projects, Finance, Permissions, Audit, and Analytics into one extensible platform.

The system must work for DeVoc internally first and be capable of becoming a multi-organization SaaS product later.

This file is the primary instruction set for AI coding agents working in this repository.

---

## 2. Source of Truth

Use the following hierarchy:

1. Finalized architecture and ADR documents in `docs/` — architectural source of truth.
2. This `AGENTS.md` — AI implementation rules and development behavior.
3. Existing production code and tests — implementation source of truth where architecture is already finalized.
4. Notion — product management only; do not treat it as technical source of truth.
5. Chat discussions — requirements/architecture workshop context, not a permanent source of truth.

GitHub is the permanent engineering memory of DeVoc OS.

If an architectural decision is not documented, do not silently invent a major architectural decision. Use the smallest reasonable implementation and flag the missing decision.

---

## 3. Core Architecture Principles

- Multi-tenant by design.
- Organization/tenant isolation is mandatory.
- UUIDs are the default identifier strategy.
- PostgreSQL is the primary relational database.
- REST API is the V1 API style under `/api/v1/`.
- Domain logic belongs in domain/application services, not controllers.
- Controllers should remain thin.
- Database access must not bypass tenant boundaries.
- Authentication and authorization are separate concerns.
- Auditability is a first-class requirement.
- Important historical records are append-oriented; do not silently overwrite history.
- Business rules must be explicit and testable.
- Prefer extensible configuration over hard-coded business-unit assumptions.
- Avoid premature microservices. V1 should use a modular monolith unless an ADR explicitly requires otherwise.
- Avoid unnecessary abstractions that make the system harder to understand.
- Favor boring, maintainable, production-grade technology over novelty.

---

## 4. Domain Architecture

The primary domain engines are:

### Organization Engine

Handles:
- Organization / tenant
- Branch
- Business Unit
- Department
- Team

A branch is a physical or operational location. A branch does not have to contain every Business Unit.

Business Units are configurable. The system must support creating future BUs without changing the core architecture.

Each Business Unit can have:
- Head
- Budget
- KPIs
- Team

A project may belong to multiple Business Units.

### People Engine

Handles:
- Person
- User Identity
- Role
- Person Role
- Employment
- organizational relationships

People may have multiple roles and assignments simultaneously, subject to configured organizational constraints.

Known people categories include:
- Founder
- Employee
- Student
- Trainer
- Mentor
- Reviewer
- Freelancer

Do not hard-code these as the only possible people types if the domain model supports extensibility.

### Assignment Engine

Assignment is a generic relationship between a person and an organizational object.

It is NOT restricted to projects.

Assignments may connect a person to objects such as:
- Project
- Task
- Business Unit
- Department
- Team
- Learning Program
- Student
- Other supported organizational objects

An assignment should support:
- Person
- Target object/type
- Assignment type
- Role/context
- Start date/time
- End date/time
- Status
- Capacity
- Assignment authority
- History

Assignment lifecycle:
- Scheduled
- Active
- Paused
- Completed
- Cancelled

Multiple simultaneous assignments are allowed.

Capacity must be flexible enough to represent different units such as:
- Hours/week
- Tasks/week
- Students
- Projects
- Other measurable capacity types

Capacity conflicts should normally produce warnings, not hard blocking, unless a later business rule explicitly changes this.

Employment is a specialized assignment concept, but employment-specific data belongs in the People/Employment domain.

### Work Engine

Handles:
- Project
- Task
- Work Log
- Meeting
- Outcome
- Evidence

Founders and employees use the same work logging system. Founder work additionally supports strategy-related categories such as:
- Strategy
- Product Vision
- Partnerships
- Architecture
- Hiring
- Business Development

Meetings are work and must be represented as work activity.

A Work Log belongs to exactly one Project or no Project. If work spans projects, create separate logs rather than creating ambiguous multi-project ownership.

Required Work Log concepts:
- Title
- Business Unit
- Optional Project
- Work Category
- Start Time
- End Time or Duration
- Description
- Outcome

Evidence is optional.

Evidence may include:
- Project completed
- Documentation
- Student reviews
- Client feedback
- Meeting notes
- Other measurable or qualitative evidence

Qualitative feedback is important. Do not force numeric scoring when the domain does not require it.

### Project Domain

Supported project types include:
- SaaS Product
- Client Project
- Student Project
- Internal Tool
- Research Project
- Open Source Project

Project lifecycle:
1. Idea
2. Research
3. Planning
4. Development
5. Testing
6. Beta
7. Released
8. Maintenance
9. Archived

Project ownership may involve multiple owners.

Project roles include:
- Product Owner
- Project Manager
- Tech Lead
- Backend Developer
- Frontend Developer
- Mobile Developer
- UI/UX Designer
- QA Tester
- Reviewer
- DevOps
- Mentor

Project team members are fixed until the Project Manager changes the team.

### Task Domain

Tasks may be:
- Project tasks
- Personal/organizational tasks
- Recurring tasks

Support optional dependencies.

Priority values:
- Critical
- High
- Medium
- Low

Track:
- Planned Start
- Planned End
- Actual Start
- Actual End

### Learning Engine

The Academy is self-learning oriented rather than class-schedule oriented.

The Learning Engine must support:
- Learning Program
- Enrollment
- Learning Journey
- Milestone
- Competency
- Milestone Competency relationships
- Reviews
- Roadmap changes

A student's learning roadmap can change based on reviews.

Milestones can be:
- Learning
- Project
- Assessment
- Other configured milestone types

Students may:
- Skip milestones
- Repeat milestones
- Pause
- Change technology stack

A student cannot transfer to another Learning Program through ordinary roadmap changes.

Review cadence can be weekly or every two weeks, and multiple reviews may occur in one week.

Only one active mentor should normally be assigned to a student at a time, while historical mentor relationships must be preserved.

Course completion depends on the configured completion rules, including milestone completion, projects, reviewer approval, Academy Head approval, competency, and other required criteria.

### Evaluation Engine

Evaluation types include:
- Founder Self-Review
- Mentor Review
- Employee Performance Review
- Internship Review
- Freelancer Review
- Trainer Review
- Team Review
- Project Review

Evaluations are qualitative-first and historical/append-oriented.

Evaluation templates and dimensions should be configurable by evaluation type.

Possible decisions include:
- Continue
- Improve
- Repeat
- Change Assignment
- Change Mentor
- Promote
- Extend
- Internship Eligible
- Course Completed
- Project Completed
- Needs Follow-up

Evidence is optional.

Never silently overwrite historical evaluation records.

### Finance Engine

V1 finance requirements include Academy fee tracking:
- Fee Account
- Payment Schedule
- Payment
- Refund
- Discount
- Referral Discount
- EMI
- Due Date
- Late Fee
- Fine

Financial records must be auditable and append-oriented.

Do not expose financial data across tenants.

### Analytics Engine

Analytics is primarily a read/decision-support layer over domain data.

Important contribution analytics include:
- Hours worked
- Tasks completed
- Outcomes delivered
- Contribution Score

The system should also support Academy KPIs such as:
- Placement Rate
- Internship Rate
- Student Satisfaction
- Completion Rate
- Alumni Success
- Student Growth
- Revenue

Analytics must not become the source of truth for transactional data.

---

## 5. Organization and Tenant Rules

Every tenant-owned record must be safely scoped to its organization.

Never:
- Query tenant-owned data without tenant context.
- Accept a client-supplied organization ID and trust it blindly.
- Allow IDs from one tenant to resolve in another tenant.
- Build global queries over tenant data unless the operation is explicitly an authorized platform-level operation.

Tenant resolution must occur before authorization and business logic.

Recommended request flow:

Authentication → Tenant Resolution → Permission Check → Validation → Domain Service → Business Rules → Database Transaction → Audit → Domain Event → Response

Any implementation that violates this flow requires an explicit architectural decision.

---

## 6. Authorization Rules

Authorization should be based on context, not only a global role.

The effective permission model is:

**Role + Business Unit + Team + Project**

A user's ability to perform an operation may depend on their role and organizational context.

Do not implement authorization as a single global `is_admin` check except for genuine platform-level operations.

Permission checks belong close to the domain operation, while policy definitions remain centralized.

---

## 7. API Rules

V1 uses REST under:

`/api/v1/`

Use resource-oriented endpoints.

Prefer consistent response envelopes:

```json
{
  "data": {},
  "meta": {}
}
```

Errors should use a consistent structure containing at minimum:
- Machine-readable error code
- Human-readable message
- Optional field-level details
- Request/correlation identifier where supported

API controllers must not contain large business workflows.

Domain services own business rules.

Validate all external input.

Never trust client-provided authorization context, organization context, ownership, or status transitions.

---

## 8. Database Rules

Use PostgreSQL for the V1 transactional database.

Use UUID primary keys by default.

Tenant-owned tables should include `organization_id` unless there is a documented reason not to.

Use foreign keys where relational integrity is important.

Use indexes for:
- organization_id
- frequently queried foreign keys
- status fields where justified
- timestamps used in operational queries
- common composite tenant + lookup patterns

Do not create indexes speculatively everywhere.

Use database transactions for multi-record business operations.

Do not physically delete important historical records unless the architecture explicitly permits it.

Use soft deletion only when there is a real product requirement; do not add `deleted_at` to every table automatically.

Never store derived analytics as authoritative transactional state.

---

## 9. State Transitions

State machines must be explicit.

Do not allow arbitrary status changes by simply accepting a new status from the client.

Every meaningful transition must:
1. Validate the current state.
2. Validate actor permissions.
3. Validate business conditions.
4. Persist the transition atomically.
5. Record an audit trail where appropriate.
6. Emit a domain event where appropriate.

Invalid transitions must fail clearly.

---

## 10. Audit and Events

Important business actions must be auditable.

Audit information should capture, where applicable:
- Actor
- Organization
- Action
- Entity type
- Entity ID
- Timestamp
- Relevant before/after information
- Request/correlation ID

Domain events should be used for meaningful cross-domain reactions without tightly coupling domains.

Do not introduce a distributed event bus merely because events exist. A transactional/outbox-style approach is preferred when asynchronous processing becomes necessary.

---

## 11. Security Rules

Never commit:
- Secrets
- API keys
- Passwords
- Private tokens
- Production credentials
- Sensitive personal data in test fixtures

Use environment configuration for secrets.

Validate authorization server-side.

Apply tenant isolation at every data access boundary.

Avoid exposing internal database IDs or implementation details unnecessarily, while UUIDs may be used as public identifiers where appropriate.

Log enough for debugging, but never log secrets or unnecessary sensitive data.

Use secure password/token handling through established libraries rather than custom cryptography.

---

## 12. Code Organization

Preferred backend structure:

```text
src/
  modules/
    organization/
    people/
    assignments/
    projects/
    tasks/
    work/
    learning/
    evaluation/
    finance/
    analytics/
  auth/
  permissions/
  audit/
  events/
  database/
  shared/
```

Keep domain modules cohesive.

Do not create circular dependencies between domain modules.

Shared code must contain genuinely shared primitives, not business logic that belongs to a domain.

---

## 13. Testing Requirements

Every meaningful feature must include appropriate tests.

At minimum, add tests for:
- Business rules
- Authorization
- Tenant isolation
- State transitions
- Important service behavior
- API validation
- Critical database constraints

For tenant-aware queries, test both:
- Correct tenant can access its data.
- Another tenant cannot access the same data.

For permission-sensitive actions, test both authorized and unauthorized actors.

Do not weaken or remove tests merely to make an implementation pass.

---

## 14. AI Agent Operating Procedure

Before implementing a non-trivial feature:

1. Inspect the relevant architecture/ADR documentation.
2. Inspect the existing implementation.
3. Identify the affected domain boundaries.
4. Identify database and API implications.
5. Identify authorization and tenant-isolation implications.
6. Implement the smallest architecture-consistent change.
7. Add or update tests.
8. Run the relevant validation/test commands.
9. Update documentation if the implementation changes an established behavior.
10. Report what changed and any unresolved architectural issue.

Do not redesign the system merely because another pattern seems more fashionable.

Do not create new domains, major infrastructure, or new architectural patterns without justification.

---

## 15. Architecture Conflict Protocol

If code, a user request, or an implementation idea conflicts with an existing finalized ADR or architecture document:

1. Stop before silently changing the architecture.
2. Identify the exact conflict.
3. Explain the impact.
4. Prefer the documented architecture.
5. If the new requirement genuinely requires an architectural change, propose an ADR update rather than hiding the change inside code.

An AI agent must never silently rewrite architectural decisions.

---

## 16. Documentation Protocol

Architecture changes require documentation updates.

Relevant documentation should contain:
- Purpose
- Business rules
- Entities
- Relationships
- State machines
- Permissions
- Events
- Analytics implications
- API implications
- Database implications
- Future extension considerations
- ADR references
- Cross-links to related documents

Do not duplicate technical architecture into Notion.

Notion is for:
- Roadmap
- Backlog
- Sprint
- Meetings
- Ideas
- KPIs
- Team
- Risks
- Releases
- Product decisions

GitHub is for:
- Architecture
- Database
- APIs
- Domain rules
- Source code
- Tests
- AI prompts/rules
- ADRs
- Engineering documentation

---

## 17. Change Classification

Classify changes before implementation:

### Type A — Implementation Change

No architecture change. Implement directly.

### Type B — Domain Rule Change

Changes business behavior. Update the relevant domain documentation and tests.

### Type C — Architecture Change

Changes domain boundaries, persistence strategy, API architecture, tenancy, security model, or other foundational decisions. Requires an ADR.

### Type D — Product/UX Change

Changes user-facing behavior without changing core architecture. Implement and update product documentation where appropriate.

---

## 18. Definition of Done

A feature is not done merely because code compiles.

Done means, as applicable:

- Requirements understood.
- Architecture respected.
- Tenant isolation verified.
- Authorization verified.
- Validation implemented.
- Business rules tested.
- State transitions tested.
- Database changes migrated safely.
- API behavior tested.
- Audit/events handled where required.
- Documentation updated when necessary.
- No secrets committed.
- Relevant tests pass.
- No known architectural conflict remains.

---

## 19. V1 Implementation Priority

Build in this general order unless an ADR or product decision changes the sequence:

1. Project foundation and environment configuration
2. Database foundation and migrations
3. Authentication and tenant resolution
4. Organization Engine
5. People Engine
6. Permissions
7. Assignment Engine
8. Project and Task domains
9. Work Logs and Meetings
10. Learning Engine
11. Evaluation Engine
12. Finance Engine
13. Audit and Domain Events
14. Analytics
15. Admin/product interfaces

Cross-cutting security, testing, validation, and observability should be built alongside each domain rather than postponed until the end.

---

## 20. Product Philosophy

DeVoc OS is intended to answer more than "who is employed here?".

It should eventually answer:
- Who is involved?
- In what capacity?
- Where are they assigned?
- What work are they doing?
- What outcomes are being produced?
- What evidence supports those outcomes?
- How are they being evaluated?
- How are they developing?
- What capacity do they have?
- Where are bottlenecks or overloads?
- How are people contributing across Business Units?
- What should management do next?

The long-term product is a contribution and operating system, not merely an HR database.

---

## 21. AI Coding Agent Master Instruction

You are an implementation agent for DeVoc OS.

Your job is to implement requirements **within the established architecture**, not to redesign the product from scratch.

Before writing code, understand the relevant domain and existing repository structure.

When a requirement is ambiguous, choose the smallest enterprise-safe behavior consistent with the architecture and document the assumption. Do not stop the entire implementation for minor ambiguity.

When ambiguity affects a foundational architectural decision, stop and flag it.

When implementing:

- Preserve tenant isolation.
- Preserve domain boundaries.
- Preserve auditability.
- Preserve historical records.
- Preserve explicit state transitions.
- Preserve contextual authorization.
- Prefer transactions for multi-step mutations.
- Prefer domain services over controller logic.
- Prefer reusable primitives over duplicated logic.
- Prefer simple solutions over premature abstraction.
- Add tests for important behavior.
- Update documentation when behavior or architecture changes.

Never:

- Invent a second source of truth.
- Bypass authorization for convenience.
- Bypass tenant filtering.
- Put business rules directly in controllers.
- Hard-code current DeVoc Business Units as permanent system limitations.
- Treat founders as a separate technical subsystem.
- Create a special work-tracking system only for founders.
- Make evidence mandatory for every work log.
- Replace qualitative evaluation with mandatory numeric scores.
- Silently change an ADR.
- Delete historical evaluations, payments, assignments, or audit records merely to simplify implementation.
- Introduce microservices without an explicit architectural decision.

If an implementation conflicts with this file or a finalized architecture document, **stop, report the conflict, and request/prepare the appropriate architecture change instead of silently redesigning the system.**

---

## 22. Expected Development Workflow

Use this workflow for meaningful milestones:

**Discussion → Architecture → Review → Finalize → Update Documentation → Implement → Test → Commit → Next Milestone**

The AI agent should keep changes focused and reviewable.

For large work, prefer incremental commits grouped by domain or milestone rather than one enormous change.

Commit messages should clearly describe the change, for example:

- `feat(people): add person and role management`
- `feat(assignments): add generic assignment lifecycle`
- `feat(work): add work log tracking`
- `fix(auth): enforce tenant isolation`
- `docs(architecture): document evaluation decisions`
- `test(assignments): cover capacity conflict rules`

---

## 23. Final Rule

**Build DeVoc OS as a coherent enterprise system, not as a collection of disconnected CRUD screens.**

Every major feature should fit into the backbone:

**Person → Role → Assignment → Work → Outcome → Evaluation → Analytics**

while remaining connected to the appropriate Organization, Learning, Project, Finance, Permission, Audit, and Event domains.
