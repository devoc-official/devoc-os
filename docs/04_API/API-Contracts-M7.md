# REST API Architecture & Contracts — M7 Learning

## Base

`/api/v1/organizations/:orgId`

Existing authentication, tenant resolution, authorization, response envelopes, errors, audit, and request IDs remain authoritative.

## Learning Programs

- `POST /learning-programs`
- `GET /learning-programs`
- `GET /learning-programs/:programId`
- `PATCH /learning-programs/:programId`
- `POST /learning-programs/:programId/archive`
- `POST /learning-programs/:programId/milestones`
- `GET /learning-programs/:programId/milestones`
- `PATCH /learning-programs/:programId/milestones/:milestoneId`
- `POST /learning-programs/:programId/milestones/:milestoneId/activities`
- `GET /learning-programs/:programId/milestones/:milestoneId/activities`

## Enrollments

- `POST /learning-enrollments`
- `GET /learning-enrollments`
- `GET /learning-enrollments/:enrollmentId`
- `PATCH /learning-enrollments/:enrollmentId`
- `POST /learning-enrollments/:enrollmentId/activate`
- `POST /learning-enrollments/:enrollmentId/pause`
- `POST /learning-enrollments/:enrollmentId/resume`
- `POST /learning-enrollments/:enrollmentId/complete`
- `POST /learning-enrollments/:enrollmentId/withdraw`
- `POST /learning-enrollments/:enrollmentId/cancel`

## Personalized plan

- `GET /learning-enrollments/:enrollmentId/milestones`
- `PATCH /learning-enrollments/:enrollmentId/milestones/:milestoneId`
- `POST /learning-enrollments/:enrollmentId/milestones/:milestoneId/activate`
- `POST /learning-enrollments/:enrollmentId/milestones/:milestoneId/complete`
- `POST /learning-enrollments/:enrollmentId/milestones/:milestoneId/skip`
- `GET /learning-enrollments/:enrollmentId/activities`
- `PATCH /learning-activities/:activityId`
- `POST /learning-activities/:activityId/complete`
- `POST /learning-activities/:activityId/skip`
- `POST /learning-activities/:activityId/references`

## Reviews

- `POST /learning-enrollments/:enrollmentId/reviews`
- `GET /learning-enrollments/:enrollmentId/reviews`
- `GET /learning-enrollments/:enrollmentId/reviews/:reviewId`
- `POST /learning-enrollments/:enrollmentId/reviews/:reviewId/changes`

Review changes are explicit and auditable; arbitrary silent roadmap mutation is prohibited.

## Assessments

- `POST /learning-enrollments/:enrollmentId/assessments`
- `GET /learning-enrollments/:enrollmentId/assessments`
- `GET /assessments/:assessmentId`
- `PATCH /assessments/:assessmentId`
- `POST /assessments/:assessmentId/attempts`
- `GET /assessments/:assessmentId/attempts`
- `POST /assessment-attempts/:attemptId/submit`
- `POST /assessment-attempts/:attemptId/complete`

## People/enrollment views

- `GET /people/:personId/learning-enrollments`

## Response contract

Success:

```json
{"data": {}, "meta": {}}
```

Error:

```json
{"error":{"code":"...","message":"...","details":...,"request_id":"..."}}
```

## Validation

- Program code unique within organization.
- Archived programs cannot receive new enrollments.
- Person/program/enrollment relationships are tenant-safe.
- Enrollment lifecycle transitions are controlled.
- Milestone/activity hierarchy cannot cross parents or tenants.
- Sequence values must be valid within their parent scope.
- Only authorized roles may modify another student's plan.
- Review changes must be attributable to an authorized reviewer.
- Assessment attempts belong to the same assessment/person organization.
- Project/Task references must pass existing target resolution and tenant checks.
- Cross-tenant resources return 404.

## Authorization

Reuse contextual authorization. Academy Heads have Academy-wide authority; mentors/reviewers act within assigned student/enrollment context; students access their own permitted records. No new parallel permission system is introduced.
