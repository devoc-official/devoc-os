-- Milestone 8 Schema: Evaluation Engine

CREATE TABLE IF NOT EXISTS evaluation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name, version)
);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    criterion_type TEXT NOT NULL CHECK (criterion_type IN ('numeric', 'rating', 'qualitative')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES evaluation_templates(id),
    subject_id UUID NOT NULL REFERENCES people(id),
    state TEXT NOT NULL CHECK (state IN ('Draft', 'Scheduled', 'InProgress', 'Submitted', 'Completed', 'Cancelled')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluation_evaluators (
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    PRIMARY KEY (evaluation_id, evaluator_id)
);

CREATE TABLE IF NOT EXISTS criterion_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES evaluation_criteria(id),
    value TEXT NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('text', 'work_log', 'meeting', 'project', 'learning_program')),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluation_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    outcome_key TEXT NOT NULL,
    outcome_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL,
    snapshot JSONB NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_templates_org ON evaluation_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_org ON evaluations(organization_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_template ON evaluations(template_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_subject ON evaluations(subject_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_state ON evaluations(state);
CREATE INDEX IF NOT EXISTS idx_criterion_results_evaluation ON criterion_results(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_feedback_evaluation ON evaluation_feedback(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_outcomes_evaluation ON evaluation_outcomes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_history_evaluation ON evaluation_history(evaluation_id);
