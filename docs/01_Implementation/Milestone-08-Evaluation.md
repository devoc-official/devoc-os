# Milestone 08 – Evaluation Engine

## Overview
The Evaluation Engine provides a **generic, configurable evaluation framework** that can be reused for all evaluation use‑cases (founder self‑review, employee performance, internship, freelancer, trainer, mentor, developer, team, project, etc.). It avoids proliferating separate review subsystems.

## Core Model
```
Person ──► Evaluation ◄──► Template
                │                ├─► Criteria (ordered, weighted)
                │                └─► Outcomes (configurable)
                ├─► CriterionResult (numeric/rating/qualitative)
                ├─► Feedback / Evidence (links to existing entities)
                └─► Lifecycle State
```
* **Evaluation** – central entity linking a *subject* Person (or other domain target) with one or more *evaluator* Persons.
* **Template** – defines the shape of an evaluation: set of **Criteria**, weighting, scoring rules, required evidence, and possible **Outcomes**.
* **CriterionResult** – result for a single criterion (numeric rating, qualitative label, or free‑form text).
* **Feedback / Evidence** – optional attachments referencing existing entities (WorkLog, Meeting, LearningProgram, Project, etc.) without duplicating data.
* **Outcome** – derived from the aggregate of criterion results; stored as a snapshot to preserve historical meaning.

## Supported Evaluation Types (Configurations)
| Evaluation Type | Intended Template Example |
|-----------------|---------------------------|
| Founder Self‑Review | Self‑evaluation template with strategic criteria |
| Employee Performance Review | Manager‑driven template with KPIs |
| Internship Review | Mentor‑guided template |
| Freelancer Review | Contract‑based template |
| Trainer Review | Training effectiveness template |
| Mentor Review | Mentorship impact template |
| Developer Review | Code quality & delivery criteria |
| Team Review | Team health & collaboration criteria |
| Project Review | Project outcome & delivery criteria |

All are **configuration records**, not separate engines.

## Lifecycle State Machine
```
Draft → Scheduled → InProgress → Submitted → Completed
                     ↑            ↓
                Cancelled   (Reopen → Draft)   // optional controlled correction
```
* **Draft** – created by a template owner or evaluator, not yet visible to subject.
* **Scheduled** – evaluation is planned (e.g., periodic review).
* **InProgress** – evaluator(s) are actively providing results.
* **Submitted** – evaluator(s) have completed; subject can view.
* **Completed** – final, immutable snapshot.
* **Cancelled** – terminal; no further actions.
* **Reopen** – allowed only via explicit “correction” operation defined in the template (rare).

## Authorization Model
Reuse existing contextual model **Role + Business Unit + Team + Project**.
* Evaluator must have a role that grants evaluation rights **within the target’s context** (e.g., a Mentor role does not automatically allow evaluation of any employee).
* Permissions are checked per operation (create, update, submit, approve).
* Audited actions record evaluator, subject, organization, and template IDs.

## Tenant Isolation
All evaluation entities carry `organization_id`. Validation ensures that subject, evaluator, template, target, and any evidence belong to the same organization. Cross‑tenant queries return **404**.

## Audit & Events
* **EvaluationCreated**, **EvaluationStateChanged**, **CriterionResultAdded**, **FeedbackAttached**, **EvaluationCompleted** events are emitted.
* Events are routed through existing in‑process event bus and persisted via the audit tables.

## Database Schema (M8) – Overview (see `docs/03_Database/Schema-M8.md`)
* `evaluations` – core record, UUID PK, organization_id, subject_id, template_id, state, timestamps.
* `evaluation_templates` – definition, versioned, organization scoped.
* `evaluation_criteria` – linked to template, weight, type (numeric, qualitative), description.
* `criterion_results` – per evaluation, linked to criteria, value, comments.
* `evaluation_feedback` – optional free‑form or reference IDs (work_log_id, meeting_id, etc.).
* `evaluation_outcomes` – snapshot of derived outcome values.
* Historical tables (`evaluation_history`) capture full JSON snapshot of an evaluation at completion.

## API Contracts (M8) – Overview (see `docs/04_API/API-Contracts-M8.md`)
All endpoints under `/api/v1/evaluations` follow the standard envelope:
```json
{"data": {...}, "meta": {}}
```
### Templates
* `GET /templates` – list templates.
* `POST /templates` – create (admin/owner role).
* `PUT /templates/:id` – update (versioning).
* `DELETE /templates/:id` – soft‑delete.
### Evaluations
* `POST /evaluations` – create (Draft).
* `GET /evaluations/:id` – retrieve (subject/evaluator access).
* `PATCH /evaluations/:id` – update mutable fields in Draft/InProgress.
* `POST /evaluations/:id/submit` – transition to Submitted.
* `POST /evaluations/:id/cancel` – Cancel.
* `POST /evaluations/:id/complete` – mark Completed (system‑validated).
* Sub‑resources for criteria results, feedback, and outcomes.

All requests validate **tenant ID** from auth token against payload IDs.

## Integration Touchpoints
* **People** – subjects and evaluators are Person records.
* **Assignments** – may provide context (evaluator assigned to a team/project).
* **Projects/Tasks/Work/Meetings** – can be referenced as evidence.
* **Learning** – stays separate; Learning reviews are not evaluation records.
* **Permissions** – reuse `PermissionService` for contextual checks.
* **Audit** – `AuditService` logs every state transition.

## Non‑Goals
* Payroll, compensation, promotion workflows.
* Recruitment pipelines.
* Analytics dashboards, notification services.
* AI‑based scoring, calendar integrations.
* Duplicate Learning Review functionality.

---
*Prepared for Milestone 8 – Evaluation Engine architecture.*
