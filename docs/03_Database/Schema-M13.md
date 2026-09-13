# Database Architecture & Schema — M13 Recruitment Engine

## Migration Reservation

`013_recruitment_m13_schema.sql`

*(Architecture reservation only — no migration files are implemented in this architecture milestone).*

All tables follow established DeVoc OS database conventions:
* PostgreSQL UUID primary keys generated via `gen_random_uuid()`.
* Strict multi-tenant isolation via foreign keys to `organizations(id)` with cascading deletes.
* UTC timestamping (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`).
* Relational integrity enforced through explicit foreign keys, check constraints, and composite unique indexes.
* Non-destructive historical preservation: candidate profiles and application histories are never physically deleted.
* Transactional audit logging via M10 `audit_logs`.
* Outbox event staging via M10 `event_outbox`.

---

## 1. Table Reusability vs. New Entity Analysis

M13 is an upstream talent funnel engine that introduces 7 dedicated recruitment entities while delegating all operational execution to existing M1–M12 tables:

| Domain Area | Table Name | Status | Rationale |
|---|---|---|---|
| **Hiring Requisitions** | `recruitment_positions` | **NEW (M13)** | Configurable talent capacity requisitions tied to business structures |
| **Candidate Identity** | `recruitment_candidates` | **NEW (M13)** | External applicant profile before conversion into organizational personnel |
| **Pipeline Taxonomies** | `recruitment_pipeline_stages`| **NEW (M13)** | Tenant-scoped configurable recruitment milestone stages |
| **Application Funnel** | `recruitment_applications` | **NEW (M13)** | Candidate ↔ Position multi-stage application instances |
| **Stage History** | `recruitment_application_stages`| **NEW (M13)** | Historical log of evaluations, screenings, and subsystem links |
| **Candidate Trials** | `recruitment_trials` | **NEW (M13)** | Time-boxed operational trial periods linking assignments and reviews |
| **Employment Offers** | `recruitment_offers` | **NEW (M13)** | Compensation proposals and terms extended prior to hiring |
| **Organization Structure**| `business_units`, `departments`, `teams` | **REUSED (M1)** | Target organizational units for positions |
| **Personnel & Roles** | `people`, `roles`, `employments` | **REUSED (M2)** | Target roles, hiring managers, interviewers, and converted hire records |
| **Assignments** | `assignments` | **REUSED (M3)** | Project/task assignments during candidate trials |
| **Work Records** | `work_records` | **REUSED (M5)** | Real operational work logging during candidate trials |
| **Meeting Logistics** | `meetings` | **REUSED (M6)** | Interview scheduling and panel logistics |
| **Formal Evaluations** | `evaluations`, `evaluation_templates` | **REUSED (M8)** | Structured scorecards, assessments, and trial evaluations |
| **Financial Commitments**| `financial_obligations` | **REUSED (M9)** | Scheduled compensation budgets or sign-on commitments |
| **Audit & Outbox** | `audit_logs`, `event_outbox` | **REUSED (M10)** | Administrative audit records and transactional event dispatch |
| **Analytics Metrics** | `analytics_metrics` | **REUSED (M11)** | Metrics configuration and snapshot storage for recruitment KPIs |

---

## 2. DDL Schema Specifications

### 2.1 Table: `recruitment_positions`

Stores approved hiring requisitions and headcount goals.

```sql
CREATE TABLE IF NOT EXISTS recruitment_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    business_unit_id UUID NULL REFERENCES business_units(id) ON DELETE SET NULL,
    department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
    team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
    target_role_id UUID NULL REFERENCES roles(id) ON DELETE SET NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'full_time',
    openings_count INT NOT NULL DEFAULT 1 CHECK (openings_count >= 1),
    hired_count INT NOT NULL DEFAULT 0 CHECK (hired_count >= 0),
    hiring_manager_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    recruiter_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    description TEXT NULL,
    requirements TEXT NULL,
    min_salary NUMERIC(12, 2) NULL CHECK (min_salary IS NULL OR min_salary >= 0),
    max_salary NUMERIC(12, 2) NULL CHECK (max_salary IS NULL OR max_salary >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    target_start_date DATE NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    opened_at TIMESTAMPTZ NULL,
    closed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_recruitment_positions_org_code UNIQUE (organization_id, code),
    CONSTRAINT chk_recruitment_positions_salary_range CHECK (
        min_salary IS NULL OR max_salary IS NULL OR min_salary <= max_salary
    ),
    CONSTRAINT chk_recruitment_positions_status CHECK (
        status IN ('draft', 'open', 'paused', 'closed', 'archived')
    ),
    CONSTRAINT chk_recruitment_positions_employment_type CHECK (
        employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'mentor', 'freelance')
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recruitment_positions_org_status 
    ON recruitment_positions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_positions_bu 
    ON recruitment_positions(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_positions_target_role 
    ON recruitment_positions(target_role_id);
```

---

### 2.2 Table: `recruitment_candidates`

Stores prospective applicant identities prior to personnel conversion.

```sql
CREATE TABLE IF NOT EXISTS recruitment_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'other',
    source_details TEXT NULL,
    resume_url TEXT NULL,
    portfolio_url TEXT NULL,
    skills TEXT[] NOT NULL DEFAULT '{}',
    profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    internal_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    converted_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_candidates_status CHECK (
        status IN ('active', 'hired', 'rejected', 'withdrawn', 'archived')
    ),
    CONSTRAINT chk_recruitment_candidates_source CHECK (
        source IN ('career_page', 'job_board', 'referral', 'campus', 'agency', 'internal', 'direct', 'other')
    )
);

-- Case-insensitive email index per organization
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_org_email 
    ON recruitment_candidates(organization_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_org_status 
    ON recruitment_candidates(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_converted_person 
    ON recruitment_candidates(converted_person_id);
```

---

### 2.3 Table: `recruitment_pipeline_stages`

Defines the ordered stages of an organization's hiring funnel.

```sql
CREATE TABLE IF NOT EXISTS recruitment_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    stage_type VARCHAR(50) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_recruitment_pipeline_stages_org_code UNIQUE (organization_id, stage_code),
    CONSTRAINT chk_recruitment_pipeline_stage_type CHECK (
        stage_type IN ('applied', 'screening', 'assessment', 'interview', 'trial', 'decision', 'offer', 'hired')
    )
);

CREATE INDEX IF NOT EXISTS idx_recruitment_pipeline_stages_org_order 
    ON recruitment_pipeline_stages(organization_id, order_index ASC);
```

---

### 2.4 Table: `recruitment_applications`

Represents an active or completed application of a candidate for a position.

```sql
CREATE TABLE IF NOT EXISTS recruitment_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES recruitment_positions(id) ON DELETE RESTRICT,
    current_stage_id UUID NOT NULL REFERENCES recruitment_pipeline_stages(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'applied',
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rejection_reason TEXT NULL,
    rejected_at TIMESTAMPTZ NULL,
    withdrawn_reason TEXT NULL,
    withdrawn_at TIMESTAMPTZ NULL,
    hired_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_applications_status CHECK (
        status IN ('applied', 'screening', 'assessment', 'interview', 'trial', 'decision', 'offered', 'hired', 'rejected', 'withdrawn')
    )
);

-- Unique index preventing duplicate active applications for the same position
CREATE UNIQUE INDEX IF NOT EXISTS uq_recruitment_applications_active_candidate_pos 
    ON recruitment_applications(candidate_id, position_id)
    WHERE status NOT IN ('rejected', 'withdrawn', 'hired');

CREATE INDEX IF NOT EXISTS idx_recruitment_applications_org_status 
    ON recruitment_applications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_pos_stage 
    ON recruitment_applications(position_id, current_stage_id);
```

---

### 2.5 Table: `recruitment_application_stages`

Tracks candidate progress, ratings, and external references at each stage.

```sql
CREATE TABLE IF NOT EXISTS recruitment_application_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES recruitment_pipeline_stages(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    evaluator_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    evaluation_id UUID NULL, -- Polymorphic reference to evaluations(id) in M8
    meeting_id UUID NULL,    -- Polymorphic reference to meetings(id) in M6
    score NUMERIC(5, 2) NULL CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    feedback TEXT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_app_stage_status CHECK (
        status IN ('scheduled', 'in_progress', 'passed', 'failed', 'skipped')
    )
);

CREATE INDEX IF NOT EXISTS idx_recruitment_app_stages_app 
    ON recruitment_application_stages(application_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_app_stages_eval 
    ON recruitment_application_stages(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_app_stages_meeting 
    ON recruitment_application_stages(meeting_id);
```

---

### 2.6 Table: `recruitment_trials`

Manages practical audition periods using real organizational assignments.

```sql
CREATE TABLE IF NOT EXISTS recruitment_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    objectives TEXT NULL,
    outcome_notes TEXT NULL,
    mentor_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    assignment_id UUID NULL, -- Polymorphic reference to assignments(id) in M3
    evaluation_id UUID NULL, -- Polymorphic reference to evaluations(id) in M8
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_trials_dates CHECK (start_date <= end_date),
    CONSTRAINT chk_recruitment_trials_status CHECK (
        status IN ('scheduled', 'active', 'completed', 'terminated')
    )
);

-- Partial index ensuring only one active trial per application
CREATE UNIQUE INDEX IF NOT EXISTS uq_recruitment_trials_active_app 
    ON recruitment_trials(application_id) 
    WHERE status IN ('scheduled', 'active');

CREATE INDEX IF NOT EXISTS idx_recruitment_trials_org_status 
    ON recruitment_trials(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_trials_assignment 
    ON recruitment_trials(assignment_id);
```

---

### 2.7 Table: `recruitment_offers`

Stores employment compensation proposals and their acceptance lifecycle.

```sql
CREATE TABLE IF NOT EXISTS recruitment_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES recruitment_positions(id) ON DELETE RESTRICT,
    proposed_role_id UUID NULL REFERENCES roles(id) ON DELETE SET NULL,
    employment_type VARCHAR(50) NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL CHECK (base_salary >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    compensation_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
    proposed_start_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    issued_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    responded_at TIMESTAMPTZ NULL,
    response_notes TEXT NULL,
    terms_conditions TEXT NULL,
    financial_obligation_id UUID NULL, -- Polymorphic reference to financial_obligations(id) in M9
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recruitment_offers_status CHECK (
        status IN ('draft', 'issued', 'accepted', 'rejected', 'rescinded', 'expired')
    ),
    CONSTRAINT chk_recruitment_offers_freq CHECK (
        compensation_frequency IN ('hourly', 'monthly', 'annual', 'milestone')
    )
);

-- Partial unique index ensuring only one active (draft/issued) offer per application
CREATE UNIQUE INDEX IF NOT EXISTS uq_recruitment_offers_active_app 
    ON recruitment_offers(application_id) 
    WHERE status IN ('draft', 'issued');

CREATE INDEX IF NOT EXISTS idx_recruitment_offers_org_status 
    ON recruitment_offers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recruitment_offers_obligation 
    ON recruitment_offers(financial_obligation_id);
```
