import { Request, Response } from 'express';
import { SavedReportService } from '../application/saved-report.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { resolveContextualAuthScope } from './analytics-auth.middleware.js';

export class AnalyticsReportController {
  private reportService: SavedReportService;

  constructor(reportService?: SavedReportService) {
    this.reportService = reportService || new SavedReportService();
  }

  public createReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const report = await this.reportService.createReport(
        orgId,
        req.body,
        req.user?.id
      );

      sendSuccess(res, report, 201, {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };

  public listReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const isAdmin =
        req.tenantContext!.role === 'org_admin' || req.user?.isPlatformAdmin === true;

      const { data, total } = await this.reportService.listReports(
        orgId,
        req.user?.id,
        isAdmin,
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

  public getReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const isAdmin =
        req.tenantContext!.role === 'org_admin' || req.user?.isPlatformAdmin === true;
      const report = await this.reportService.getReport(
        orgId,
        id,
        req.user?.id,
        isAdmin
      );

      sendSuccess(res, report, 200, {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };

  public executeReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const authScope = await resolveContextualAuthScope(req, orgId);

      const executedResult = await this.reportService.executeReport(
        orgId,
        id,
        req.body,
        authScope
      );

      sendSuccess(res, executedResult, 200, {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };
}
