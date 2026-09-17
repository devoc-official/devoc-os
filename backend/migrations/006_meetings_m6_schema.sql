-- ============================================================================
-- Milestone 6 — Meetings Engine Schema
-- ============================================================================

-- 1. Meeting Types (organization-scoped configurable meeting types)
CREATE TABLE IF NOT EXISTS meeting_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_types_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_meeting_types_org ON meeting_types(organization_id);

-- 2. Meetings (Core meeting entity)
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_type_id UUID NOT NULL REFERENCES meeting_types(id),
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    scheduled_start_at TIMESTAMPTZ NOT NULL,
    scheduled_end_at TIMESTAMPTZ NOT NULL,
    actual_start_at TIMESTAMPTZ,
    actual_end_at TIMESTAMPTZ,
    location_type VARCHAR(64) DEFAULT 'virtual',
    location_reference VARCHAR(512),
    organizer_person_id UUID NOT NULL REFERENCES people(id),
    created_by_person_id UUID NOT NULL REFERENCES people(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_meetings_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_meetings_org_status ON meetings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_org_scheduled ON meetings(organization_id, scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer ON meetings(organizer_person_id);

-- 3. Meeting Targets (Polymorphic contextual target: project, BU, dept, team)
CREATE TABLE IF NOT EXISTS meeting_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_targets_meeting UNIQUE (meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_targets_org_target ON meeting_targets(organization_id, target_type, target_id);

-- 4. Meeting Participants (Child participant records)
CREATE TABLE IF NOT EXISTS meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id),
    participant_type VARCHAR(64) NOT NULL DEFAULT 'required',
    response_status VARCHAR(32) NOT NULL DEFAULT 'invited',
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_participants_meeting_person UNIQUE (meeting_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_org_meeting ON meeting_participants(organization_id, meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_person ON meeting_participants(person_id);

-- 5. Meeting Agenda Items (Ordered agenda items)
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 1,
    owner_person_id UUID REFERENCES people(id),
    duration_minutes INT,
    status VARCHAR(32) NOT NULL DEFAULT 'planned',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_meeting_pos ON meeting_agenda_items(meeting_id, position);

-- 6. Meeting Notes / Minutes
CREATE TABLE IF NOT EXISTS meeting_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    prepared_by_person_id UUID REFERENCES people(id),
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    finalized_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_notes_meeting UNIQUE (meeting_id)
);

-- 7. Meeting Decisions
CREATE TABLE IF NOT EXISTS meeting_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    decision_text TEXT NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by_person_id UUID REFERENCES people(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting ON meeting_decisions(meeting_id);

-- 8. Meeting Action Items
CREATE TABLE IF NOT EXISTS meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_person_id UUID REFERENCES people(id),
    due_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_task ON meeting_action_items(task_id);
