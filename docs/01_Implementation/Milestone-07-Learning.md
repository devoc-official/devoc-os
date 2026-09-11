# Milestone 7 — Learning Engine

## Status

**Architecture frozen — implementation pending.**

## Objective

Introduce the Learning Engine for DeVoc Academy's review-driven, self-learning model. The engine manages learning programs, student enrollment, personalized learning plans, milestones, learning activities, assessments, reviews, and progression without hard-coding a single course structure.

## Domain boundary

M7 owns structured learning journeys. People remains the identity source. Assignments remain the responsibility/context engine. Projects and Tasks remain M4. Work remains M5. Meetings remain M6. Evaluation/Performance Reviews are M8. Finance/fees are M9.

## Core model

`Person(Student) → Learning Program Enrollment → Learning Plan → Milestones → Learning Activities / Projects / Assessments → Reviews → Progression`

A student may have multiple learning enrollments over time, but each enrollment belongs to one organization and one Learning Program.

## Learning Program

A configurable organization-scoped program/template describing a learning journey.

Initial examples may include course/program tracks such as software development, but technology stack and curriculum are data, not code.

Program lifecycle:

- draft
- active
- archived

Archived programs cannot accept new enrollments.

## Enrollment

An enrollment connects a Person to a Learning Program and represents the student's journey.

Initial lifecycle:

- pending
- active
- paused
- completed
- withdrawn
- cancelled

Controlled transitions only. Paused enrollments can resume. Completed/withdrawn/cancelled are terminal.

Enrollment stores admission/start/completion dates, current progress metadata, and optional assigned Academy Head/mentor/reviewer references through existing people/assignment concepts.

## Learning Plan

Each active enrollment has a personalized Learning Plan. The plan is derived from the program structure but may be adapted through authorized reviews.

A plan may contain ordered milestones. Students cannot transfer a Learning Plan to another enrollment.

## Milestones

A Milestone is a meaningful stage of the learning journey. Examples: Foundation, Core Development, Project, Assessment, Internship Preparation.

Milestone lifecycle:

- pending
- active
- completed
- skipped

Progression is controlled; skipped/repeated milestones are explicit actions rather than arbitrary status edits.

## Learning activities

Activities are the flexible units inside milestones. They can represent learning content, practice, documentation, projects, or assessments through a configurable activity type.

An activity may optionally reference an existing Project, Task, or Assessment through typed relationships. Do not create duplicate project/task entities.

## Reviews

Reviews are a core Learning Engine concept and are separate from M8 performance evaluations.

A Learning Review records a point-in-time review of learning progress and may:

- assess milestone/activity progress
- record qualitative feedback
- change the roadmap
- repeat or skip a learning unit
- pause or resume learning
- recommend a different technology stack/path
- set follow-up actions

Review cadence is configurable per enrollment/program; typical cadence is weekly or every two weeks. Multiple reviews may occur in a period when needed.

Reviewers may be Academy Head, Mentor, Reviewer, or another authorized learning role. One primary mentor may be assigned to an enrollment; mentors can support multiple students.

## Assignments integration

Do not create mentor/reviewer membership tables that duplicate M3. Use Assignment Engine target resolution for contextual mentor/reviewer/trainer responsibilities where appropriate.

Learning Program and Student/Enrollment targets should be registered with the Assignment Engine if required by existing M3 target registration. M7 must use the existing Assignment model for responsibility rather than inventing another assignment mechanism.

## Work integration

M7 does not track time directly as a second work-log system. Actual learning/work contribution may be represented through M5 Work records when appropriate. A future student time-tracking feature must consume Work rather than create a parallel time engine.

## Assessment boundary

M7 owns learning assessment activities and assessment attempts/results needed to determine learning progress. Formal employee/student performance evaluation belongs to M8.

## Authorization and tenancy

All records are organization-scoped. Reuse existing authentication and contextual authorization. Learning administration must respect Academy/BU/Team/Project context where applicable. Students may view/manage their own permitted journey data; mentors/reviewers manage assigned students; Academy Heads have broader Academy authority.

Cross-tenant access must return established non-leaking 404 behavior.

## Audit and events

Use the existing in-process audit/event infrastructure.

Initial events:

- learning_program.created
- learning_program.updated
- learning_program.archived
- enrollment.created
- enrollment.activated
- enrollment.paused
- enrollment.resumed
- enrollment.completed
- enrollment.withdrawn
- milestone.activated
- milestone.completed
- milestone.skipped
- activity.completed
- review.created
- review.roadmap_updated
- assessment.submitted
- assessment.completed

## Non-goals

M7 does not implement:

- employee performance reviews
- generic Evaluation Engine scoring
- payroll/fees/EMI/refunds/late fees
- analytics dashboards
- notifications
- AI tutoring/recommendations
- calendar/conferencing
- duplicate project/task/assignment/work engines

## Definition of Done

Architecture, schema, APIs, authorization, progression rules, assignment integration, tenant isolation, audit/events, migrations, tests, documentation, typecheck, build, migration reset, seed, and M1–M6 regression verification must pass before M7 is considered complete.
