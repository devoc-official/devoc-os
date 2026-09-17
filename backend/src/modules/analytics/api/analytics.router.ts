import { Router } from 'express';
import { AnalyticsMetricController } from './analytics-metric.controller.js';
import { AnalyticsReportController } from './analytics-report.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireAnalyticsPermission } from './analytics-auth.middleware.js';

export const analyticsRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

const metricCtrl = new AnalyticsMetricController();
const reportCtrl = new AnalyticsReportController();

// --- METRIC DEFINITION ENDPOINTS ---
tenantProtected.post(
  '/analytics/metrics',
  requireAnalyticsPermission('analytics:define'),
  metricCtrl.createMetric
);
tenantProtected.get(
  '/analytics/metrics',
  requireAnalyticsPermission('analytics:view'),
  metricCtrl.listMetrics
);
tenantProtected.get(
  '/analytics/metrics/:id',
  requireAnalyticsPermission('analytics:view'),
  metricCtrl.getMetric
);
tenantProtected.post(
  '/analytics/metrics/:id/compute',
  requireAnalyticsPermission('analytics:view'),
  metricCtrl.computeMetric
);

// Organization-scoped variants for metrics
tenantProtected.post(
  '/organizations/:organizationId/analytics/metrics',
  requireAnalyticsPermission('analytics:define'),
  metricCtrl.createMetric
);
tenantProtected.get(
  '/organizations/:organizationId/analytics/metrics',
  requireAnalyticsPermission('analytics:view'),
  metricCtrl.listMetrics
);
tenantProtected.get(
  '/organizations/:organizationId/analytics/metrics/:id',
  requireAnalyticsPermission('analytics:view'),
  metricCtrl.getMetric
);
tenantProtected.post(
  '/organizations/:organizationId/analytics/metrics/:id/compute',
  requireAnalyticsPermission('analytics:view'),
  metricCtrl.computeMetric
);

// --- SAVED REPORT ENDPOINTS ---
tenantProtected.post(
  '/analytics/reports',
  requireAnalyticsPermission('analytics:define'),
  reportCtrl.createReport
);
tenantProtected.get(
  '/analytics/reports',
  requireAnalyticsPermission('analytics:view'),
  reportCtrl.listReports
);
tenantProtected.get(
  '/analytics/reports/:id',
  requireAnalyticsPermission('analytics:view'),
  reportCtrl.getReport
);
tenantProtected.post(
  '/analytics/reports/:id/execute',
  requireAnalyticsPermission('analytics:view'),
  reportCtrl.executeReport
);

// Organization-scoped variants for reports
tenantProtected.post(
  '/organizations/:organizationId/analytics/reports',
  requireAnalyticsPermission('analytics:define'),
  reportCtrl.createReport
);
tenantProtected.get(
  '/organizations/:organizationId/analytics/reports',
  requireAnalyticsPermission('analytics:view'),
  reportCtrl.listReports
);
tenantProtected.get(
  '/organizations/:organizationId/analytics/reports/:id',
  requireAnalyticsPermission('analytics:view'),
  reportCtrl.getReport
);
tenantProtected.post(
  '/organizations/:organizationId/analytics/reports/:id/execute',
  requireAnalyticsPermission('analytics:view'),
  reportCtrl.executeReport
);

analyticsRouter.use(tenantProtected);
