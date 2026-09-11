# Database Architecture & Schema — M5 Work Engine

## Principles

- PostgreSQL
- UUID primary keys
- UTC timestamps
- Tenant-owned records carry `organization_id`
- Referential integrity through real foreign keys where relationships are concrete
- Polymorphic targets use resolver validation, not generic foreign keys
- Transactions for lifecycle/multi-record mutations
- No automatic soft-delete policy

## Tables

### work_categories

- id UUID PK
- organization_id UUID FK organizations
- name
- code
- description nullable
- active boolean
- metadata JSONB
- created_at
- updated_at

Unique: `(organization_id, code)`.

### work_records

- id UUID PK
- organization_id UUID FK organizations
- person_id UUID FK people
- target_type nullable
- target_id nullable
- assignment_id nullable UUID FK assignments
- category_id UUID FK work_categories
- title
- description nullable
- status
- started_at nullable timestamptz
- ended_at nullable timestamptz
- duration_minutes integer
- created_by_person_id UUID FK people
- metadata JSONB
- created_at
- updated_at

Constraints:

- duration_minutes > 0
- ended_at > started_at when both exist
- target_type and target_id are both null or both present
- organization ownership must be enforced by service/transaction checks in addition to FKs where composite tenant relationships are required.

### work_evidence

- id UUID PK
- organization_id UUID FK organizations
- work_record_id UUID FK work_records
- evidence_type
- title nullable
- reference_uri nullable
- provider nullable
- external_id nullable
- description nullable
- metadata JSONB
- created_at
- updated_at

Evidence should contain a usable reference or structured provider/external identifier as appropriate.

### outcomes

- id UUID PK
- organization_id UUID FK organizations
- outcome_type
- title
- description nullable
- measurable_value nullable
- measurable_unit nullable
- metadata JSONB
- created_by_person_id UUID FK people
- created_at
- updated_at

### work_outcomes

- work_record_id UUID FK work_records
- outcome_id UUID FK outcomes
- contribution_type nullable
- contribution_value nullable
- metadata JSONB
- created_at

Primary key: `(work_record_id, outcome_id)`.

## Indexes

Create only indexes justified by expected access patterns, including:

- work_records `(organization_id, person_id, started_at)`
- work_records `(organization_id, status)`
- work_records `(organization_id, target_type, target_id)`
- work_records `(organization_id, assignment_id)`
- work_records `(organization_id, category_id)`
- work_evidence `(organization_id, work_record_id)`
- work_outcomes `(outcome_id)`

## Tenant integrity

Application services must validate organization ownership for people, assignments, categories, targets, evidence, and outcomes. Cross-tenant references are rejected.

## Deletion

Do not cascade-delete historical work records or outcomes through normal application behavior. Historical contribution data is accountability data.

## Migration

M5 migration is expected as `005_work_m5_schema.sql`, following the existing sequential migration convention.
