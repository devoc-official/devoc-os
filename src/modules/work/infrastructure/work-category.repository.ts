import { getDbClient, DbClient } from '../../../database/index.js';
import { WorkCategory } from '../domain/work.entity.js';

interface RawWorkCategoryRow {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class WorkCategoryRepository {
  private static mapRowToCategory(row: RawWorkCategoryRow): WorkCategory {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      active: row.active,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public static async createCategory(
    data: {
      organizationId: string;
      name: string;
      code: string;
      description?: string | null;
      active?: boolean;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<WorkCategory> {
    const db = client || getDbClient();
    const res = await db.query<RawWorkCategoryRow>(
      `INSERT INTO work_categories (
        organization_id, name, code, description, active, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;`,
      [
        data.organizationId,
        data.name.trim(),
        data.code.trim().toLowerCase(),
        data.description || null,
        data.active !== undefined ? data.active : true,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToCategory(res.rows[0]);
  }

  public static async findCategoryById(
    organizationId: string,
    categoryId: string
  ): Promise<WorkCategory | null> {
    const db = getDbClient();
    const res = await db.query<RawWorkCategoryRow>(
      `SELECT * FROM work_categories WHERE id = $1 AND organization_id = $2;`,
      [categoryId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToCategory(res.rows[0]);
  }

  public static async findCategoryByCode(
    organizationId: string,
    code: string
  ): Promise<WorkCategory | null> {
    const db = getDbClient();
    const res = await db.query<RawWorkCategoryRow>(
      `SELECT * FROM work_categories WHERE organization_id = $1 AND code = $2;`,
      [organizationId, code.trim().toLowerCase()]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToCategory(res.rows[0]);
  }

  public static async findAllCategories(
    organizationId: string,
    activeOnly: boolean = false
  ): Promise<WorkCategory[]> {
    const db = getDbClient();
    let query = `SELECT * FROM work_categories WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (activeOnly) {
      query += ` AND active = true`;
    }

    query += ` ORDER BY name ASC;`;

    const res = await db.query<RawWorkCategoryRow>(query, params);
    return res.rows.map((row) => this.mapRowToCategory(row));
  }

  public static async updateCategory(
    organizationId: string,
    categoryId: string,
    updates: {
      name?: string;
      description?: string | null;
      active?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<WorkCategory | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [categoryId, organizationId];

    if (updates.name !== undefined) {
      params.push(updates.name.trim());
      setClauses.push(`name = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.active !== undefined) {
      params.push(updates.active);
      setClauses.push(`active = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawWorkCategoryRow>(
      `UPDATE work_categories
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToCategory(res.rows[0]);
  }
}
