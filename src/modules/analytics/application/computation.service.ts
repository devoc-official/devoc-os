import { v4 as uuidv4 } from 'uuid';
import { getDbClient } from '../../../database/index.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { MetricDefinitionRepository } from '../infrastructure/metric-definition.repository.js';
import { MetricResultRepository } from '../infrastructure/metric-result.repository.js';
import { AnalyticsQueryBuilder, ContextualAuthScope } from './query-builder.js';
import { PeriodType, MetricResultDto } from '../domain/metric-result.entity.js';
import { MetricDefinition } from '../domain/metric-definition.entity.js';
import { validateContextualFilters } from '../api/analytics-auth.middleware.js';

export interface ComputeOptions {
  periodType?: PeriodType;
  startDate?: string;
  endDate?: string;
  dimensionFilters?: Record<string, any>;
  useSnapshot?: boolean;
  calculationVersion?: number;
  persistSnapshot?: boolean;
  groupBy?: string[];
}

export interface GroupedMetricResultItem {
  groupKey: Record<string, any>;
  numericValue: number;
  details?: Record<string, any> | null;
}

export class AnalyticsComputationService {
  private metricRepo: MetricDefinitionRepository;
  private resultRepo: MetricResultRepository;

  constructor(
    metricRepo?: MetricDefinitionRepository,
    resultRepo?: MetricResultRepository
  ) {
    this.metricRepo = metricRepo || new MetricDefinitionRepository();
    this.resultRepo = resultRepo || new MetricResultRepository();
  }

  public async computeMetric(
    organizationId: string,
    metricDefinitionId: string,
    options: ComputeOptions = {},
    authScope?: ContextualAuthScope
  ): Promise<MetricResultDto & { groupedResults?: GroupedMetricResultItem[] }> {
    const metric = await this.metricRepo.getById(organizationId, metricDefinitionId);

    const periodType: PeriodType = options.periodType || 'month';
    const periodStart = options.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const periodEnd = options.endDate || new Date().toISOString();
    const dimensionFilters = options.dimensionFilters || {};

    // Check pre-computed snapshot if requested
    if (options.useSnapshot) {
      const snapshot = await this.resultRepo.getLatestSnapshot(
        organizationId,
        metricDefinitionId,
        periodType,
        periodStart,
        options.calculationVersion
      );

      if (snapshot) {
        return {
          metricDefinitionId: snapshot.metricDefinitionId,
          code: metric.code,
          periodType: snapshot.periodType,
          periodStart: new Date(snapshot.periodStart).toISOString(),
          periodEnd: new Date(snapshot.periodEnd).toISOString(),
          dimensionValues: snapshot.dimensionValues,
          numericValue: snapshot.numericValue,
          details: snapshot.details,
          calculationVersion: snapshot.calculationVersion,
          calculationRunId: snapshot.calculationRunId,
          calculatedAt: new Date(snapshot.calculatedAt).toISOString(),
        };
      }
    }

    // Live calculation
    const computationResult = await this.executeLiveCalculation(
      organizationId,
      metric,
      {
        ...options,
        periodType,
        startDate: periodStart,
        endDate: periodEnd,
        dimensionFilters,
      },
      authScope
    );

    const calculationRunId = uuidv4();
    const calculatedAt = new Date().toISOString();

    let calculationVersion = 1;
    if (options.persistSnapshot || options.useSnapshot) {
      const savedSnapshot = await this.resultRepo.create(organizationId, {
        metricDefinitionId: metric.id,
        periodType,
        periodStart,
        periodEnd,
        dimensionValues: dimensionFilters,
        numericValue: computationResult.numericValue,
        details: computationResult.details,
        calculationRunId,
        calculatedAt: new Date(calculatedAt),
      });
      calculationVersion = savedSnapshot.calculationVersion;
    }

    return {
      metricDefinitionId: metric.id,
      code: metric.code,
      periodType,
      periodStart,
      periodEnd,
      dimensionValues: dimensionFilters,
      numericValue: computationResult.numericValue,
      details: computationResult.details,
      calculationVersion,
      calculationRunId,
      calculatedAt,
      groupedResults: computationResult.groupedResults,
    };
  }

