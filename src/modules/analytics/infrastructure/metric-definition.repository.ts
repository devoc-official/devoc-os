import { getDbClient } from '../../../database/index.js';
import { NotFoundError, ConflictError } from '../../../shared/errors/index.js';
import {
  MetricDefinition,
  CreateMetricDefinitionInput,
  UpdateMetricDefinitionInput,
} from '../domain/metric-definition.entity.js';

export interface ListMetricFilters {
  domainModule?: string;
  metricType?: string;
  isActive?: boolean;
}

export class MetricDefinitionRepository {
  private mapRowToEntity(row: any): MetricDefinition {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      domainModule: row.domain_module,
      metricType: row.metric_type,
      calculationSpec:
        typeof row.calculation_spec === 'string'
          ? JSON.parse(row.calculation_spec)
          : row.calculation_spec,
      supportedDimensions:
        typeof row.supported_dimensions === 'string'
          ? JSON.parse(row.supported_dimensions)
          : row.supported_dimensions || [],
      createdBy: row.created_by,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public async create(
    organizationId: string,
    input: CreateMetricDefinitionInput,
    createdBy?: string | null
  ): Promise<MetricDefinition> {
    const db = getDbClient();

    // Check duplicate code within tenant
    const existing = await this.getByCode(organizationId, input.code);
    if (existing) {
      throw new ConflictError(
        `Metric with code '${input.code}' already exists in organization '${organizationId}'`
      );
    }

    const res = await db.query<any>(
      `INSERT INTO analytics_metric_definitions (
        organization_id,
        name,
        code,
        domain_module,
        metric_type,
        calculation_spec,
        supported_dimensions,
        created_by,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        organizationId,
        input.name.trim(),
        input.code.trim(),
        input.domainModule,
        input.metricType,
        JSON.stringify(input.calculationSpec),
        JSON.stringify(input.supportedDimensions || []),
        createdBy || null,
        input.isActive !== undefined ? input.isActive : true,
      ]
    );

    return this.mapRowToEntity(res.rows[0]);
  }

  public async getById(organizationId: string, id: string): Promise<MetricDefinition> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM analytics_metric_definitions
       WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Metric definition '${id}' not found in organization`);
    }

    return this.mapRowToEntity(res.rows[0]);
  }

  public async getByCode(organizationId: string, code: string): Promise<MetricDefinition | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM analytics_metric_definitions
       WHERE code = $1 AND organization_id = $2;`,
      [code.trim(), organizationId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(res.rows[0]);
  }

  public async list(
    organizationId: string,
    filters: ListMetricFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: MetricDefinition[]; total: number }> {
    const db = getDbClient();

    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (filters.domainModule) {
      conditions.push(`domain_module = $${paramIndex++}`);
      params.push(filters.domainModule);
    }

    if (filters.metricType) {
      conditions.push(`metric_type = $${paramIndex++}`);
      params.push(filters.metricType);
    }

    if (filters.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filters.isActive);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM analytics_metric_definitions WHERE ${whereClause};`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const listParams = [...params, limit, offset];
    const dataRes = await db.query<any>(
      `SELECT * FROM analytics_metric_definitions
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++};`,
      listParams
    );

    return {
      data: dataRes.rows.map((row) => this.mapRowToEntity(row)),
      total,
    };
  }

  public async update(
    organizationId: string,
    id: string,
    input: UpdateMetricDefinitionInput
  ): Promise<MetricDefinition> {
    const db = getDbClient();

    // Verify existence in tenant
    await this.getById(organizationId, id);

    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [id, organizationId];
    let paramIdx = 3;

    if (input.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(input.name.trim());
    }

    if (input.domainModule !== undefined) {
      setClauses.push(`domain_module = $${paramIdx++}`);
      params.push(input.domainModule);
    }

    if (input.metricType !== undefined) {
      setClauses.push(`metric_type = $${paramIdx++}`);
      params.push(input.metricType);
    }

    if (input.calculationSpec !== undefined) {
      setClauses.push(`calculation_spec = $${paramIdx++}`);
      params.push(JSON.stringify(input.calculationSpec));
    }

    if (input.supportedDimensions !== undefined) {
      setClauses.push(`supported_dimensions = $${paramIdx++}`);
      params.push(JSON.stringify(input.supportedDimensions));
    }

    if (input.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIdx++}`);
      params.push(input.isActive);
    }

    const res = await db.query<any>(
      `UPDATE analytics_metric_definitions
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    return this.mapRowToEntity(res.rows[0]);
  }
}
