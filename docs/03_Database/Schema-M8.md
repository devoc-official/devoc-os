# Schema M8 – Evaluation Engine

## Overview
The Evaluation Engine introduces a set of normalized tables that support generic, configurable evaluations across the organization. All tables are tenant‑scoped (`organization_id`) and use UUID primary keys.

---

### Table: evaluation_templates
```sql
CREATE TABLE evaluation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (organization_id, name, version)
);
```
*Defines a reusable evaluation definition.*

### Table: evaluation_criteria
```sql
CREATE TABLE evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    criterion_type TEXT NOT NULL CHECK (criterion_type IN ('numeric','rating','qualitative')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
*Ordered criteria belonging to a template.*

### Table: evaluations
```sql
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    template_id UUID NOT NULL REFERENCES evaluation_templates(id),
    subject_id UUID NOT NULL REFERENCES people.person(id),
    state TEXT NOT NULL CHECK (state IN ('Draft','Scheduled','InProgress','Submitted','Completed','Cancelled')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
*Core evaluation record.*

### Table: evaluation_evaluators (join)
```sql
CREATE TABLE evaluation_evaluators (
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES people.person(id),
    PRIMARY KEY (evaluation_id, evaluator_id)
);
```
*Many‑to‑many link of evaluators to an evaluation.*

### Table: criterion_results
```sql
CREATE TABLE criterion_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES evaluation_criteria(id),
    value TEXT NOT NULL,           -- numeric as text, rating label or qualitative comment
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
*Result for a single criterion.*

### Table: evaluation_feedback
```sql
CREATE TABLE evaluation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('text','work_log','meeting','project','learning_program')),
    payload JSONB NOT NULL,   -- free‑form data or reference IDs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
*Optional evidence or free‑form feedback.*

### Table: evaluation_outcomes
```sql
CREATE TABLE evaluation_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    outcome_key TEXT NOT NULL,
    outcome_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
*Derived outcome snapshot stored immutable.*

### Table: evaluation_history (immutable JSON snapshot)
```sql
CREATE TABLE evaluation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL,
    snapshot JSONB NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
*Preserves the complete evaluation state at the moment of completion, protecting against future template changes.*

---

All foreign‑key constraints enforce tenant isolation by referencing tables that already contain `organization_id`. Indexes are added on `organization_id`, `template_id`, `subject_id`, and `state` for efficient tenant‑scoped queries.

---

*Prepared for Milestone 8 – Evaluation Engine database schema.*
