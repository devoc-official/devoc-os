# Evaluation Domain – M8

## Core Entities
| Entity | Description |
|--------|-------------|
| **Evaluation** | Central record linking a *subject* (Person or other target) with one or more *evaluators* (Persons). Holds state, timestamps, organization_id, template reference, and links to outcomes.
| **EvaluationTemplate** | Configurable definition of an evaluation. Contains ordered **Criteria**, weighting, required evidence types, allowed evaluator roles, and possible **Outcomes**. Versioned per organization.
| **EvaluationCriterion** | Individual criterion belonging to a template. Defines type (numeric, rating, qualitative), weight, description, and optional validation rules.
| **CriterionResult** | Result submitted for a specific criterion in an evaluation. Stores value (number, rating label, or free‑form text) and optional comments.
| **EvaluationFeedback** | Free‑form feedback or evidence references (e.g., work log ID, meeting ID, learning program ID). Stores a JSON blob to reference existing entities without duplication.
| **EvaluationOutcome** | Snapshot of derived outcome after evaluation completion (e.g., "Promotion eligible", "Needs improvement"). Stored immutable to preserve historical meaning.
| **EvaluationHistory** | Immutable JSON snapshot of the entire evaluation at the moment of completion, ensuring that template changes do not affect historical records.

## Relationships
* `Evaluation` **belongsTo** `EvaluationTemplate` (template_id).
* `Evaluation` **hasMany** `CriterionResult` (evaluation_id → criterion_id).
* `Evaluation` **hasMany** `EvaluationFeedback` (evaluation_id).
* `Evaluation` **hasOne** `EvaluationOutcome` (evaluation_id).
* `Evaluation` **references** `Person` for `subject_id` and `evaluator_id` (many‑to‑many via a join table `evaluation_evaluators`).
* All entities include `organization_id` for tenant isolation.

## State Machine
The lifecycle follows the states defined in the Milestone‑08 implementation overview: `Draft`, `Scheduled`, `InProgress`, `Submitted`, `Completed`, `Cancelled`, with optional `Reopen` for controlled corrections.

## Cross‑Domain Integration
* **People** – provides `Person` records for subject and evaluators.
* **Assignments** – can be used to infer evaluator authority based on assigned roles in the target context.
* **Projects/Tasks/Work/Meetings** – can be referenced as evidence via `EvaluationFeedback`.
* **Learning** – remains separate; learning reviews are not stored as evaluations.
* **Permissions** – reuse existing `PermissionService` to evaluate contextual rights.
* **Audit & Events** – hook into existing services to emit lifecycle events.

---
*Prepared as part of Milestone 8 – Evaluation Engine architecture.*
