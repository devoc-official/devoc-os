import { Router } from 'express';
import { EvaluationTemplateController } from './evaluation-template.controller.js';
import { EvaluationController } from './evaluation.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';

export const evaluationRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

const templateCtrl = new EvaluationTemplateController();
const evalCtrl = new EvaluationController();

// History endpoint MUST come before /evaluations/:id so 'history' is not matched as an id
tenantProtected.get('/evaluations/history/:id', requireRole(['org_admin', 'org_member']), evalCtrl.getHistorySnapshot);
tenantProtected.get('/organizations/:organizationId/evaluations/history/:id', requireRole(['org_admin', 'org_member']), evalCtrl.getHistorySnapshot);

// --- EVALUATION TEMPLATES ---
tenantProtected.get('/evaluation-templates', requireRole(['org_admin', 'org_member']), templateCtrl.listTemplates);
tenantProtected.post('/evaluation-templates', requireOrgAdmin, templateCtrl.createTemplate);
tenantProtected.get('/evaluation-templates/:id', requireRole(['org_admin', 'org_member']), templateCtrl.getTemplate);
tenantProtected.put('/evaluation-templates/:id', requireOrgAdmin, templateCtrl.updateTemplate);
tenantProtected.delete('/evaluation-templates/:id', requireOrgAdmin, templateCtrl.deleteTemplate);

tenantProtected.get('/organizations/:organizationId/evaluation-templates', requireRole(['org_admin', 'org_member']), templateCtrl.listTemplates);
tenantProtected.post('/organizations/:organizationId/evaluation-templates', requireOrgAdmin, templateCtrl.createTemplate);
tenantProtected.get('/organizations/:organizationId/evaluation-templates/:id', requireRole(['org_admin', 'org_member']), templateCtrl.getTemplate);
tenantProtected.put('/organizations/:organizationId/evaluation-templates/:id', requireOrgAdmin, templateCtrl.updateTemplate);
tenantProtected.delete('/organizations/:organizationId/evaluation-templates/:id', requireOrgAdmin, templateCtrl.deleteTemplate);

// --- EVALUATIONS ---
tenantProtected.get('/evaluations', requireRole(['org_admin', 'org_member']), evalCtrl.listEvaluations);
tenantProtected.post('/evaluations', requireRole(['org_admin', 'org_member']), evalCtrl.createEvaluation);
tenantProtected.get('/evaluations/:id', requireRole(['org_admin', 'org_member']), evalCtrl.getEvaluation);
tenantProtected.patch('/evaluations/:id', requireRole(['org_admin', 'org_member']), evalCtrl.updateEvaluation);

tenantProtected.post('/evaluations/:id/submit', requireRole(['org_admin', 'org_member']), evalCtrl.submitEvaluation);
tenantProtected.post('/evaluations/:id/complete', requireRole(['org_admin', 'org_member']), evalCtrl.completeEvaluation);
tenantProtected.post('/evaluations/:id/cancel', requireRole(['org_admin', 'org_member']), evalCtrl.cancelEvaluation);
tenantProtected.post('/evaluations/:id/reopen', requireRole(['org_admin', 'org_member']), evalCtrl.reopenEvaluation);

tenantProtected.get('/evaluations/:id/criteria', requireRole(['org_admin', 'org_member']), evalCtrl.getCriteriaResults);
tenantProtected.post('/evaluations/:id/criteria/:criterionId/result', requireRole(['org_admin', 'org_member']), evalCtrl.submitCriterionResult);
tenantProtected.post('/evaluations/:id/feedback', requireRole(['org_admin', 'org_member']), evalCtrl.addFeedback);

// Org-scoped variants
tenantProtected.get('/organizations/:organizationId/evaluations', requireRole(['org_admin', 'org_member']), evalCtrl.listEvaluations);
tenantProtected.post('/organizations/:organizationId/evaluations', requireRole(['org_admin', 'org_member']), evalCtrl.createEvaluation);
tenantProtected.get('/organizations/:organizationId/evaluations/:id', requireRole(['org_admin', 'org_member']), evalCtrl.getEvaluation);
tenantProtected.patch('/organizations/:organizationId/evaluations/:id', requireRole(['org_admin', 'org_member']), evalCtrl.updateEvaluation);

tenantProtected.post('/organizations/:organizationId/evaluations/:id/submit', requireRole(['org_admin', 'org_member']), evalCtrl.submitEvaluation);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/complete', requireRole(['org_admin', 'org_member']), evalCtrl.completeEvaluation);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/cancel', requireRole(['org_admin', 'org_member']), evalCtrl.cancelEvaluation);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/reopen', requireRole(['org_admin', 'org_member']), evalCtrl.reopenEvaluation);

tenantProtected.get('/organizations/:organizationId/evaluations/:id/criteria', requireRole(['org_admin', 'org_member']), evalCtrl.getCriteriaResults);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/criteria/:criterionId/result', requireRole(['org_admin', 'org_member']), evalCtrl.submitCriterionResult);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/feedback', requireRole(['org_admin', 'org_member']), evalCtrl.addFeedback);

evaluationRouter.use(tenantProtected);
