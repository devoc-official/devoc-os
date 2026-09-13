import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';
import { OutboxService } from '../events/outbox.service.js';
import { EventRegistryService } from '../events/event-registry.js';
import { sendSuccess } from '../shared/http/envelope.js';
import { ValidationError } from '../shared/errors/index.js';

const getOrgId = (req: Request): string => {
  const headerOrgId = req.headers['x-organization-id'];
  const paramOrgId = req.params.organizationId;
  const ctxOrgId = req.tenantContext?.organizationId;
  const orgId = (ctxOrgId || headerOrgId || paramOrgId) as string;
  if (!orgId) throw new ValidationError('Organization context is required');
  return Array.isArray(orgId) ? orgId[0] : orgId;
};

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class AuditController {
  public listAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { entityType, entityId, actorId, action, correlationId, startDate, endDate, limit, offset } = req.query;

      const lim = limit ? parseInt(limit as string, 10) : 50;
      const off = offset ? parseInt(offset as string, 10) : 0;

      const result = await AuditService.listLogsForTenant(
        organizationId,
        {
          entityType: entityType as string,
          entityId: entityId as string,
          actorId: actorId as string,
          action: action as string,
          correlationId: correlationId as string,
          startDate: startDate as string,
          endDate: endDate as string,
        },
        lim,
        off
      );

      sendSuccess(res, result.data, 200, { total: result.total, limit: lim, offset: off });
    } catch (err) {
      next(err);
    }
  };

  public getAuditLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const record = await AuditService.getLogById(organizationId, id);
      sendSuccess(res, record);
    } catch (err) {
      next(err);
    }
  };

  public getEntityTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const entityType = getParamId(req, 'entityType');
      const entityId = getParamId(req, 'entityId');

      const records = await AuditService.listLogsForEntity(organizationId, entityType, entityId);
      sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  };

  public listEventRegistry = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registry = await EventRegistryService.listRegisteredEvents();
      sendSuccess(res, registry);
    } catch (err) {
      next(err);
    }
  };

  public getOutboxHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const summary = await OutboxService.getOutboxStatusSummary(organizationId);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  };

  public retryOutboxEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const record = await OutboxService.retryEvent(organizationId, id);
      sendSuccess(res, record);
    } catch (err) {
      next(err);
    }
  };
}
