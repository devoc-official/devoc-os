# ADR-011 — Learning Engine Architecture

## Status

**Accepted / Frozen**

## Context

DeVoc Academy uses a self-learning, review-driven model. Students follow personalized roadmaps rather than a fixed classroom schedule. Learning may be reviewed weekly or every two weeks, with Academy Head, Mentor, Reviewer, or other authorized people adapting the roadmap. Students may pause, repeat, skip, or change technology/path through explicit review decisions.

The Learning Engine must support this model while preserving the boundaries established by People, Assignment, Projects & Tasks, Work, and Meetings.

## Decision

Implement Learning as a dedicated domain in the modular monolith with:

- organization-scoped Learning Programs
- reusable program milestone/activity definitions
- student Enrollment records
- enrollment-specific personalized milestone/activity instances
- Learning Reviews with explicit historical roadmap changes
- learning Assessments and Attempts
- typed references to existing Projects/Tasks
- Assignment integration for mentor/reviewer/trainer responsibility
- existing authorization, audit, events, and tenant isolation

The reusable program definition is never mutated to personalize one student's journey. Personalization occurs on enrollment-specific records.

## Why enrollment-specific plans

A program is a reusable template. A student's plan is an individualized journey. Separating them prevents one student's roadmap changes from modifying other students and preserves historical progression.

## Why Learning Review is separate from Evaluation

Learning Review controls progression and roadmap adaptation. M8 Evaluation is a formal evaluation/performance domain. Combining them would make academic progression inseparable from employee/person performance assessment.

## Why Projects/Tasks are references

Projects and Tasks already exist as M4 domain entities. Learning activities may use them as practical work, but M7 must not create parallel project/task models.

## Why Assignment is reused

Mentor, reviewer, trainer, and related responsibilities are contextual assignments. M3 already provides this abstraction, so M7 must consume it instead of creating membership/assignee tables.

## Progression rules

Lifecycle state changes use explicit domain operations. Status cannot be arbitrarily overwritten through generic PATCH. Historical decisions are preserved through Review Change records.

## Tenant and security

Every tenant-owned record contains organization ownership and validates all related resources against the request tenant. Existing role + Business Unit + Team + Project contextual authorization remains authoritative.

## Events

M7 uses the existing in-process event infrastructure. Events are emitted for program lifecycle, enrollment lifecycle, milestone/activity progression, reviews, and assessments.

## Rejected alternatives

### One generic learning table
Rejected because it collapses reusable curriculum, individualized plans, reviews, and assessments into an unmaintainable polymorphic structure.

### Mutating program milestones per student
Rejected because student-specific changes would corrupt the reusable curriculum.

### Separate mentor/reviewer tables
Rejected because responsibility is already modeled by Assignment.

### Duplicate project/task entities
Rejected because M4 already owns those domains.

### Built-in calendar/class schedule system
Rejected for M7; DeVoc's learning model is self-learning and review-driven. Scheduling/calendar integrations are future extensions.

### AI-driven roadmap as authoritative
Rejected. AI may assist in a future milestone, but deterministic domain records and authorized human review remain authoritative.

## Consequences

M7 becomes the authoritative source for structured learning journeys and academic progression. M8 can later consume learning evidence without taking ownership of the learning plan. Analytics can later derive student growth/completion metrics from M7 records.

## Migration

M7 uses migration `007_learning_m7_schema.sql`.
