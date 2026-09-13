import { v4 as uuidv4 } from 'uuid';
import { getDbClient } from '../../../database/index.js';
import { ApplicationEntity, ApplicationProps, ApplicationStatus } from '../domain/application.entity.js';

export interface ApplicationStageHistoryRow {
  id: string;
  organizationId: string;
  applicationId: string;
  stageId: string;
  stageCode?: string;
  stageName?: string;
  status: string;
  evaluatorId?: string | null;
  evaluationId?: string | null;
  meetingId?: string | null;
  notes?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ApplicationRepository {
  public static async create(entity: ApplicationEntity, client?: any): Promise<ApplicationEntity> {
    const db = client || getDbClient();
    const query = `
      INSERT INTO recruitment_applications (
        id, organization_id, candidate_id, position_id, current_stage_id,
        status, applied_at, rejection_reason, rejected_at, withdrawn_reason,
        withdrawn_at, hired_at, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *;
    `;
    const res = await db.query(query, [
      entity.id,
      entity.organizationId,
      entity.candidateId,
      entity.positionId,
      entity.currentStageId,
      entity.status,
      entity.appliedAt,
      entity.rejectionReason,
      entity.rejectedAt,
      entity.withdrawnReason,
      entity.withdrawnAt,
      entity.hiredAt,
      entity.notes,
      entity.createdAt,
      entity.updatedAt,
    ]);
    return ApplicationRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findById(organizationId: string, id: string, client?: any): Promise<ApplicationEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_applications WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;
    return ApplicationRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findActiveByCandidateAndPosition(
    organizationId: string,
    candidateId: string,
    positionId: string,
    client?: any
  ): Promise<ApplicationEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_applications
       WHERE organization_id = $1 AND candidate_id = $2 AND position_id = $3
         AND status NOT IN ('rejected', 'withdrawn', 'hired');`,
      [organizationId, candidateId, positionId]
    );
    if (res.rows.length === 0) return null;
    return ApplicationRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findOtherActiveApplicationsForCandidate(
    organizationId: string,
    candidateId: string,
    excludeApplicationId: string,
    client?: any
  ): Promise<ApplicationEntity[]> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_applications
       WHERE organization_id = $1 AND candidate_id = $2 AND id != $3
         AND status NOT IN ('rejected', 'withdrawn', 'hired');`,
      [organizationId, candidateId, excludeApplicationId]
    );
    return res.rows.map(ApplicationRepository.mapRowToEntity);
  }

  public static async list(
    organizationId: string,
    filters: {
      candidateId?: string;
      positionId?: string;
      status?: ApplicationStatus;
      stageId?: string;
    } = {}
  ): Promise<ApplicationEntity[]> {
    const db = getDbClient();
    let query = `SELECT * FROM recruitment_applications WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters.candidateId) {
      params.push(filters.candidateId);
      query += ` AND candidate_id = $${params.length}`;
    }
    if (filters.positionId) {
      params.push(filters.positionId);
      query += ` AND position_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters.stageId) {
      params.push(filters.stageId);
      query += ` AND current_stage_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map(ApplicationRepository.mapRowToEntity);
  }

  public static async update(entity: ApplicationEntity, client?: any): Promise<ApplicationEntity> {
    const db = client || getDbClient();
    const query = `
      UPDATE recruitment_applications SET
        current_stage_id = $1, status = $2, rejection_reason = $3, rejected_at = $4,
        withdrawn_reason = $5, withdrawn_at = $6, hired_at = $7, notes = $8, updated_at = $9
      WHERE id = $10 AND organization_id = $11
      RETURNING *;
    `;
    const res = await db.query(query, [
      entity.currentStageId,
      entity.status,
      entity.rejectionReason,
      entity.rejectedAt,
      entity.withdrawnReason,
      entity.withdrawnAt,
      entity.hiredAt,
      entity.notes,
      entity.updatedAt,
      entity.id,
      entity.organizationId,
    ]);
    return ApplicationRepository.mapRowToEntity(res.rows[0]);
  }

  public static async recordStageHistory(
    organizationId: string,
    applicationId: string,
    stageId: string,
    status: string = 'in_progress',
    evaluatorId?: string | null,
    evaluationId?: string | null,
    meetingId?: string | null,
    notes?: string | null,
    client?: any
  ): Promise<ApplicationStageHistoryRow> {
    const db = client || getDbClient();
    const id = uuidv4();
    const now = new Date();
    const completedAt = (status === 'passed' || status === 'failed' || status === 'skipped') ? now : null;

    const res = await db.query(
      `INSERT INTO recruitment_application_stages (
        id, organization_id, application_id, stage_id, status, evaluator_id,
        evaluation_id, meeting_id, notes, started_at, completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;`,
      [
        id,
        organizationId,
        applicationId,
        stageId,
        status,
        evaluatorId ?? null,
        evaluationId ?? null,
        meetingId ?? null,
        notes ?? null,
        now,
        completedAt,
        now,
        now,
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      organizationId: r.organization_id,
      applicationId: r.application_id,
      stageId: r.stage_id,
      status: r.status,
      evaluatorId: r.evaluator_id,
      evaluationId: r.evaluation_id,
      meetingId: r.meeting_id,
      notes: r.notes,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  public static async getStageHistory(organizationId: string, applicationId: string): Promise<ApplicationStageHistoryRow[]> {
    const db = getDbClient();
    const res = await db.query(
      `SELECT s.*, p.stage_code, p.name as stage_name
       FROM recruitment_application_stages s
       JOIN recruitment_pipeline_stages p ON p.id = s.stage_id
       WHERE s.organization_id = $1 AND s.application_id = $2
       ORDER BY s.started_at ASC;`,
      [organizationId, applicationId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      applicationId: r.application_id,
      stageId: r.stage_id,
      stageCode: r.stage_code,
      stageName: r.stage_name,
      status: r.status,
      evaluatorId: r.evaluator_id,
      evaluationId: r.evaluation_id,
      meetingId: r.meeting_id,
      notes: r.notes,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  private static mapRowToEntity(row: any): ApplicationEntity {
    const props: ApplicationProps = {
      id: row.id,
      organizationId: row.organization_id,
      candidateId: row.candidate_id,
      positionId: row.position_id,
      currentStageId: row.current_stage_id,
      status: row.status,
      appliedAt: row.applied_at,
      rejectionReason: row.rejection_reason,
      rejectedAt: row.rejected_at,
      withdrawnReason: row.withdrawn_reason,
      withdrawnAt: row.withdrawn_at,
      hiredAt: row.hired_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return new ApplicationEntity(props);
  }
}
