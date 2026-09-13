# Database Architecture & Schema — M10 Audit & Events

## Migration Reservation

`010_audit_events_m10_schema.sql`

All tables use UUID primary keys (`gen_random_uuid()`), tenant scoping (`organization_id`), UTC timestamps (`TIMESTAMPTZ`), strict foreign key references, and indexes consistent with M1–M9.

---

## DDL Schema Specifications

### 1. Hardened Table: `audit_logs`

Refines the initial M1 `audit_logs` schema to support `actor_person_id`, `before_state`, `after_state`, `correlation_id`, `source_module`, `ip_address`, and `user_agent`:

```sql
-- Hardening schema migration for audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_person_id UUID REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_state JSONB NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_state JSONB NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source_module VARCHAR(50) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT NULL;
```

Canonical full table specification:
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NULL,
    before_state JSONB NULL,
    after_state JSONB NULL,
    payload JSONB NULL,
    request_id VARCHAR(100) NULL,
    correlation_id VARCHAR(100) NULL,
    source_module VARCHAR(50) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Table: `event_outbox`

Stores transactional outbox events committed atomically alongside domain entity mutations:

```sql
CREATE TABLE IF NOT EXISTS event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_name VARCHAR(150) NOT NULL,
    event_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_person_id UUID NULL REFERENCES people(id) ON DELETE SET NULL,
    request_id VARCHAR(100) NULL,
    correlation_id VARCHAR(100) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispatched', 'Failed', 'DeadLettered')),
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. Table: `event_consumer_records`

Guarantees consumer idempotency and prevents duplicate event execution:

```sql
CREATE TABLE IF NOT EXISTS event_consumer_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES event_outbox(id) ON DELETE CASCADE,
    consumer_name VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Processed' CHECK (status IN ('Processed', 'Failed')),
    error_message TEXT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_event_consumer UNIQUE (event_id, consumer_name)
);
```

### 4. Table: `event_registry`

System catalog of registered domain events and version contracts:

```sql
CREATE TABLE IF NOT EXISTS event_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(150) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    source_module VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_event_version UNIQUE (event_name, version)
);
```

---

## Indexing Strategy

Optimizes high-volume audit filtering, tenant queries, and outbox polling:

```sql
-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id);

-- Outbox indexes
CREATE INDEX IF NOT EXISTS idx_event_outbox_pending ON event_outbox(status, scheduled_at) WHERE status = 'Pending';
CREATE INDEX IF NOT EXISTS idx_event_outbox_org ON event_outbox(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_outbox_event ON event_outbox(event_name);

-- Consumer record index
CREATE INDEX IF NOT EXISTS idx_event_consumer_event ON event_consumer_records(event_id);
```

---
*Prepared for Milestone 10 – Audit & Events Database Schema.*
