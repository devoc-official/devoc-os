# API Contracts – Evaluation Engine (M8)

All evaluation‑related endpoints live under the versioned base path `/api/v1/evaluations` and use the standard response envelope:
```json
{"data": {...}, "meta": {}}
```

## Templates Endpoints
| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/evaluation-templates` | List all active templates for the caller’s organization. Supports pagination & filtering by name. | Any authenticated user with read access to the organization. |
| `POST` | `/api/v1/evaluation-templates` | Create a new template (initial draft). Requires `template_owner` role or equivalent. | Template owners / admin. |
| `GET` | `/api/v1/evaluation-templates/:id` | Retrieve a single template, including its ordered criteria. | Owner, admin, or evaluator with explicit permission on the template. |
| `PUT` | `/api/v1/evaluation-templates/:id` | Update mutable fields (name, description, criteria ordering, weights). Version is incremented automatically. | Owner / admin. |
| `DELETE` | `/api/v1/evaluation-templates/:id` | Soft‑delete; the template becomes inactive but historical evaluations retain a snapshot. | Owner / admin. |

## Evaluations Endpoints
| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| `POST` | `/api/v1/evaluations` | Create a new evaluation in **Draft** state. Body must include `subject_id`, `template_id`, and optional `evaluator_ids`. | Evaluator(s) must be authorized for the given subject/context. |
| `GET` | `/api/v1/evaluations/:id` | Retrieve an evaluation, including its current state, criterion results (if any), feedback, and outcome (if completed). | Subject, any evaluator, or a user with view rights in the same organization. |
| `PATCH` | `/api/v1/evaluations/:id` | Update mutable fields while in **Draft** or **InProgress** (e.g., add/remove evaluator, modify criterion results). | Same as creation authorisation. |
| `POST` | `/api/v1/evaluations/:id/submit` | Transition from **InProgress** to **Submitted**. Validation runs (all required criteria filled, evidence attached). | All assigned evaluators must have submitted their results. |
| `POST` | `/api/v1/evaluations/:id/cancel` | Cancel the evaluation, moving to **Cancelled**. | Owner or admin. |
| `POST` | `/api/v1/evaluations/:id/complete` | Mark as **Completed**; system calculates outcomes based on weighted criteria and stores an immutable snapshot. | System service after successful validation; may be triggered automatically. |
| `GET` | `/api/v1/evaluations/:id/criteria` | List criterion results for the evaluation. | Subject or assigned evaluator. |
| `POST` | `/api/v1/evaluations/:id/criteria/:criterionId/result` | Submit or update a result for a specific criterion. | Assigned evaluator for that criterion. |
| `POST` | `/api/v1/evaluations/:id/feedback` | Attach free‑form feedback or reference existing entity IDs (work log, meeting, project, learning program). | Any evaluator or subject with view rights. |

## Query Helpers
* `GET /api/v1/evaluations?state=Draft&subjectId=...` – filter by state, subject, evaluator, date ranges.
* `GET /api/v1/evaluations/history/:id` – fetch the immutable JSON snapshot stored in `evaluation_history` (read‑only). Only accessible to auditors/admins.

## Validation & Tenant Isolation
* Every request is validated that `organization_id` derived from the JWT matches the `organization_id` stored on all referenced IDs (subject, template, evaluators, evidence).
* Mismatch results in **404 Not Found** to avoid leaking cross‑tenant existence.
* Input schemas enforce required fields, correct UUID format, and allow only configured `criterion_type` values.

## Errors
All error responses follow the common envelope:
```json
{"error": {"code": "EVAL_001", "message": "Evaluator not authorized for this subject", "details": {...}}, "meta": {}}
```
Specific error codes are documented in the API spec (e.g., `EVAL_001` – authorization, `EVAL_002` – state transition violation, `EVAL_003` – validation error).

---
*Prepared for Milestone 8 – Evaluation Engine API contracts.*
