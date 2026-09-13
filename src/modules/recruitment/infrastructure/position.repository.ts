import { getDbClient } from '../../../database/index.js';
import { PositionEntity, PositionProps, PositionStatus } from '../domain/position.entity.js';

export class PositionRepository {
  public static async create(entity: PositionEntity, client?: any): Promise<PositionEntity> {
    const db = client || getDbClient();
    const query = `
      INSERT INTO recruitment_positions (
        id, organization_id, title, code, business_unit_id, department_id, team_id,
        target_role_id, employment_type, openings_count, hired_count, hiring_manager_id,
        recruiter_id, description, requirements, min_salary, max_salary, currency,
        target_start_date, status, opened_at, closed_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *;
    `;
    const res = await db.query(query, [
      entity.id,
      entity.organizationId,
      entity.title,
      entity.code,
      entity.businessUnitId,
      entity.departmentId,
      entity.teamId,
      entity.targetRoleId,
      entity.employmentType,
      entity.openingsCount,
      entity.hiredCount,
      entity.hiringManagerId,
      entity.recruiterId,
      entity.description,
      entity.requirements,
      entity.minSalary,
      entity.maxSalary,
      entity.currency,
      entity.targetStartDate,
      entity.status,
      entity.openedAt,
      entity.closedAt,
      entity.createdAt,
      entity.updatedAt,
    ]);
    return PositionRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findById(organizationId: string, id: string, client?: any): Promise<PositionEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_positions WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;
    return PositionRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findByIdForUpdate(organizationId: string, id: string, client: any): Promise<PositionEntity | null> {
    const res = await client.query(
      `SELECT * FROM recruitment_positions WHERE id = $1 AND organization_id = $2 FOR UPDATE;`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;
    return PositionRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findByCode(organizationId: string, code: string): Promise<PositionEntity | null> {
    const db = getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_positions WHERE organization_id = $1 AND UPPER(code) = UPPER($2);`,
      [organizationId, code]
    );
    if (res.rows.length === 0) return null;
    return PositionRepository.mapRowToEntity(res.rows[0]);
  }

  public static async list(
    organizationId: string,
    filters: {
      status?: PositionStatus;
      businessUnitId?: string;
      departmentId?: string;
      teamId?: string;
      search?: string;
    } = {}
  ): Promise<PositionEntity[]> {
    const db = getDbClient();
    let query = `SELECT * FROM recruitment_positions WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters.businessUnitId) {
      params.push(filters.businessUnitId);
      query += ` AND business_unit_id = $${params.length}`;
    }
    if (filters.departmentId) {
      params.push(filters.departmentId);
      query += ` AND department_id = $${params.length}`;
    }
    if (filters.teamId) {
      params.push(filters.teamId);
      query += ` AND team_id = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (title ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map(PositionRepository.mapRowToEntity);
  }

  public static async update(entity: PositionEntity, client?: any): Promise<PositionEntity> {
    const db = client || getDbClient();
    const query = `
      UPDATE recruitment_positions SET
        title = $1, code = $2, business_unit_id = $3, department_id = $4, team_id = $5,
        target_role_id = $6, employment_type = $7, openings_count = $8, hired_count = $9,
        hiring_manager_id = $10, recruiter_id = $11, description = $12, requirements = $13,
        min_salary = $14, max_salary = $15, currency = $16, target_start_date = $17,
        status = $18, opened_at = $19, closed_at = $20, updated_at = $21
      WHERE id = $22 AND organization_id = $23
      RETURNING *;
    `;
    const res = await db.query(query, [
      entity.title,
      entity.code,
      entity.businessUnitId,
      entity.departmentId,
      entity.teamId,
      entity.targetRoleId,
      entity.employmentType,
      entity.openingsCount,
      entity.hiredCount,
      entity.hiringManagerId,
      entity.recruiterId,
      entity.description,
      entity.requirements,
      entity.minSalary,
      entity.maxSalary,
      entity.currency,
      entity.targetStartDate,
      entity.status,
      entity.openedAt,
      entity.closedAt,
      entity.updatedAt,
      entity.id,
      entity.organizationId,
    ]);
    return PositionRepository.mapRowToEntity(res.rows[0]);
  }

  private static mapRowToEntity(row: any): PositionEntity {
    const props: PositionProps = {
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      code: row.code,
      businessUnitId: row.business_unit_id,
      departmentId: row.department_id,
      teamId: row.team_id,
      targetRoleId: row.target_role_id,
      employmentType: row.employment_type,
      openingsCount: parseInt(row.openings_count, 10),
      hiredCount: parseInt(row.hired_count, 10),
      hiringManagerId: row.hiring_manager_id,
      recruiterId: row.recruiter_id,
      description: row.description,
      requirements: row.requirements,
      minSalary: row.min_salary ? parseFloat(row.min_salary) : null,
      maxSalary: row.max_salary ? parseFloat(row.max_salary) : null,
      currency: row.currency,
      targetStartDate: row.target_start_date,
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return new PositionEntity(props);
  }
}
