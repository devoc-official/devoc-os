import { Request, Response } from 'express';
import { MetricDefinitionService } from '../application/metric-definition.service.js';
import { AnalyticsComputationService } from '../application/computation.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { resolveContextualAuthScope, validateContextualFilters } from './analytics-auth.middleware.js';

export class AnalyticsMetricController {
  private metricService: MetricDefinitionService;
  private computationService: AnalyticsComputationService;

  constructor(
    metricService?: MetricDefinitionService,
    computationService?: AnalyticsComputationService
  ) {
    this.metricService = metricService || new MetricDefinitionService();
    this.computationService = computationService || new AnalyticsComputationService();
  }

  public createMetric = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const metric = await this.metricService.createMetricDefinition(
        orgId,
        req.body,
        req.user?.id
      );

      sendSuccess(res, metric, 201, {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };

  public listMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const filters = {
        domainModule: req.query.domainModule as string | undefined,
        metricType: req.query.metricType as string | undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : undefined,
      };

      const { data, total } = await this.metricService.listMetricDefinitions(
        orgId,
        filters,
        limit,
        offset
      );

      sendSuccess(res, data, 200, {
        total,
        limit,
        offset,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };

  public getMetric = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const metric = await this.metricService.getMetricDefinition(orgId, id);

      sendSuccess(res, metric, 200, {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };

  public computeMetric = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const authScope = await resolveContextualAuthScope(req, orgId);
      validateContextualFilters(req.body?.dimensionFilters, authScope);

      const result = await this.computationService.computeMetric(
        orgId,
        id,
        req.body,
        authScope
      );

      sendSuccess(res, result, 200, {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };
}
