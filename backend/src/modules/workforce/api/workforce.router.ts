import { Router } from 'express';
import { WorkforceController } from './workforce.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireCapability } from '../../../permissions/permissions.middleware.js';

export const workforceRouter = Router();

const tenantProtected = Router({ mergeParams: true });
tenantProtected.use(authenticate, resolveTenant);

// --- ONBOARDING PLANS ---
tenantProtected.post(
  '/organizations/:orgId/workforce/onboarding-plans',
  requireCapability('workforce:create'),
  WorkforceController.createOnboardingPlan
);
tenantProtected.get(
  '/organizations/:orgId/workforce/onboarding-plans',
  requireCapability('workforce:view'),
  WorkforceController.listOnboardingPlans
);
tenantProtected.get(
  '/organizations/:orgId/workforce/onboarding-plans/:id',
  requireCapability('workforce:view'),
  WorkforceController.getOnboardingPlan
);

// --- TRANSFERS ---
tenantProtected.post(
  '/organizations/:orgId/workforce/transfers',
  requireCapability('workforce:create'),
  WorkforceController.createTransfer
);
tenantProtected.get(
  '/organizations/:orgId/workforce/transfers',
  requireCapability('workforce:view'),
  WorkforceController.listTransfers
);
tenantProtected.get(
  '/organizations/:orgId/workforce/transfers/:id',
  requireCapability('workforce:view'),
  WorkforceController.getTransfer
);
tenantProtected.patch(
  '/organizations/:orgId/workforce/transfers/:id/approve',
  requireCapability('workforce:approve'),
  WorkforceController.approveTransfer
);
tenantProtected.post(
  '/organizations/:orgId/workforce/transfers/:id/approve',
  requireCapability('workforce:approve'),
  WorkforceController.approveTransfer
);

// --- PROMOTIONS ---
tenantProtected.post(
  '/organizations/:orgId/workforce/promotions',
  requireCapability('workforce:create'),
  WorkforceController.createPromotion
);
tenantProtected.get(
  '/organizations/:orgId/workforce/promotions',
  requireCapability('workforce:view'),
  WorkforceController.listPromotions
);
tenantProtected.get(
  '/organizations/:orgId/workforce/promotions/:id',
  requireCapability('workforce:view'),
  WorkforceController.getPromotion
);
tenantProtected.patch(
  '/organizations/:orgId/workforce/promotions/:id/approve',
  requireCapability('workforce:approve'),
  WorkforceController.approvePromotion
);
tenantProtected.post(
  '/organizations/:orgId/workforce/promotions/:id/approve',
  requireCapability('workforce:approve'),
  WorkforceController.approvePromotion
);

// --- OFFBOARDINGS ---
tenantProtected.post(
  '/organizations/:orgId/workforce/offboardings',
  requireCapability('workforce:create'),
  WorkforceController.initiateOffboarding
);
tenantProtected.get(
  '/organizations/:orgId/workforce/offboardings',
  requireCapability('workforce:view'),
  WorkforceController.listOffboardings
);
tenantProtected.get(
  '/organizations/:orgId/workforce/offboardings/:id',
  requireCapability('workforce:view'),
  WorkforceController.getOffboarding
);
tenantProtected.patch(
  '/organizations/:orgId/workforce/offboardings/:id/complete',
  requireCapability('workforce:approve'),
  WorkforceController.completeOffboarding
);
tenantProtected.post(
  '/organizations/:orgId/workforce/offboardings/:id/complete',
  requireCapability('workforce:approve'),
  WorkforceController.completeOffboarding
);

workforceRouter.use(tenantProtected);
