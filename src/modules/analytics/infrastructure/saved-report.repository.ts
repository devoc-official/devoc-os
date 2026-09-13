import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import {
  SavedReport,
  CreateSavedReportInput,
  UpdateSavedReportInput,
} from '../domain/saved-report.entity.js';

export class SavedReportRepository {
  private mapRowToEntity(row: any): SavedReport {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      metricIds:
        typeof row.metric_ids === 'string'
          ? JSON.parse(row.metric_ids)
          : row.metric_ids || [],
      dimensions:
        typeof row.dimensions === 'string'
          ? JSON.parse(row.dimensions)
          : row.dimensions || [],
      filters:
        typeof row.filters === 'string'
          ? JSON.parse(row.filters)
          : row.filters || {},
      timeWindow:
        typeof row.time_window === 'string'
          ? JSON.parse(row.time_window)
          : row.time_window || {},
      groupBy:
        typeof row.group_by === 'string'
          ? JSON.parse(row.group_by)
          : row.group_by || [],
      sortBy:
        typeof row.sort_by === 'string'
          ? JSON.parse(row.sort_by)
          : row.sort_by || [],
      createdBy: row.created_by,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public async create(
    organizationId: string,
    input: CreateSavedReportInput,
    createdBy?: string | null
  ): Promise<SavedReport> {
    const db = getDbClient();

    const res = await db.query<any>(
      `INSERT INTO analytics_reports (
        organization_id,
        name,
        description,
        metric_ids,
        dimensions,
        filters,
        time_window,
        group_by,
        sort_by,
        created_by,
        is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;`,
      [
        organizationId,
        input.name.trim(),
        input.description || null,
        JSON.stringify(input.metricIds),
        JSON.stringify(input.dimensions || []),
        JSON.stringify(input.filters || {}),
        JSON.stringify(input.timeWindow || {}),
        JSON.stringify(input.groupBy || []),
        JSON.stringify(input.sortBy || []),
        createdBy || null,
        input.isPublic !== undefined ? input.isPublic : false,
      ]
    );

    return this.mapRowToEntity(res.rows[0]);
  }

  public async getById(organizationId: string, id: string): Promise<SavedReport> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM analytics_reports
       WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Saved report '${id}' not found in organization`);
    }

    return this.mapRowToEntity(res.rows[0]);
  }

  public async list(
    organizationId: string,
    userId?: string,
    isAdmin: boolean = false,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: SavedReport[]; total: number }> {
    const db = getDbClient();

    let whereClause = 'organization_id = $1';
    const params: any[] = [organizationId];

    if (!isAdmin && userId) {
      whereClause += ' AND (is_public = TRUE OR created_by = $2)';
      params.push(userId);
    } else if (!isAdmin && !userId) {
      whereClause += ' AND is_public = TRUE';
    }

    const countRes = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM analytics_reports WHERE ${whereClause};`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const listParams = [...params, limit, offset];
    const dataRes = await db.query<any>(
      `SELECT * FROM analytics_reports
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2};`,
      listParams
    );

    return {
      data: dataRes.rows.map((r) => this.mapRowToEntity(r)),
      total,
    };
  }

  public async update(
    organizationId: string,
    id: string,
    input: UpdateSavedReportInput
  ): Promise<SavedReport> {
    const db = getDbClient();

    // Verify existence in tenant
    await this.getById(organizationId, id);

    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [id, organizationId];
    let pIdx = 3;

    if (input.name !== undefined) {
      setClauses.push(`name = $${pIdx++}`);
      params.push(input.name.trim());
    }

    if (input.description !== undefined) {
      setClauses.push(`description = $${pIdx++}`);
      params.push(input.description);
    }

    if (input.metricIds !== undefined) {
      setClauses.push(`metric_ids = $${pIdx++}`);
      params.push(JSON.stringify(input.metricIds));
    }

    if (input.dimensions !== undefined) {
      setClauses.push(`dimensions = $${pIdx++}`);
      params.push(JSON.stringify(input.dimensions));
    }

    if (input.filters !== undefined) {
      setClauses.push(`filters = $${pIdx++}`);
      params.push(JSON.stringify(input.filters));
    }

    if (input.timeWindow !== undefined) {
      setClauses.push(`time_window = $${pIdx++}`);
      params.push(JSON.stringify(input.timeWindow));
    }

    if (input.groupBy !== undefined) {
      setClauses.push(`group_by = $${pIdx++}`);
      params.push(JSON.stringify(input.groupBy));
    }

    if (input.sortBy !== undefined) {
      setClauses.push(`sort_by = $${pIdx++}`);
      params.push(JSON.stringify(input.sortBy));
    }

    if (input.isPublic !== undefined) {
      setClauses.push(`is_public = $${pIdx++}`);
      params.push(input.isPublic);
    }

    const res = await db.query<any>(
      `UPDATE analytics_reports
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    return this.mapRowToEntity(res.rows[0]);
  }
}
