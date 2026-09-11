# Database Architecture & Schema — M7 Learning

## Migration

`007_learning_m7_schema.sql`

All tables use UUID primary keys, `organization_id`, UTC timestamps, foreign keys, sensible indexes, and tenant-safe constraints consistent with M1–M6.

## Tables

### learning_programs
- id
- organization_id
- name
- code
- description
- status (`draft`, `active`, `archived`)
- version
- metadata
- created_at
- updated_at

Unique: organization_id + code.

### learning_program_milestones
- id
- organization_id
- learning_program_id
- name
- description
- sequence
- required
- metadata
- created_at
- updated_at

### learning_activity_definitions
- id
- organization_id
- milestone_id
- title
- description
- activity_type
- sequence
- required
- metadata
- created_at
- updated_at

### learning_enrollments
- id
- organization_id
- person_id
- learning_program_id
- status (`pending`, `active`, `paused`, `completed`, `withdrawn`, `cancelled`)
- enrolled_at
- started_at
- expected_end_at
- completed_at
- withdrawn_at
- metadata
- created_at
- updated_at

### enrollment_milestones
- id
- organization_id
- enrollment_id
- source_milestone_id
- name/title
- description
- sequence
- status (`pending`, `active`, `completed`, `skipped`)
- started_at
- completed_at
- metadata
- created_at
- updated_at

### learning_activities
- id
- organization_id
- enrollment_milestone_id
- source_activity_id
- title
- description
- activity_type
- sequence
- status (`pending`, `active`, `completed`, `skipped`)
- started_at
- completed_at
- metadata
- created_at
- updated_at

### learning_activity_references
Typed optional links to existing domains.
- id
- organization_id
- learning_activity_id
- reference_type (`project`, `task`)
- reference_id
- metadata
- created_at

Use resolver validation; reference_id is not a generic FK.

### learning_reviews
- id
- organization_id
- enrollment_id
- reviewer_person_id
- review_type
- reviewed_at
- summary
- feedback
- progress_value (optional cached/observational value)
- metadata
- created_at
- updated_at

### learning_review_changes
- id
- organization_id
- review_id
- change_type
- target_type
- target_id
- previous_value
- new_value
- reason
- metadata
- created_at

### learning_assessments
- id
- organization_id
- enrollment_id
- learning_activity_id (optional)
- title
- description
- assessment_type
- status
- max_score
- metadata
- created_at
- updated_at

### learning_assessment_attempts
- id
- organization_id
- assessment_id
- person_id
- attempt_number
- status
- score
- qualitative_result
- submitted_at
- completed_at
- evidence_metadata
- metadata
- created_at
- updated_at

Unique: assessment_id + person_id + attempt_number.

## Integrity

Every child organization_id must match its parent organization. Person references must resolve within the request tenant. Program milestones/activities cannot cross programs. Enrollment milestones/activities cannot cross enrollments. Assessment attempts cannot cross the assessment's organization or person tenant.

Project/Task references use application-level target resolvers and must validate organization ownership.

Prefer terminal lifecycle states over deletion for historical learning records.

## Indexes

Index tenant and lookup paths including organization_id, enrollment_id, program_id, person_id, milestone parent IDs, review enrollment, assessment enrollment/activity, and reference type/reference ID. Avoid speculative indexes.
