import { getDbClient } from '../../../database/index.js';
import { TrialEntity, TrialProps, TrialStatus } from '../domain/trial.entity.js';

export class TrialRepository {
  public static async create(entity: TrialEntity, client?: any): Promise<TrialEntity> {
    const db = client || getDbClient();
    const query = `
      INSERT INTO recruitment_trials (
        id, organization_id, application_id, start_date, end_date, status,
        objectives, deliverables_summary, outcome_notes, mentor_id,
        assignment_id, evaluation_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *;
    `;
    const res = await db.query(query, [
      entity.id,
      entity.organizationId,
      entity.applicationId,
      entity.startDate,
      entity.endDate,
      entity.status,
      entity.objectives,
      entity.deliverablesSummary,
      entity.outcomeNotes,
      entity.mentorId,
      entity.assignmentId,
      entity.evaluationId,
      entity.createdAt,
      entity.updatedAt,
    ]);
    return TrialRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findById(organizationId: string, id: string, client?: any): Promise<TrialEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_trials WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;
    return TrialRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findActiveByApplicationId(organizationId: string, applicationId: string, client?: any): Promise<TrialEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_trials
       WHERE organization_id = $1 AND application_id = $2
         AND status IN ('scheduled', 'active');`,
      [organizationId, applicationId]
    );
    if (res.rows.length === 0) return null;
    return TrialRepository.mapRowToEntity(res.rows[0]);
  }

  public static async list(
    organizationId: string,
    filters: {
      applicationId?: string;
      status?: TrialStatus;
    } = {}
  ): Promise<TrialEntity[]> {
    const db = getDbClient();
    let query = `SELECT * FROM recruitment_trials WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters.applicationId) {
      params.push(filters.applicationId);
      query += ` AND application_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map(TrialRepository.mapRowToEntity);
  }

  public static async update(entity: TrialEntity, client?: any): Promise<TrialEntity> {
    const db = client || getDbClient();
    const query = `
      UPDATE recruitment_trials SET
        start_date = $1, end_date = $2, status = $3, objectives = $4,
        deliverables_summary = $5, outcome_notes = $6, mentor_id = $7,
        assignment_id = $8, evaluation_id = $9, updated_at = $10
      WHERE id = $11 AND organization_id = $12
      RETURNING *;
    `;
    const res = await db.query(query, [
      entity.startDate,
      entity.endDate,
      entity.status,
      entity.objectives,
      entity.deliverablesSummary,
      entity.outcomeNotes,
      entity.mentorId,
      entity.assignmentId,
      entity.evaluationId,
      entity.updatedAt,
      entity.id,
      entity.organizationId,
    ]);
    return TrialRepository.mapRowToEntity(res.rows[0]);
  }

  private static mapRowToEntity(row: any): TrialEntity {
    const props: TrialProps = {
      id: row.id,
      organizationId: row.organization_id,
      applicationId: row.application_id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      objectives: row.objectives,
      deliverablesSummary: row.deliverables_summary,
      outcomeNotes: row.outcome_notes,
      mentorId: row.mentor_id,
      assignmentId: row.assignment_id,
      evaluationId: row.evaluation_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return new TrialEntity(props);
  }
}
