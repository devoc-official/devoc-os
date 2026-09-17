import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { resolveTenant } from '../tenant/tenant.middleware.js';
import { requireOrgAdmin } from '../permissions/permissions.middleware.js';

export const auditRouter = Router();

const ctrl = new AuditController();
const authAndAdmin = [authenticate, resolveTenant, requireOrgAdmin];

// --- AUDIT LOGS ---
auditRouter.get('/audit', authAndAdmin, ctrl.listAuditLogs);
auditRouter.get('/audit/entities/:entityType/:entityId', authAndAdmin, ctrl.getEntityTimeline);
auditRouter.get('/audit/events/registry', authAndAdmin, ctrl.listEventRegistry);
auditRouter.get('/audit/events/outbox', authAndAdmin, ctrl.getOutboxHealth);
auditRouter.post('/audit/events/outbox/:id/retry', authAndAdmin, ctrl.retryOutboxEvent);
auditRouter.get('/audit/:id', authAndAdmin, ctrl.getAuditLog);

auditRouter.get('/organizations/:organizationId/audit', authAndAdmin, ctrl.listAuditLogs);
auditRouter.get('/organizations/:organizationId/audit/entities/:entityType/:entityId', authAndAdmin, ctrl.getEntityTimeline);
auditRouter.get('/organizations/:organizationId/audit/events/registry', authAndAdmin, ctrl.listEventRegistry);
auditRouter.get('/organizations/:organizationId/audit/events/outbox', authAndAdmin, ctrl.getOutboxHealth);
auditRouter.post('/organizations/:organizationId/audit/events/outbox/:id/retry', authAndAdmin, ctrl.retryOutboxEvent);
auditRouter.get('/organizations/:organizationId/audit/:id', authAndAdmin, ctrl.getAuditLog);

