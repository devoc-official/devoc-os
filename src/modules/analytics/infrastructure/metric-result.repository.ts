import { getDbClient } from '../../../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
  MetricResult,
  CreateMetricResultInput,
  PeriodType,
} from '../domain/metric-result.entity.js';

export class MetricResultRepository {
  private mapRowToEntity(row: any): MetricResult {
    return {
      id: row.id,
      organizationId: row.organization_id,
      metricDefinitionId: row.metric_definition_id,
      periodType: row.period_type,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      dimensionValues:
        typeof row.dimension_values === 'string'
          ? JSON.parse(row.dimension_values)
          : row.dimension_values || {},
      numericValue: parseFloat(row.numeric_value),
      details:
        typeof row.details === 'string'
          ? JSON.parse(row.details)
          : row.details || null,
      calculationVersion: row.calculation_version,
      calculationRunId: row.calculation_run_id,
      calculatedAt: row.calculated_at,
      createdAt: row.created_at,
    };
  }

  public async getMaxVersion(
    organizationId: string,
    metricDefinitionId: string,
    periodType: PeriodType,
    periodStart: Date | string
  ): Promise<number> {
    const db = getDbClient();
    const res = await db.query<{ max_version: number | null }>(
      `SELECT MAX(calculation_version) as max_version
       FROM analytics_metric_results
       WHERE organization_id = $1
         AND metric_definition_id = $2
         AND period_type = $3
         AND period_start = $4;`,
      [organizationId, metricDefinitionId, periodType, periodStart]
    );

    return res.rows[0]?.max_version || 0;
  }

  public async create(
    organizationId: string,
    input: CreateMetricResultInput
  ): Promise<MetricResult> {
    const db = getDbClient();

    const maxVersion = await this.getMaxVersion(
      organizationId,
      input.metricDefinitionId,
      input.periodType,
      input.periodStart
    );
    const version = input.calculationVersion || maxVersion + 1;
    const runId = input.calculationRunId || uuidv4();
    const calculatedAt = input.calculatedAt || new Date();

    const res = await db.query<any>(
      `INSERT INTO analytics_metric_results (
        organization_id,
        metric_definition_id,
        period_type,
        period_start,
        period_end,
        dimension_values,
        numeric_value,
        details,
        calculation_version,
        calculation_run_id,
        calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;`,
      [
        organizationId,
        input.metricDefinitionId,
        input.periodType,
        input.periodStart,
        input.periodEnd,
        JSON.stringify(input.dimensionValues || {}),
        input.numericValue,
        input.details ? JSON.stringify(input.details) : null,
        version,
        runId,
        calculatedAt,
      ]
    );

    return this.mapRowToEntity(res.rows[0]);
  }

  public async getLatestSnapshot(
    organizationId: string,
    metricDefinitionId: string,
    periodType?: PeriodType,
    periodStart?: Date | string,
    calculationVersion?: number
  ): Promise<MetricResult | null> {
    const db = getDbClient();

    const conditions: string[] = [
      'organization_id = $1',
      'metric_definition_id = $2',
    ];
    const params: any[] = [organizationId, metricDefinitionId];
    let pIdx = 3;

    if (periodType) {
      conditions.push(`period_type = $${pIdx++}`);
      params.push(periodType);
    }

    if (periodStart) {
      conditions.push(`period_start = $${pIdx++}`);
      params.push(periodStart);
    }

    if (calculationVersion) {
      conditions.push(`calculation_version = $${pIdx++}`);
      params.push(calculationVersion);
    }

    const whereClause = conditions.join(' AND ');

    const res = await db.query<any>(
      `SELECT * FROM analytics_metric_results
       WHERE ${whereClause}
       ORDER BY calculation_version DESC, calculated_at DESC
       LIMIT 1;`,
      params
    );

    if (res.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(res.rows[0]);
  }

  public async listSnapshots(
    organizationId: string,
    metricDefinitionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MetricResult[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM analytics_metric_results
       WHERE organization_id = $1 AND metric_definition_id = $2
       ORDER BY period_start DESC, calculation_version DESC
       LIMIT $3 OFFSET $4;`,
      [organizationId, metricDefinitionId, limit, offset]
    );

    return res.rows.map((r) => this.mapRowToEntity(r));
  }
}
