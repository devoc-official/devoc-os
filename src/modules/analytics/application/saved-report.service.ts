import { SavedReportRepository } from '../infrastructure/saved-report.repository.js';
import { MetricDefinitionRepository } from '../infrastructure/metric-definition.repository.js';
import { AnalyticsComputationService } from './computation.service.js';
import { ContextualAuthScope } from './query-builder.js';
import {
  SavedReport,
  CreateSavedReportInput,
  UpdateSavedReportInput,
  validateSavedReportInput,
} from '../domain/saved-report.entity.js';
import { ForbiddenError, NotFoundError } from '../../../shared/errors/index.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';

export interface ExecuteReportOverrides {
  overrideTimeWindow?: {
    periodType?: any;
    startDate?: string;
    endDate?: string;
  };
}

export interface ExecutedReportResult {
  reportId: string;
  reportName: string;
  executedAt: string;
  results: Array<{
    metricCode: string;
    metricName: string;
    groupKey?: Record<string, any>;
    numericValue: number;
    details?: Record<string, any> | null;
  }>;
}

export class SavedReportService {
  private reportRepo: SavedReportRepository;
  private metricRepo: MetricDefinitionRepository;
  private computationService: AnalyticsComputationService;

  constructor(
    reportRepo?: SavedReportRepository,
    metricRepo?: MetricDefinitionRepository,
    computationService?: AnalyticsComputationService
  ) {
    this.reportRepo = reportRepo || new SavedReportRepository();
    this.metricRepo = metricRepo || new MetricDefinitionRepository();
    this.computationService = computationService || new AnalyticsComputationService(this.metricRepo);
  }

  public async createReport(
    organizationId: string,
    input: CreateSavedReportInput,
    actorUserId?: string
  ): Promise<SavedReport> {
    validateSavedReportInput(input);

    // Verify all metric IDs exist in tenant
    for (const metricId of input.metricIds) {
      await this.metricRepo.getById(organizationId, metricId);
    }

    const report = await this.reportRepo.create(organizationId, input, actorUserId);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'ANALYTICS_REPORT_CREATED',
      entityType: 'analytics_report',
      entityId: report.id,
      payload: {
        name: report.name,
        isPublic: report.isPublic,
        metricCount: report.metricIds.length,
      },
    });

    eventBus.publish({
      eventName: 'analytics.report.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'analytics_report',
      entityId: report.id,
      payload: {
        name: report.name,
        isPublic: report.isPublic,
      },
    });

    return report;
  }

  public async getReport(
    organizationId: string,
    id: string,
    userId?: string,
    isAdmin: boolean = false
  ): Promise<SavedReport> {
    const report = await this.reportRepo.getById(organizationId, id);

    if (!report.isPublic && report.createdBy !== userId && !isAdmin) {
      throw new ForbiddenError('Access to private report is denied');
    }

    return report;
  }

  public async listReports(
    organizationId: string,
    userId?: string,
    isAdmin: boolean = false,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: SavedReport[]; total: number }> {
    return this.reportRepo.list(organizationId, userId, isAdmin, limit, offset);
  }

  public async updateReport(
    organizationId: string,
    id: string,
    input: UpdateSavedReportInput,
    actorUserId?: string,
    isAdmin: boolean = false
  ): Promise<SavedReport> {
    const existing = await this.reportRepo.getById(organizationId, id);

    if (existing.createdBy !== actorUserId && !isAdmin) {
      throw new ForbiddenError('Only the report creator or administrator can update this report');
    }

    if (input.metricIds) {
      for (const mId of input.metricIds) {
        await this.metricRepo.getById(organizationId, mId);
      }
    }

    const updated = await this.reportRepo.update(organizationId, id, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'ANALYTICS_REPORT_UPDATED',
      entityType: 'analytics_report',
      entityId: updated.id,
      payload: { name: updated.name, isPublic: updated.isPublic },
    });

    eventBus.publish({
      eventName: 'analytics.report.updated',
      organizationId,
      actorId: actorUserId,
      entityType: 'analytics_report',
      entityId: updated.id,
      payload: { name: updated.name, isPublic: updated.isPublic },
    });

    return updated;
  }

  public async executeReport(
    organizationId: string,
    id: string,
    overrides?: ExecuteReportOverrides,
    authScope?: ContextualAuthScope
  ): Promise<ExecutedReportResult> {
    const report = await this.reportRepo.getById(organizationId, id);

    // If report is private, check access
    if (!report.isPublic && report.createdBy !== authScope?.personId && authScope?.role !== 'org_admin' && !authScope?.isPlatformAdmin) {
      // If user is not admin and not creator
      // Check caller access
    }

    const timeWindow = {
      ...report.timeWindow,
      ...(overrides?.overrideTimeWindow || {}),
    };

    const results: ExecutedReportResult['results'] = [];

    for (const metricId of report.metricIds) {
      let metricDef;
      try {
        metricDef = await this.metricRepo.getById(organizationId, metricId);
      } catch (err) {
        if (err instanceof NotFoundError) {
          continue; // Metric removed or cross-tenant
        }
        throw err;
      }

      const computed = await this.computationService.computeMetric(
        organizationId,
        metricId,
        {
          periodType: timeWindow.periodType,
          startDate: timeWindow.startDate,
          endDate: timeWindow.endDate,
          dimensionFilters: report.filters,
          groupBy: report.groupBy && report.groupBy.length > 0 ? report.groupBy : undefined,
        },
        authScope
      );

      if (computed.groupedResults && computed.groupedResults.length > 0) {
        for (const grp of computed.groupedResults) {
          results.push({
            metricCode: metricDef.code,
            metricName: metricDef.name,
            groupKey: grp.groupKey,
            numericValue: grp.numericValue,
            details: grp.details,
          });
        }
      } else {
        results.push({
          metricCode: metricDef.code,
          metricName: metricDef.name,
          numericValue: computed.numericValue,
          details: computed.details,
        });
      }
    }

    return {
      reportId: report.id,
      reportName: report.name,
      executedAt: new Date().toISOString(),
      results,
    };
  }
}
