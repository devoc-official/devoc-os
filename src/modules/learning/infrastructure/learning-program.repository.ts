import { getDbClient } from '../../../database/index.js';
import {
  LearningProgram,
  LearningProgramProps,
  ProgramMilestoneProps,
  ActivityDefinitionProps,
} from '../domain/learning-program.entity.js';

export class LearningProgramRepository {
  public async createProgram(props: Omit<LearningProgramProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningProgram> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_programs (organization_id, name, code, description, status, version, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        props.organizationId,
        props.name,
        props.code,
        props.description || null,
        props.status || 'draft',
        props.version || 1,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapProgramRow(res.rows[0]);
  }

  public async findProgramById(organizationId: string, programId: string): Promise<LearningProgram | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_programs WHERE id = $1 AND organization_id = $2;`,
      [programId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapProgramRow(res.rows[0]);
  }

  public async findProgramByCode(organizationId: string, code: string): Promise<LearningProgram | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_programs WHERE code = $1 AND organization_id = $2;`,
      [code, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapProgramRow(res.rows[0]);
  }

  public async listPrograms(organizationId: string, status?: string): Promise<LearningProgram[]> {
    const db = getDbClient();
    let query = `SELECT * FROM learning_programs WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC;`;

    const res = await db.query<any>(query, params);
    return res.rows.map((row) => this.mapProgramRow(row));
  }

  public async updateProgram(program: LearningProgram): Promise<LearningProgram> {
    const db = getDbClient();
    const res = await db.query<any>(
      `UPDATE learning_programs
       SET name = $1, description = $2, status = $3, version = $4, metadata = $5, updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *;`,
      [
        program.name,
        program.description,
        program.status,
        program.version,
        JSON.stringify(program.metadata),
        program.id,
        program.organizationId,
      ]
    );
    return this.mapProgramRow(res.rows[0]);
  }

  // Program Milestones
  public async createMilestone(props: Omit<ProgramMilestoneProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProgramMilestoneProps> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_program_milestones (organization_id, learning_program_id, name, description, sequence, required, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        props.organizationId,
        props.learningProgramId,
        props.name,
        props.description || null,
        props.sequence || 1,
        props.required ?? true,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapMilestoneRow(res.rows[0]);
  }

  public async listMilestones(organizationId: string, programId: string): Promise<ProgramMilestoneProps[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_program_milestones
       WHERE learning_program_id = $1 AND organization_id = $2
       ORDER BY sequence ASC, created_at ASC;`,
      [programId, organizationId]
    );
    return res.rows.map((r) => this.mapMilestoneRow(r));
  }

  public async findMilestoneById(organizationId: string, milestoneId: string): Promise<ProgramMilestoneProps | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_program_milestones WHERE id = $1 AND organization_id = $2;`,
      [milestoneId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapMilestoneRow(res.rows[0]);
  }

  public async updateMilestone(props: ProgramMilestoneProps): Promise<ProgramMilestoneProps> {
    const db = getDbClient();
    const res = await db.query<any>(
      `UPDATE learning_program_milestones
       SET name = $1, description = $2, sequence = $3, required = $4, metadata = $5, updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *;`,
      [props.name, props.description, props.sequence, props.required, JSON.stringify(props.metadata || {}), props.id, props.organizationId]
    );
    return this.mapMilestoneRow(res.rows[0]);
  }

  // Activity Definitions
  public async createActivityDefinition(props: Omit<ActivityDefinitionProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActivityDefinitionProps> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_activity_definitions (organization_id, milestone_id, title, description, activity_type, sequence, required, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        props.organizationId,
        props.milestoneId,
        props.title,
        props.description || null,
        props.activityType,
        props.sequence || 1,
        props.required ?? true,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapActivityDefRow(res.rows[0]);
  }

  public async listActivityDefinitions(organizationId: string, milestoneId: string): Promise<ActivityDefinitionProps[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_activity_definitions
       WHERE milestone_id = $1 AND organization_id = $2
       ORDER BY sequence ASC, created_at ASC;`,
      [milestoneId, organizationId]
    );
    return res.rows.map((r) => this.mapActivityDefRow(r));
  }

  public async findActivityDefinitionById(organizationId: string, activityDefId: string): Promise<ActivityDefinitionProps | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_activity_definitions WHERE id = $1 AND organization_id = $2;`,
      [activityDefId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapActivityDefRow(res.rows[0]);
  }

  private mapProgramRow(row: any): LearningProgram {
    return new LearningProgram({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      status: row.status,
      version: row.version,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapMilestoneRow(row: any): ProgramMilestoneProps {
    return {
      id: row.id,
      organizationId: row.organization_id,
      learningProgramId: row.learning_program_id,
      name: row.name,
      description: row.description,
      sequence: row.sequence,
      required: row.required,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapActivityDefRow(row: any): ActivityDefinitionProps {
    return {
      id: row.id,
      organizationId: row.organization_id,
      milestoneId: row.milestone_id,
      title: row.title,
      description: row.description,
      activityType: row.activity_type,
      sequence: row.sequence,
      required: row.required,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
