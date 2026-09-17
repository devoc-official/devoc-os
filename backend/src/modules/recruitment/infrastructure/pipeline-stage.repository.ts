import { v4 as uuidv4 } from 'uuid';
import { getDbClient } from '../../../database/index.js';
import { PipelineStageEntity, PipelineStageProps, StageType } from '../domain/pipeline-stage.entity.js';

const DEFAULT_SYSTEM_STAGES: Array<{ code: string; name: string; type: StageType; order: number }> = [
  { code: 'applied', name: 'Applied', type: 'applied', order: 0 },
  { code: 'screening', name: 'Screening', type: 'screening', order: 1 },
  { code: 'assessment', name: 'Technical Assessment', type: 'assessment', order: 2 },
  { code: 'interview', name: 'Interview', type: 'interview', order: 3 },
  { code: 'trial', name: 'Candidate Trial', type: 'trial', order: 4 },
  { code: 'decision', name: 'Hiring Decision', type: 'decision', order: 5 },
  { code: 'offer', name: 'Offer', type: 'offer', order: 6 },
  { code: 'hired', name: 'Hired', type: 'hired', order: 7 },
];

export class PipelineStageRepository {
  public static async seedDefaultStages(organizationId: string, client?: any): Promise<PipelineStageEntity[]> {
    const db = client || getDbClient();
    for (const stage of DEFAULT_SYSTEM_STAGES) {
      await db.query(
        `INSERT INTO recruitment_pipeline_stages (
          id, organization_id, stage_code, name, stage_type, order_index, is_system, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
        ON CONFLICT (organization_id, stage_code) DO NOTHING;`,
        [uuidv4(), organizationId, stage.code, stage.name, stage.type, stage.order]
      );
    }
    return PipelineStageRepository.list(organizationId, client);
  }

  public static async list(organizationId: string, client?: any): Promise<PipelineStageEntity[]> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_pipeline_stages WHERE organization_id = $1 AND is_active = TRUE ORDER BY order_index ASC;`,
      [organizationId]
    );
    return res.rows.map(PipelineStageRepository.mapRowToEntity);
  }

  public static async findById(organizationId: string, id: string, client?: any): Promise<PipelineStageEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_pipeline_stages WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;
    return PipelineStageRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findByCode(organizationId: string, stageCode: string, client?: any): Promise<PipelineStageEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_pipeline_stages WHERE organization_id = $1 AND LOWER(stage_code) = LOWER($2);`,
      [organizationId, stageCode]
    );
    if (res.rows.length === 0) return null;
    return PipelineStageRepository.mapRowToEntity(res.rows[0]);
  }

  public static async create(entity: PipelineStageEntity, client?: any): Promise<PipelineStageEntity> {
    const db = client || getDbClient();
    const res = await db.query(
      `INSERT INTO recruitment_pipeline_stages (
        id, organization_id, stage_code, name, stage_type, order_index, is_system, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        entity.id,
        entity.organizationId,
        entity.stageCode,
        entity.name,
        entity.stageType,
        entity.orderIndex,
        entity.isSystem,
        entity.isActive,
        entity.createdAt,
        entity.updatedAt,
      ]
    );
    return PipelineStageRepository.mapRowToEntity(res.rows[0]);
  }

  public static async update(entity: PipelineStageEntity, client?: any): Promise<PipelineStageEntity> {
    const db = client || getDbClient();
    const res = await db.query(
      `UPDATE recruitment_pipeline_stages SET
        name = $1, order_index = $2, is_active = $3, updated_at = $4
      WHERE id = $5 AND organization_id = $6
      RETURNING *;`,
      [entity.name, entity.orderIndex, entity.isActive, entity.updatedAt, entity.id, entity.organizationId]
    );
    return PipelineStageRepository.mapRowToEntity(res.rows[0]);
  }

  private static mapRowToEntity(row: any): PipelineStageEntity {
    const props: PipelineStageProps = {
      id: row.id,
      organizationId: row.organization_id,
      stageCode: row.stage_code,
      name: row.name,
      stageType: row.stage_type,
      orderIndex: parseInt(row.order_index, 10),
      isSystem: row.is_system,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return new PipelineStageEntity(props);
  }
}
