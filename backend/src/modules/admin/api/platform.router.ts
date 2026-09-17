import { Router } from 'express';
import { PlatformAdminController } from './platform-admin.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { requirePlatformAdmin } from '../../../permissions/permissions.middleware.js';

export const platformRouter = Router();

// Platform Admin Authentication & Authorization Barrier
platformRouter.use(authenticate, requirePlatformAdmin);

// Organization Provisioning & Lifecycle
platformRouter.post('/organizations', PlatformAdminController.provisionOrganization);
platformRouter.get('/organizations', PlatformAdminController.listOrganizations);
platformRouter.get('/organizations/:id', PlatformAdminController.getOrganization);
platformRouter.patch('/organizations/:id/status', PlatformAdminController.updateOrganizationStatus);
// Compatibility aliases (canonical route is PATCH /organizations/:id/status)
platformRouter.post('/organizations/:id/suspend', (req, res) => {
  req.body = { ...req.body, status: 'suspended' };
  return PlatformAdminController.updateOrganizationStatus(req, res);
});
platformRouter.post('/organizations/:id/reactivate', (req, res) => {
  req.body = { ...req.body, status: 'active' };
  return PlatformAdminController.updateOrganizationStatus(req, res);
});

// Global Platform Settings
platformRouter.get('/settings', PlatformAdminController.listSettings);
platformRouter.get('/settings/:key', PlatformAdminController.getSetting);
platformRouter.put('/settings/:key', PlatformAdminController.updateSetting);

// Global Feature Configurations
platformRouter.get('/features', PlatformAdminController.listFeatures);
platformRouter.get('/features/:featureKey', PlatformAdminController.getFeature);
platformRouter.put('/features/:featureKey', PlatformAdminController.updateFeature);
