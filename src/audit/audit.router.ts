import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { resolveTenant } from '../tenant/tenant.middleware.js';

export const auditRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

const ctrl = new AuditController();

// --- AUDIT LOGS ---
tenantProtected.get('/audit', ctrl.listAuditLogs);
tenantProtected.get('/audit/entities/:entityType/:entityId', ctrl.getEntityTimeline);
tenantProtected.get('/audit/events/registry', ctrl.listEventRegistry);
tenantProtected.get('/audit/events/outbox', ctrl.getOutboxHealth);
tenantProtected.post('/audit/events/outbox/:id/retry', ctrl.retryOutboxEvent);
tenantProtected.get('/audit/:id', ctrl.getAuditLog);

tenantProtected.get('/organizations/:organizationId/audit', ctrl.listAuditLogs);
tenantProtected.get('/organizations/:organizationId/audit/entities/:entityType/:entityId', ctrl.getEntityTimeline);
tenantProtected.get('/organizations/:organizationId/audit/events/registry', ctrl.listEventRegistry);
tenantProtected.get('/organizations/:organizationId/audit/events/outbox', ctrl.getOutboxHealth);
tenantProtected.post('/organizations/:organizationId/audit/events/outbox/:id/retry', ctrl.retryOutboxEvent);
tenantProtected.get('/organizations/:organizationId/audit/:id', ctrl.getAuditLog);

auditRouter.use(tenantProtected);
