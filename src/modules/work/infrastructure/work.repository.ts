import { getDbClient, DbClient } from '../../../database/index.js';
import {
  WorkRecord,
  WorkEvidence,
  Outcome,
  WorkOutcome,
  WorkStatus,
} from '../domain/work.entity.js';

interface RawWorkRecordRow {
  id: string;
  organization_id: string;
  person_id: string;
  target_type: string | null;
  target_id: string | null;
  assignment_id: string | null;
  category_id: string;
  title: string;
  description: string | null;
  status: WorkStatus;
  started_at: Date | null;
  ended_at: Date | null;
  duration_minutes: number;
  created_by_person_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawWorkEvidenceRow {
  id: string;
  organization_id: string;
  work_record_id: string;
  evidence_type: string;
  title: string | null;
  reference_uri: string | null;
  provider: string | null;
  external_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawOutcomeRow {
  id: string;
  organization_id: string;
  outcome_type: string;
  title: string;
  description: string | null;
  measurable_value: string | null;
  measurable_unit: string | null;
  metadata: Record<string, unknown>;
  created_by_person_id: string;
  created_at: Date;
  updated_at: Date;
}

interface RawWorkOutcomeRow {
  work_record_id: string;
  outcome_id: string;
  contribution_type: string | null;
  contribution_value: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export class WorkRepository {
  private static mapRowToWorkRecord(row: RawWorkRecordRow): WorkRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      targetType: row.target_type,
      targetId: row.target_id,
      assignmentId: row.assignment_id,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      endedAt: row.ended_at ? new Date(row.ended_at) : null,
      durationMinutes: row.duration_minutes,
      createdByPersonId: row.created_by_person_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToEvidence(row: RawWorkEvidenceRow): WorkEvidence {
    return {
      id: row.id,
      organizationId: row.organization_id,
      workRecordId: row.work_record_id,
      evidenceType: row.evidence_type,
      title: row.title,
      referenceUri: row.reference_uri,
      provider: row.provider,
      externalId: row.external_id,
      description: row.description,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToOutcome(row: RawOutcomeRow): Outcome {
    return {
      id: row.id,
      organizationId: row.organization_id,
      outcomeType: row.outcome_type,
      title: row.title,
      description: row.description,
      measurableValue: row.measurable_value ? parseFloat(row.measurable_value) : null,
      measurableUnit: row.measurable_unit,
      metadata: row.metadata || {},
      createdByPersonId: row.created_by_person_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToWorkOutcome(row: RawWorkOutcomeRow): WorkOutcome {
    return {
      workRecordId: row.work_record_id,
      outcomeId: row.outcome_id,
      contributionType: row.contribution_type,
      contributionValue: row.contribution_value ? parseFloat(row.contribution_value) : null,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }

  // --- WORK RECORDS ---
  public static async createWorkRecord(
    data: {
      organizationId: string;
      personId: string;
      targetType?: string | null;
      targetId?: string | null;
      assignmentId?: string | null;
      categoryId: string;
      title: string;
      description?: string | null;
      status?: WorkStatus;
      startedAt?: Date | null;
      endedAt?: Date | null;
      durationMinutes: number;
      createdByPersonId: string;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<WorkRecord> {
    const db = client || getDbClient();
    const res = await db.query<RawWorkRecordRow>(
      `INSERT INTO work_records (
        organization_id, person_id, target_type, target_id, assignment_id,
        category_id, title, description, status, started_at, ended_at,
        duration_minutes, created_by_person_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;`,
      [
        data.organizationId,
        data.personId,
        data.targetType || null,
        data.targetId || null,
        data.assignmentId || null,
        data.categoryId,
        data.title.trim(),
        data.description || null,
        data.status || 'draft',
        data.startedAt ? data.startedAt.toISOString() : null,
        data.endedAt ? data.endedAt.toISOString() : null,
        data.durationMinutes,
        data.createdByPersonId,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToWorkRecord(res.rows[0]);
  }

  public static async findWorkRecordById(
    organizationId: string,
    workId: string
  ): Promise<WorkRecord | null> {
    const db = getDbClient();
    const res = await db.query<RawWorkRecordRow>(
      `SELECT * FROM work_records WHERE id = $1 AND organization_id = $2;`,
      [workId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToWorkRecord(res.rows[0]);
  }

  public static async findAllWorkRecords(
    organizationId: string,
    filters?: {
      personId?: string;
      targetType?: string;
      targetId?: string;
      assignmentId?: string;
      categoryId?: string;
      status?: WorkStatus;
      startedFrom?: Date;
      startedTo?: Date;
    }
  ): Promise<WorkRecord[]> {
    const db = getDbClient();
    let query = `SELECT * FROM work_records WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (filters?.personId) {
      params.push(filters.personId);
      query += ` AND person_id = $${params.length}`;
    }
    if (filters?.targetType) {
      params.push(filters.targetType);
      query += ` AND target_type = $${params.length}`;
    }
    if (filters?.targetId) {
      params.push(filters.targetId);
      query += ` AND target_id = $${params.length}`;
    }
    if (filters?.assignmentId) {
      params.push(filters.assignmentId);
      query += ` AND assignment_id = $${params.length}`;
    }
    if (filters?.categoryId) {
      params.push(filters.categoryId);
      query += ` AND category_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters?.startedFrom) {
      params.push(filters.startedFrom.toISOString());
      query += ` AND started_at >= $${params.length}`;
    }
    if (filters?.startedTo) {
      params.push(filters.startedTo.toISOString());
      query += ` AND started_at <= $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;

    const res = await db.query<RawWorkRecordRow>(query, params);
    return res.rows.map((row) => this.mapRowToWorkRecord(row));
  }

  public static async updateWorkRecord(
    organizationId: string,
    workId: string,
    updates: {
      title?: string;
      description?: string | null;
      categoryId?: string;
      startedAt?: Date | null;
      endedAt?: Date | null;
      durationMinutes?: number;
      assignmentId?: string | null;
      targetType?: string | null;
      targetId?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<WorkRecord | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [workId, organizationId];

    if (updates.title !== undefined) {
      params.push(updates.title.trim());
      setClauses.push(`title = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.categoryId !== undefined) {
      params.push(updates.categoryId);
      setClauses.push(`category_id = $${params.length}`);
    }
    if (updates.startedAt !== undefined) {
      params.push(updates.startedAt ? updates.startedAt.toISOString() : null);
      setClauses.push(`started_at = $${params.length}`);
    }
    if (updates.endedAt !== undefined) {
      params.push(updates.endedAt ? updates.endedAt.toISOString() : null);
      setClauses.push(`ended_at = $${params.length}`);
    }
    if (updates.durationMinutes !== undefined) {
      params.push(updates.durationMinutes);
      setClauses.push(`duration_minutes = $${params.length}`);
    }
    if (updates.assignmentId !== undefined) {
      params.push(updates.assignmentId);
      setClauses.push(`assignment_id = $${params.length}`);
    }
    if (updates.targetType !== undefined && updates.targetId !== undefined) {
      params.push(updates.targetType);
      setClauses.push(`target_type = $${params.length}`);
      params.push(updates.targetId);
      setClauses.push(`target_id = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawWorkRecordRow>(
      `UPDATE work_records
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToWorkRecord(res.rows[0]);
  }

  public static async updateWorkStatus(
    organizationId: string,
    workId: string,
    newStatus: WorkStatus
  ): Promise<WorkRecord | null> {
    const db = getDbClient();
    const res = await db.query<RawWorkRecordRow>(
      `UPDATE work_records
       SET status = $3, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [workId, organizationId, newStatus]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToWorkRecord(res.rows[0]);
  }

  // --- WORK EVIDENCE ---
  public static async addEvidence(
    data: {
      organizationId: string;
      workRecordId: string;
      evidenceType: string;
      title?: string | null;
      referenceUri?: string | null;
      provider?: string | null;
      externalId?: string | null;
      description?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<WorkEvidence> {
    const db = getDbClient();
    const res = await db.query<RawWorkEvidenceRow>(
      `INSERT INTO work_evidence (
        organization_id, work_record_id, evidence_type, title, reference_uri,
        provider, external_id, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        data.organizationId,
        data.workRecordId,
        data.evidenceType,
        data.title || null,
        data.referenceUri || null,
        data.provider || null,
        data.externalId || null,
        data.description || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToEvidence(res.rows[0]);
  }

  public static async findEvidenceForWork(
    organizationId: string,
    workRecordId: string
  ): Promise<WorkEvidence[]> {
    const db = getDbClient();
    const res = await db.query<RawWorkEvidenceRow>(
      `SELECT * FROM work_evidence WHERE work_record_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [workRecordId, organizationId]
    );
    return res.rows.map((row) => this.mapRowToEvidence(row));
  }

  public static async removeEvidence(
    organizationId: string,
    workRecordId: string,
    evidenceId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM work_evidence
       WHERE id = $1 AND work_record_id = $2 AND organization_id = $3
       RETURNING id;`,
      [evidenceId, workRecordId, organizationId]
    );
    return res.rows.length > 0;
  }

  // --- OUTCOMES ---
  public static async createOutcome(
    data: {
      organizationId: string;
      outcomeType: string;
      title: string;
      description?: string | null;
      measurableValue?: number | null;
      measurableUnit?: string | null;
      metadata?: Record<string, unknown>;
      createdByPersonId: string;
    }
  ): Promise<Outcome> {
    const db = getDbClient();
    const res = await db.query<RawOutcomeRow>(
      `INSERT INTO outcomes (
        organization_id, outcome_type, title, description, measurable_value,
        measurable_unit, metadata, created_by_person_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [
        data.organizationId,
        data.outcomeType,
        data.title.trim(),
        data.description || null,
        data.measurableValue !== undefined ? data.measurableValue : null,
        data.measurableUnit || null,
        JSON.stringify(data.metadata || {}),
        data.createdByPersonId,
      ]
    );

    return this.mapRowToOutcome(res.rows[0]);
  }

  public static async findOutcomeById(
    organizationId: string,
    outcomeId: string
  ): Promise<Outcome | null> {
    const db = getDbClient();
    const res = await db.query<RawOutcomeRow>(
      `SELECT * FROM outcomes WHERE id = $1 AND organization_id = $2;`,
      [outcomeId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToOutcome(res.rows[0]);
  }

  public static async findAllOutcomes(
    organizationId: string,
    outcomeType?: string
  ): Promise<Outcome[]> {
    const db = getDbClient();
    let query = `SELECT * FROM outcomes WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (outcomeType) {
      params.push(outcomeType);
      query += ` AND outcome_type = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;

    const res = await db.query<RawOutcomeRow>(query, params);
    return res.rows.map((row) => this.mapRowToOutcome(row));
  }

  public static async linkWorkOutcome(
    data: {
      workRecordId: string;
      outcomeId: string;
      contributionType?: string | null;
      contributionValue?: number | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<WorkOutcome> {
    const db = getDbClient();
    const res = await db.query<RawWorkOutcomeRow>(
      `INSERT INTO work_outcomes (
        work_record_id, outcome_id, contribution_type, contribution_value, metadata
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (work_record_id, outcome_id) DO UPDATE
      SET contribution_type = EXCLUDED.contribution_type,
          contribution_value = EXCLUDED.contribution_value,
          metadata = EXCLUDED.metadata
      RETURNING *;`,
      [
        data.workRecordId,
        data.outcomeId,
        data.contributionType || null,
        data.contributionValue !== undefined ? data.contributionValue : null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToWorkOutcome(res.rows[0]);
  }

  public static async findOutcomesForWork(
    organizationId: string,
    workRecordId: string
  ): Promise<Outcome[]> {
    const db = getDbClient();
    const res = await db.query<RawOutcomeRow>(
      `SELECT o.* FROM outcomes o
       JOIN work_outcomes wo ON wo.outcome_id = o.id
       WHERE wo.work_record_id = $1 AND o.organization_id = $2
       ORDER BY o.created_at ASC;`,
      [workRecordId, organizationId]
    );
    return res.rows.map((row) => this.mapRowToOutcome(row));
  }

  public static async unlinkWorkOutcome(
    organizationId: string,
    workRecordId: string,
    outcomeId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM work_outcomes wo
       USING outcomes o
       WHERE wo.outcome_id = o.id
         AND wo.work_record_id = $1
         AND wo.outcome_id = $2
         AND o.organization_id = $3
       RETURNING wo.work_record_id;`,
      [workRecordId, outcomeId, organizationId]
    );
    return res.rows.length > 0;
  }
}
