import { ValidationError } from '../../../shared/errors/index.js';
import {
  LogicalSourceIdentifier,
  ANALYTICS_SOURCE_REGISTRY,
  ALLOWED_OPERATORS,
  FilterOperator,
} from '../domain/source-registry.js';
import { MetricType } from '../domain/metric-definition.entity.js';

export interface ContextualAuthScope {
  role: string;
  userId?: string;
  isPlatformAdmin?: boolean;
  personId?: string;
  businessUnitIds?: string[];
  teamIds?: string[];
  projectIds?: string[];
  allAuthorizedBusinessUnitIds?: string[];
  allAuthorizedTeamIds?: string[];
  allAuthorizedProjectIds?: string[];
}

export interface BuildQueryOptions {
  sourceEntity: LogicalSourceIdentifier;
  aggregation?: MetricType;
  field?: string;
  weightField?: string;
  filters?: Record<string, any>;
  dimensions?: string[];
  groupBy?: string[];
  startDate?: string | Date;
  endDate?: string | Date;
  timeColumn?: string;
  limit?: number;
  offset?: number;
}

export interface BuiltQuery {
  sql: string;
  params: any[];
}

export class AnalyticsQueryBuilder {
  /**
   * Builds safe, parameterized SQL for analytical query execution
   */
  public static buildQuery(
    organizationId: string,
    options: BuildQueryOptions,
    authScope?: ContextualAuthScope
  ): BuiltQuery {
    const { sourceEntity, aggregation = 'COUNT', field, filters = {}, groupBy = [], startDate, endDate } = options;

    const registeredSource = ANALYTICS_SOURCE_REGISTRY[sourceEntity];
    if (!registeredSource) {
      throw new ValidationError(`Unknown logical source entity '${sourceEntity}'`);
    }

    if (field && !registeredSource.allowedDimensions.includes(field)) {
      throw new ValidationError(
        `Field '${field}' is not allowed on logical source '${sourceEntity}'`
      );
    }

    if (options.weightField && !registeredSource.allowedDimensions.includes(options.weightField)) {
      throw new ValidationError(
        `Weight field '${options.weightField}' is not allowed on logical source '${sourceEntity}'`
      );
    }

    for (const groupDim of groupBy) {
      if (!registeredSource.allowedDimensions.includes(groupDim)) {
        throw new ValidationError(
          `Group by dimension '${groupDim}' is not allowed on logical source '${sourceEntity}'`
        );
      }
    }

    const params: any[] = [];
    let paramIdx = 1;
    const tableAlias = 's';
    let fromClause = `${registeredSource.physicalTable} ${tableAlias}`;
    const whereConditions: string[] = [];

    // Tenant isolation scoping
    if (registeredSource.tenantColumn === 'organization_id') {
      whereConditions.push(`${tableAlias}.organization_id = $${paramIdx++}`);
      params.push(organizationId);
    } else if (sourceEntity === 'ORGANIZATION') {
      whereConditions.push(`${tableAlias}.id = $${paramIdx++}`);
      params.push(organizationId);
    } else if (sourceEntity === 'USER') {
      fromClause += ` JOIN organization_memberships om ON om.user_id = ${tableAlias}.id`;
      whereConditions.push(`om.organization_id = $${paramIdx++}`);
      params.push(organizationId);
    } else if (sourceEntity === 'WORK_OUTCOME') {
      fromClause += ` JOIN work_records wr ON wr.id = ${tableAlias}.work_record_id`;
      whereConditions.push(`wr.organization_id = $${paramIdx++}`);
      params.push(organizationId);
    } else if (
      sourceEntity === 'CRITERION_RESULT' ||
      sourceEntity === 'EVALUATION_FEEDBACK' ||
      sourceEntity === 'EVALUATION_OUTCOME' ||
      sourceEntity === 'EVALUATION_HISTORY' ||
      sourceEntity === 'EVALUATION_EVALUATOR'
    ) {
      fromClause += ` JOIN evaluations ev ON ev.id = ${tableAlias}.evaluation_id`;
      whereConditions.push(`ev.organization_id = $${paramIdx++}`);
      params.push(organizationId);
    } else if (sourceEntity === 'EVALUATION_CRITERION') {
      fromClause += ` JOIN evaluation_templates et ON et.id = ${tableAlias}.template_id`;
      whereConditions.push(`et.organization_id = $${paramIdx++}`);
      params.push(organizationId);
    } else if (sourceEntity === 'FINANCIAL_OBLIGATION_ITEM') {
      fromClause += ` JOIN financial_obligations fo ON fo.id = ${tableAlias}.obligation_id`;
      whereConditions.push(`fo.organization_id = $${paramIdx++}`);
      params.push(organizationId);
    } else if (sourceEntity === 'EVENT_REGISTRY') {
      // Global catalog; restrict by is_active = true
      whereConditions.push(`${tableAlias}.is_active = TRUE`);
    } else {
      // Fallback tenant safety check
      throw new ValidationError(
        `Source entity '${sourceEntity}' does not have a valid tenant mapping`
      );
    }

    // Contextual Authorization Scoping
    if (authScope) {
      if (
        authScope.businessUnitIds &&
        authScope.businessUnitIds.length > 0 &&
        registeredSource.allowedDimensions.includes('business_unit_id')
      ) {
        whereConditions.push(`${tableAlias}.business_unit_id = ANY($${paramIdx++})`);
        params.push(authScope.businessUnitIds);
      }

      if (
        authScope.teamIds &&
        authScope.teamIds.length > 0 &&
        registeredSource.allowedDimensions.includes('team_id')
      ) {
        whereConditions.push(`${tableAlias}.team_id = ANY($${paramIdx++})`);
        params.push(authScope.teamIds);
      }

      if (
        authScope.projectIds &&
        authScope.projectIds.length > 0 &&
        registeredSource.allowedDimensions.includes('project_id')
      ) {
        whereConditions.push(`${tableAlias}.project_id = ANY($${paramIdx++})`);
        params.push(authScope.projectIds);
      }

      if (!authScope.isPlatformAdmin && authScope.role !== 'org_admin') {
        if (
          authScope.personId &&
          registeredSource.allowedDimensions.includes('person_id') &&
          authScope.role === 'org_member' &&
          !authScope.businessUnitIds?.length &&
          !authScope.projectIds?.length
        ) {
          // Individual restricted scope
          whereConditions.push(`${tableAlias}.person_id = $${paramIdx++}`);
          params.push(authScope.personId);
        } else if (
          !authScope.personId &&
          !authScope.businessUnitIds?.length &&
          !authScope.projectIds?.length &&
          !authScope.teamIds?.length
        ) {
          // Member without person identity and without any organizational scope
          whereConditions.push('1 = 0');
        }
      }
    }

    // User-specified filters
    for (const [key, rawVal] of Object.entries(filters)) {
      if (!registeredSource.allowedDimensions.includes(key)) {
        throw new ValidationError(
          `Filter key '${key}' is not an allowed dimension on source '${sourceEntity}'`
        );
      }

      if (rawVal === null || rawVal === undefined) {
        whereConditions.push(`${tableAlias}.${key} IS NULL`);
        continue;
      }

      if (typeof rawVal === 'object' && !Array.isArray(rawVal)) {
        for (const [op, val] of Object.entries(rawVal)) {
          if (!ALLOWED_OPERATORS.includes(op as FilterOperator)) {
            throw new ValidationError(`Operator '${op}' is not supported`);
          }

          switch (op as FilterOperator) {
            case 'eq':
              whereConditions.push(`${tableAlias}.${key} = $${paramIdx++}`);
              params.push(val);
              break;
            case 'neq':
              whereConditions.push(`${tableAlias}.${key} != $${paramIdx++}`);
              params.push(val);
              break;
            case 'gt':
              whereConditions.push(`${tableAlias}.${key} > $${paramIdx++}`);
              params.push(val);
              break;
            case 'gte':
              whereConditions.push(`${tableAlias}.${key} >= $${paramIdx++}`);
              params.push(val);
              break;
            case 'lt':
              whereConditions.push(`${tableAlias}.${key} < $${paramIdx++}`);
              params.push(val);
              break;
            case 'lte':
              whereConditions.push(`${tableAlias}.${key} <= $${paramIdx++}`);
              params.push(val);
              break;
            case 'in':
              if (!Array.isArray(val)) {
                throw new ValidationError(`Operator 'in' requires array value`);
              }
              whereConditions.push(`${tableAlias}.${key} = ANY($${paramIdx++})`);
              params.push(val);
              break;
            case 'not_in':
              if (!Array.isArray(val)) {
                throw new ValidationError(`Operator 'not_in' requires array value`);
              }
              whereConditions.push(`NOT (${tableAlias}.${key} = ANY($${paramIdx++}))`);
              params.push(val);
              break;
            case 'between':
              if (!Array.isArray(val) || val.length !== 2) {
                throw new ValidationError(`Operator 'between' requires a 2-element array`);
              }
              whereConditions.push(
                `${tableAlias}.${key} BETWEEN $${paramIdx++} AND $${paramIdx++}`
              );
              params.push(val[0], val[1]);
              break;
            case 'is_null':
              whereConditions.push(`${tableAlias}.${key} IS NULL`);
              break;
            case 'is_not_null':
              whereConditions.push(`${tableAlias}.${key} IS NOT NULL`);
              break;
          }
        }
      } else if (Array.isArray(rawVal)) {
        whereConditions.push(`${tableAlias}.${key} = ANY($${paramIdx++})`);
        params.push(rawVal);
      } else {
        whereConditions.push(`${tableAlias}.${key} = $${paramIdx++}`);
        params.push(rawVal);
      }
    }

    // Time window filtering
    if (startDate || endDate) {
      const timeCol =
        options.timeColumn && registeredSource.allowedDimensions.includes(options.timeColumn)
          ? options.timeColumn
          : this.resolveTimeColumn(registeredSource);

      if (timeCol) {
        if (startDate) {
          whereConditions.push(`${tableAlias}.${timeCol} >= $${paramIdx++}`);
          params.push(startDate);
        }
        if (endDate) {
          whereConditions.push(`${tableAlias}.${timeCol} <= $${paramIdx++}`);
          params.push(endDate);
        }
      }
    }

    // Select & Aggregation Expression
    let selectExpr: string;
    const targetCol = field ? `${tableAlias}.${field}` : null;

    switch (aggregation) {
      case 'COUNT':
        selectExpr = targetCol
          ? `COUNT(${targetCol})::int AS metric_value, COUNT(*)::int AS total_count`
          : `COUNT(*)::int AS metric_value, COUNT(*)::int AS total_count`;
        break;
      case 'SUM':
        selectExpr = `COALESCE(SUM(${targetCol || 1}), 0)::numeric AS metric_value, COUNT(*)::int AS total_count`;
        break;
      case 'AVERAGE':
        selectExpr = `COALESCE(AVG(${targetCol}), 0)::numeric AS metric_value, COUNT(*)::int AS total_count`;
        break;
      case 'WEIGHTED_AGGREGATION':
        if (!options.weightField || !targetCol) {
          throw new ValidationError('WEIGHTED_AGGREGATION requires both field and weightField');
        }
        selectExpr = `COALESCE(SUM(${targetCol} * ${tableAlias}.${options.weightField}) / NULLIF(SUM(${tableAlias}.${options.weightField}), 0), 0)::numeric AS metric_value, COUNT(*)::int AS total_count`;
        break;
      default:
        selectExpr = `COUNT(*)::int AS metric_value, COUNT(*)::int AS total_count`;
    }

    const selectColumns: string[] = [selectExpr];
    for (const groupDim of groupBy) {
      selectColumns.push(`${tableAlias}.${groupDim}`);
    }

    let sql = `SELECT ${selectColumns.join(', ')} FROM ${fromClause}`;
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    if (groupBy.length > 0) {
      const groupClause = groupBy.map((g) => `${tableAlias}.${g}`).join(', ');
      sql += ` GROUP BY ${groupClause}`;
    }

    if (options.limit) {
      sql += ` LIMIT $${paramIdx++}`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIdx++}`;
      params.push(options.offset);
    }

    return { sql: `${sql};`, params };
  }

  private static resolveTimeColumn(source: any): string | null {
    const candidates = [
      'started_at',
      'posted_at',
      'created_at',
      'enrolled_at',
      'scheduled_start_at',
      'due_at',
      'reviewed_at',
      'start_at',
    ];
    for (const c of candidates) {
      if (source.allowedDimensions.includes(c)) {
        return c;
      }
    }
    return null;
  }
}
