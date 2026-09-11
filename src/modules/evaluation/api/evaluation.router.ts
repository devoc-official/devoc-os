import { Router } from 'express';
import { EvaluationTemplateController } from './evaluation-template.controller.js';
import { EvaluationController } from './evaluation.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';

export const evaluationRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

const templateCtrl = new EvaluationTemplateController();
const evalCtrl = new EvaluationController();

// History endpoint MUST come before /evaluations/:id so 'history' is not matched as an id
tenantProtected.get('/evaluations/history/:id', evalCtrl.getHistorySnapshot);
tenantProtected.get('/organizations/:organizationId/evaluations/history/:id', evalCtrl.getHistorySnapshot);

// --- EVALUATION TEMPLATES ---
tenantProtected.get('/evaluation-templates', templateCtrl.listTemplates);
tenantProtected.post('/evaluation-templates', templateCtrl.createTemplate);
tenantProtected.get('/evaluation-templates/:id', templateCtrl.getTemplate);
tenantProtected.put('/evaluation-templates/:id', templateCtrl.updateTemplate);
tenantProtected.delete('/evaluation-templates/:id', templateCtrl.deleteTemplate);

tenantProtected.get('/organizations/:organizationId/evaluation-templates', templateCtrl.listTemplates);
tenantProtected.post('/organizations/:organizationId/evaluation-templates', templateCtrl.createTemplate);
tenantProtected.get('/organizations/:organizationId/evaluation-templates/:id', templateCtrl.getTemplate);
tenantProtected.put('/organizations/:organizationId/evaluation-templates/:id', templateCtrl.updateTemplate);
tenantProtected.delete('/organizations/:organizationId/evaluation-templates/:id', templateCtrl.deleteTemplate);

// --- EVALUATIONS ---
tenantProtected.get('/evaluations', evalCtrl.listEvaluations);
tenantProtected.post('/evaluations', evalCtrl.createEvaluation);
tenantProtected.get('/evaluations/:id', evalCtrl.getEvaluation);
tenantProtected.patch('/evaluations/:id', evalCtrl.updateEvaluation);

tenantProtected.post('/evaluations/:id/submit', evalCtrl.submitEvaluation);
tenantProtected.post('/evaluations/:id/complete', evalCtrl.completeEvaluation);
tenantProtected.post('/evaluations/:id/cancel', evalCtrl.cancelEvaluation);
tenantProtected.post('/evaluations/:id/reopen', evalCtrl.reopenEvaluation);

tenantProtected.get('/evaluations/:id/criteria', evalCtrl.getCriteriaResults);
tenantProtected.post('/evaluations/:id/criteria/:criterionId/result', evalCtrl.submitCriterionResult);
tenantProtected.post('/evaluations/:id/feedback', evalCtrl.addFeedback);

// Org-scoped variants
tenantProtected.get('/organizations/:organizationId/evaluations', evalCtrl.listEvaluations);
tenantProtected.post('/organizations/:organizationId/evaluations', evalCtrl.createEvaluation);
tenantProtected.get('/organizations/:organizationId/evaluations/:id', evalCtrl.getEvaluation);
tenantProtected.patch('/organizations/:organizationId/evaluations/:id', evalCtrl.updateEvaluation);

tenantProtected.post('/organizations/:organizationId/evaluations/:id/submit', evalCtrl.submitEvaluation);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/complete', evalCtrl.completeEvaluation);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/cancel', evalCtrl.cancelEvaluation);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/reopen', evalCtrl.reopenEvaluation);

tenantProtected.get('/organizations/:organizationId/evaluations/:id/criteria', evalCtrl.getCriteriaResults);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/criteria/:criterionId/result', evalCtrl.submitCriterionResult);
tenantProtected.post('/organizations/:organizationId/evaluations/:id/feedback', evalCtrl.addFeedback);

evaluationRouter.use(tenantProtected);
