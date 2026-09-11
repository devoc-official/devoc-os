# Work Engine Domain

## Purpose

The Work domain records actual contribution performed by a person and connects that contribution to responsibility context, work targets, evidence, and outcomes.

## Boundary

- People identifies **who** performed work.
- Roles describe organizational responsibility.
- Assignments describe **where/how responsibility is applied**.
- Projects and Tasks describe **what initiative/action exists**.
- Work describes **what was actually done**.
- Evidence supports the claim that work occurred or produced a result.
- Outcomes describe resulting value or deliverables.

Work does not own Projects, Tasks, Assignments, Meetings, Learning, Evaluation, Finance, or Analytics.

## Work Record

One Work Record represents contribution by exactly one person.

Core attributes:

- id
- organization_id
- person_id
- target_type (optional)
- target_id (optional)
- assignment_id (optional)
- category_id
- title
- description
- status
- started_at
- ended_at
- duration_minutes
- created_by_person_id
- metadata
- created_at
- updated_at

Work may be targetless for legitimate internal/organizational contribution.

## Work categories

Categories are organization-scoped and configurable. Initial categories cover engineering, product, management, business development, sales, marketing, strategy, operations, academy, research, support, and other.

Founder contribution uses these same records and categories. There is no founder-specific entity.

## Target resolution

Target IDs are polymorphic and are not generic foreign keys. M5 uses a WorkTargetResolverRegistry following the M3 assignment target resolver pattern.

Initial target types:

- project
- task
- business_unit
- department
- team

A resolver validates target existence, assignability, and organization ownership.

## Assignment relationship

`assignment_id` is optional. If present, it identifies the responsibility context under which the work was performed. The referenced assignment must belong to the same organization and person and must be compatible with the target context.

Assignment and Work are intentionally separate concepts.

## Lifecycle

Statuses:

- draft
- submitted
- approved
- rejected
- cancelled

Allowed transitions:

- draft → submitted
- draft → cancelled
- submitted → approved
- submitted → rejected
- submitted → cancelled
- rejected → draft

Approved and cancelled are terminal.

## Evidence

Evidence belongs to a Work Record and is separately modeled. It may reference a GitHub commit/PR, document, URL, attachment, client feedback, student feedback, or another supporting artifact.

External data is represented through references and metadata rather than provider-specific columns on Work.

## Outcomes

Outcomes represent resulting deliverables, improvements, decisions, or measurable value. Work-to-outcome is many-to-many so contribution can be aggregated across work records and one work record can yield multiple outcomes.

## Security and tenancy

Every Work record is organization-owned. Person, assignment, and resolved target must belong to the same organization. Authorization uses existing Role + Business Unit + Team + Project context.

## Future integration

M6 Meetings may generate Tasks and Work. M7 Learning may use Work as evidence of practical activity. M8 Evaluation will consume Work, Evidence, and Outcomes as inputs. M11 Analytics will aggregate Work and Outcomes for contribution and organizational reporting.