  private async executeLiveCalculation(
    organizationId: string,
    metric: MetricDefinition,
    options: ComputeOptions,
    authScope?: ContextualAuthScope
  ): Promise<{
    numericValue: number;
    details: Record<string, any>;
    groupedResults?: GroupedMetricResultItem[];
  }> {
    const db = getDbClient();
    const spec = metric.calculationSpec as any;

    if (authScope) {
      if (options.dimensionFilters) {
        validateContextualFilters(options.dimensionFilters, authScope);
      }
      if (spec.filter) {
        validateContextualFilters(spec.filter, authScope);
      }
      if (spec.numerator?.filter) {
        validateContextualFilters(spec.numerator.filter, authScope);
      }
      if (spec.denominator?.filter) {
        validateContextualFilters(spec.denominator.filter, authScope);
      }
    }

    // PERCENTAGE or RATE with numerator and denominator
    if (metric.metricType === 'PERCENTAGE' || metric.metricType === 'RATE' || (spec.numerator && spec.denominator)) {
      const numSpec = spec.numerator;
      const denSpec = spec.denominator;

      if (!numSpec || !denSpec) {
        throw new ValidationError('Ratio metrics require both numerator and denominator in calculationSpec');
      }

      const numMergedFilters = { ...(numSpec.filter || {}), ...(options.dimensionFilters || {}) };
      const denMergedFilters = { ...(denSpec.filter || {}), ...(options.dimensionFilters || {}) };

      const numQuery = AnalyticsQueryBuilder.buildQuery(
        organizationId,
        {
          sourceEntity: numSpec.sourceEntity,
          aggregation: numSpec.aggregation || 'COUNT',
          field: numSpec.field,
          filters: numMergedFilters,
          startDate: options.startDate,
          endDate: options.endDate,
        },
        authScope
      );

      const denQuery = AnalyticsQueryBuilder.buildQuery(
        organizationId,
        {
          sourceEntity: denSpec.sourceEntity,
          aggregation: denSpec.aggregation || 'COUNT',
          field: denSpec.field,
          filters: denMergedFilters,
          startDate: options.startDate,
          endDate: options.endDate,
        },
        authScope
      );

      const [numRes, denRes] = await Promise.all([
        db.query<any>(numQuery.sql, numQuery.params),
        db.query<any>(denQuery.sql, denQuery.params),
      ]);

      const numCount = parseFloat(numRes.rows[0]?.metric_value || '0');
      const denCount = parseFloat(denRes.rows[0]?.metric_value || '0');

      let rawValue = 0;
      if (denCount > 0) {
        rawValue = metric.metricType === 'RATE'
          ? numCount / denCount
          : (numCount / denCount) * 100;
      }

      const numericValue = Math.round(rawValue * 10000) / 10000;

      return {
        numericValue,
        details: {
          numeratorCount: numCount,
          denominatorCount: denCount,
        },
      };
    }

    // TREND calculation
    if (metric.metricType === 'TREND') {
      const currentQuery = AnalyticsQueryBuilder.buildQuery(
        organizationId,
        {
          sourceEntity: spec.sourceEntity,
          aggregation: spec.aggregation || 'COUNT',
          field: spec.field,
          filters: { ...(spec.filter || {}), ...(options.dimensionFilters || {}) },
          startDate: options.startDate,
          endDate: options.endDate,
        },
        authScope
      );

      const currentRes = await db.query<any>(currentQuery.sql, currentQuery.params);
      const currentValue = parseFloat(currentRes.rows[0]?.metric_value || '0');

      // Previous period calculation
      let previousValue = 0;
      let changePercent = 0;

      if (options.startDate && options.endDate) {
        const start = new Date(options.startDate).getTime();
        const end = new Date(options.endDate).getTime();
        const duration = end - start;
        const prevStart = new Date(start - duration).toISOString();
        const prevEnd = new Date(start).toISOString();

        const prevQuery = AnalyticsQueryBuilder.buildQuery(
          organizationId,
          {
            sourceEntity: spec.sourceEntity,
            aggregation: spec.aggregation || 'COUNT',
            field: spec.field,
            filters: { ...(spec.filter || {}), ...(options.dimensionFilters || {}) },
            startDate: prevStart,
            endDate: prevEnd,
          },
          authScope
        );

        const prevRes = await db.query<any>(prevQuery.sql, prevQuery.params);
        previousValue = parseFloat(prevRes.rows[0]?.metric_value || '0');

        if (previousValue > 0) {
          changePercent = ((currentValue - previousValue) / previousValue) * 100;
        }
      }

      return {
        numericValue: Math.round(currentValue * 10000) / 10000,
        details: {
          currentValue,
          previousValue,
          changePercent: Math.round(changePercent * 10000) / 10000,
        },
      };
    }

    // Single source aggregation: COUNT, SUM, AVERAGE, WEIGHTED_AGGREGATION
    const mergedFilters = { ...(spec.filter || {}), ...(options.dimensionFilters || {}) };

    const query = AnalyticsQueryBuilder.buildQuery(
      organizationId,
      {
        sourceEntity: spec.sourceEntity,
        aggregation: metric.metricType,
        field: spec.field,
        weightField: spec.weightField,
        filters: mergedFilters,
        groupBy: options.groupBy,
        startDate: options.startDate,
        endDate: options.endDate,
      },
      authScope
    );

    const queryRes = await db.query<any>(query.sql, query.params);

    if (options.groupBy && options.groupBy.length > 0) {
      const groupedResults: GroupedMetricResultItem[] = queryRes.rows.map((row: any) => {
        const groupKey: Record<string, any> = {};
        for (const dim of options.groupBy!) {
          groupKey[dim] = row[dim];
        }
        const val = parseFloat(row.metric_value || '0');
        return {
          groupKey,
          numericValue: Math.round(val * 10000) / 10000,
          details: { totalCount: parseInt(row.total_count || '0', 10) },
        };
      });

      const totalVal = groupedResults.reduce((acc, curr) => acc + curr.numericValue, 0);
      return {
        numericValue: Math.round(totalVal * 10000) / 10000,
        details: { rowCount: queryRes.rows.length },
        groupedResults,
      };
    }

    const val = parseFloat(queryRes.rows[0]?.metric_value || '0');
    const totalCount = parseInt(queryRes.rows[0]?.total_count || '0', 10);
    const numericValue = Math.round(val * 10000) / 10000;

    return {
      numericValue,
      details: {
        totalCount,
      },
    };
  }
}
