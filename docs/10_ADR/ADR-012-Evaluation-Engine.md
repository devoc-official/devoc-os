# ADR-012 – Evaluation Engine

**Status:** Proposed (to be reviewed)

## Context
DeVoc OS requires a unified mechanism for assessing people, projects, and other organizational objects. Previously, each domain (People, Learning, Work, etc.) introduced ad‑hoc review concepts, leading to duplicated tables, inconsistent scoring, and fragmented audit trails.

## Decision
Introduce a **single, generic Evaluation Engine** (M8) that:
1. Allows configurable **Evaluation Templates** defining ordered, weighted **Criteria**.
2. Supports multiple **evaluators** per evaluation, with explicit subject/evaluator roles.
3. Stores **criterion results** (numeric, rating, qualitative) and optional **feedback/evidence** referencing existing entities.
4. Produces immutable **Outcome** snapshots and a full **EvaluationHistory** JSON record at completion.
5. Enforces a **state machine** (Draft → Scheduled → InProgress → Submitted → Completed) with controlled cancellation/reopen paths.
6. Reuses the existing **tenant isolation**, **authorization**, **audit**, and **event** infrastructure.
7. Keeps the engine **agnostic** of evaluation type – specific use‑cases (Founder Self‑Review, Employee Performance Review, etc.) are just template configurations.

## Consequences
* **Positive**:
  - Reduces schema duplication across domains.
  - Guarantees consistent authorization and audit handling.
  - Enables future evaluation types without schema changes.
  - Aligns with the overall modular monolith architecture.
* **Negative**:
  - Introduces a new abstraction that must be understood by downstream developers.
  - Existing code that previously accessed domain‑specific review tables will need migration (out of scope for this milestone).

## Alignment with Existing Architecture
* **Tenant Isolation** – All tables contain `organization_id`; cross‑tenant accesses return 404 (as per existing pattern).
* **Authorization** – Leverages the contextual `Role + Business Unit + Team + Project` model; evaluators need explicit permission on the subject’s context.
* **Audit/Event** – Uses `AuditService` and `EventBus` already present; new events `EvaluationCreated`, `EvaluationStateChanged`, etc.
* **Domain Boundaries** – Evaluation Engine stays separate but interoperates with People, Assignments, Projects, Work, Meetings, and Learning via foreign keys and reference IDs.
* **No Duplication** – Learning reviews remain in the Learning Engine; Evaluation focuses on performance/effectiveness, not learning road‑map decisions.

## Open Questions
- How many evaluators per evaluation is the maximum? (Currently unbounded; can be constrained by template configuration if needed.)
- Should outcome calculations be pluggable (e.g., custom scripts) or fixed weighting? (Initial design uses weighted sum; extensibility can be added later via ADR.)

---
*Prepared as part of Milestone 8 – Evaluation Engine architecture.*
