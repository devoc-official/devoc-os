# Learning Engine — Domain Model

## Purpose

The Learning Engine models DeVoc Academy's personalized, self-learning journey. It is review-driven rather than class-schedule-driven.

## Entities

### Learning Program
Organization-scoped reusable curriculum/program definition.

Fields conceptually include: id, organization_id, name, code, description, status, version, metadata, created_at, updated_at.

### Learning Program Milestone
Reusable ordered milestone definition belonging to a program.

Fields: id, organization_id, learning_program_id, name, description, sequence, required, metadata, timestamps.

### Learning Activity Definition
Configurable activity definition belonging to a milestone.

Fields: id, organization_id, milestone_id, title, description, activity_type, sequence, required, metadata, timestamps.

### Enrollment
Student's instance of participation in a program.

Fields: id, organization_id, person_id, learning_program_id, status, enrolled_at, started_at, expected_end_at, completed_at, withdrawn_at, metadata, timestamps.

### Enrollment Milestone
Personalized milestone instance copied from the program structure at enrollment/plan creation time. It permits roadmap adaptation without mutating the reusable program definition.

Fields: id, organization_id, enrollment_id, source_milestone_id, title, description, sequence, status, started_at, completed_at, metadata, timestamps.

### Learning Activity
Student-specific activity instance.

Fields: id, organization_id, enrollment_milestone_id, source_activity_id, title, description, activity_type, sequence, status, started_at, completed_at, metadata, timestamps.

### Learning Review
Point-in-time review of a student's learning journey. Stores reviewer, qualitative feedback, progress observations, and explicit roadmap changes/recommendations.

Fields: id, organization_id, enrollment_id, reviewer_person_id, review_type, reviewed_at, summary, feedback, progress_value, metadata, timestamps.

### Review Change
Structured record of a roadmap decision made during a review. Examples: activate, pause, repeat, skip, reorder, change technology/path, add/remove activity.

Keep the review as the historical source of the decision rather than silently rewriting history.

### Assessment
Learning assessment definition/instance owned by M7. It may be associated with an enrollment/activity and can optionally reference an existing Project or Task.

### Assessment Attempt
A student's submission/attempt for an assessment, including submitted/completed state, score where applicable, qualitative result, and evidence/reference metadata.

## Relationships

`Person → Enrollment → Learning Program`

`Learning Program → Program Milestones → Activity Definitions`

`Enrollment → Enrollment Milestones → Learning Activities`

`Enrollment → Learning Reviews → Review Changes`

`Learning Activity → Assessment → Assessment Attempt`

A learning activity may reference an existing Project or Task; M7 does not duplicate those domains.

## Roles and responsibility

Mentor, Reviewer, Trainer, Academy Head, and other contextual responsibilities are represented using People + Assignment. A primary mentor may be represented by an active assignment targeting the enrollment/student context. Multiple reviewers can review the same enrollment over time.

## Progression

Progress is derived from milestone/activity completion and assessment results rather than a single manually editable percentage being the source of truth.

The system may cache progress for performance, but the authoritative state remains the underlying learning records.

## Important distinction

Learning Review ≠ Performance Evaluation.

Learning Review answers: "How is this student progressing through the learning journey, and what should change next?"

M8 Evaluation answers: "How should a person's performance/capability be formally evaluated?"
