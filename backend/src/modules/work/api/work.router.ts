import { Router } from 'express';
import { WorkCategoryController } from './work-category.controller.js';
import { WorkController } from './work.controller.js';
import { OutcomeController } from './outcome.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';

export const workRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

// --- WORK CATEGORIES ENDPOINTS ---
tenantProtected.get('/work-categories', requireRole(['org_admin', 'org_member']), WorkCategoryController.listCategories);
tenantProtected.post('/work-categories', requireRole(['org_admin', 'org_member']), WorkCategoryController.createCategory);
tenantProtected.patch('/work-categories/:categoryId', requireRole(['org_admin', 'org_member']), WorkCategoryController.updateCategory);

tenantProtected.get('/organizations/:organizationId/work-categories', requireRole(['org_admin', 'org_member']), WorkCategoryController.listCategories);
tenantProtected.post('/organizations/:organizationId/work-categories', requireRole(['org_admin', 'org_member']), WorkCategoryController.createCategory);
tenantProtected.patch('/organizations/:organizationId/work-categories/:categoryId', requireRole(['org_admin', 'org_member']), WorkCategoryController.updateCategory);


// --- WORK RECORDS ENDPOINTS ---
tenantProtected.get('/work', requireRole(['org_admin', 'org_member']), WorkController.listWorkRecords);
tenantProtected.post('/work', requireRole(['org_admin', 'org_member']), WorkController.createWorkRecord);
tenantProtected.get('/work/:workId', requireRole(['org_admin', 'org_member']), WorkController.getWorkRecordById);
tenantProtected.patch('/work/:workId', requireRole(['org_admin', 'org_member']), WorkController.updateWorkRecord);

// Work Lifecycle Transitions
tenantProtected.post('/work/:workId/submit', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('submitted'));
tenantProtected.post('/work/:workId/approve', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('approved'));
tenantProtected.post('/work/:workId/reject', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('rejected'));
tenantProtected.post('/work/:workId/cancel', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('cancelled'));

// Work Evidence
tenantProtected.get('/work/:workId/evidence', requireRole(['org_admin', 'org_member']), WorkController.listEvidence);
tenantProtected.post('/work/:workId/evidence', requireRole(['org_admin', 'org_member']), WorkController.addEvidence);
tenantProtected.delete('/work/:workId/evidence/:evidenceId', requireRole(['org_admin', 'org_member']), WorkController.removeEvidence);

// Work Outcomes linking
tenantProtected.get('/work/:workId/outcomes', requireRole(['org_admin', 'org_member']), WorkController.listWorkOutcomes);
tenantProtected.post('/work/:workId/outcomes', requireRole(['org_admin', 'org_member']), WorkController.linkOutcome);
tenantProtected.delete('/work/:workId/outcomes/:outcomeId', requireRole(['org_admin', 'org_member']), WorkController.unlinkOutcome);

// Explicit /organizations/:organizationId/work variants
tenantProtected.get('/organizations/:organizationId/work', requireRole(['org_admin', 'org_member']), WorkController.listWorkRecords);
tenantProtected.post('/organizations/:organizationId/work', requireRole(['org_admin', 'org_member']), WorkController.createWorkRecord);
tenantProtected.get('/organizations/:organizationId/work/:workId', requireRole(['org_admin', 'org_member']), WorkController.getWorkRecordById);
tenantProtected.patch('/organizations/:organizationId/work/:workId', requireRole(['org_admin', 'org_member']), WorkController.updateWorkRecord);

tenantProtected.post('/organizations/:organizationId/work/:workId/submit', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('submitted'));
tenantProtected.post('/organizations/:organizationId/work/:workId/approve', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('approved'));
tenantProtected.post('/organizations/:organizationId/work/:workId/reject', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('rejected'));
tenantProtected.post('/organizations/:organizationId/work/:workId/cancel', requireRole(['org_admin', 'org_member']), WorkController.createTransitionHandler('cancelled'));

tenantProtected.get('/organizations/:organizationId/work/:workId/evidence', requireRole(['org_admin', 'org_member']), WorkController.listEvidence);
tenantProtected.post('/organizations/:organizationId/work/:workId/evidence', requireRole(['org_admin', 'org_member']), WorkController.addEvidence);
tenantProtected.delete('/organizations/:organizationId/work/:workId/evidence/:evidenceId', requireRole(['org_admin', 'org_member']), WorkController.removeEvidence);

tenantProtected.get('/organizations/:organizationId/work/:workId/outcomes', requireRole(['org_admin', 'org_member']), WorkController.listWorkOutcomes);
tenantProtected.post('/organizations/:organizationId/work/:workId/outcomes', requireRole(['org_admin', 'org_member']), WorkController.linkOutcome);
tenantProtected.delete('/organizations/:organizationId/work/:workId/outcomes/:outcomeId', requireRole(['org_admin', 'org_member']), WorkController.unlinkOutcome);


// --- OUTCOMES ENDPOINTS ---
tenantProtected.get('/outcomes', requireRole(['org_admin', 'org_member']), OutcomeController.listOutcomes);
tenantProtected.post('/outcomes', requireRole(['org_admin', 'org_member']), OutcomeController.createOutcome);
tenantProtected.get('/outcomes/:outcomeId', requireRole(['org_admin', 'org_member']), OutcomeController.getOutcomeById);

tenantProtected.get('/organizations/:organizationId/outcomes', requireRole(['org_admin', 'org_member']), OutcomeController.listOutcomes);
tenantProtected.post('/organizations/:organizationId/outcomes', requireRole(['org_admin', 'org_member']), OutcomeController.createOutcome);
tenantProtected.get('/organizations/:organizationId/outcomes/:outcomeId', requireRole(['org_admin', 'org_member']), OutcomeController.getOutcomeById);

workRouter.use(tenantProtected);
