import { Router } from 'express';
import { RecruitmentController } from './recruitment.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireRole } from '../../../permissions/permissions.middleware.js';

export const recruitmentRouter = Router();

const tenantProtected = Router({ mergeParams: true });
tenantProtected.use(authenticate, resolveTenant);

const memberAccess = requireRole(['org_admin', 'org_member']);

// --- POSITIONS ---
tenantProtected.post('/organizations/:orgId/recruitment/positions', memberAccess, RecruitmentController.createPosition);
tenantProtected.get('/organizations/:orgId/recruitment/positions', memberAccess, RecruitmentController.listPositions);
tenantProtected.get('/organizations/:orgId/recruitment/positions/:id', memberAccess, RecruitmentController.getPosition);
tenantProtected.patch('/organizations/:orgId/recruitment/positions/:id', memberAccess, RecruitmentController.updatePosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/open', memberAccess, RecruitmentController.openPosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/pause', memberAccess, RecruitmentController.pausePosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/close', memberAccess, RecruitmentController.closePosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/archive', memberAccess, RecruitmentController.archivePosition);

// --- CANDIDATES ---
tenantProtected.post('/organizations/:orgId/recruitment/candidates', memberAccess, RecruitmentController.createCandidate);
tenantProtected.get('/organizations/:orgId/recruitment/candidates', memberAccess, RecruitmentController.listCandidates);
tenantProtected.get('/organizations/:orgId/recruitment/candidates/:id', memberAccess, RecruitmentController.getCandidate);
tenantProtected.patch('/organizations/:orgId/recruitment/candidates/:id', memberAccess, RecruitmentController.updateCandidate);

// --- PIPELINE STAGES ---
tenantProtected.get('/organizations/:orgId/recruitment/stages', memberAccess, RecruitmentController.listPipelineStages);
tenantProtected.post('/organizations/:orgId/recruitment/stages', memberAccess, RecruitmentController.createPipelineStage);
tenantProtected.patch('/organizations/:orgId/recruitment/stages/:id', memberAccess, RecruitmentController.updatePipelineStage);

// --- APPLICATIONS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications', memberAccess, RecruitmentController.applyPosition);
tenantProtected.get('/organizations/:orgId/recruitment/applications', memberAccess, RecruitmentController.listApplications);
tenantProtected.get('/organizations/:orgId/recruitment/applications/:id', memberAccess, RecruitmentController.getApplication);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/advance', memberAccess, RecruitmentController.advanceApplication);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/reject', memberAccess, RecruitmentController.rejectApplication);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/withdraw', memberAccess, RecruitmentController.withdrawApplication);

// --- STAGE ASSESSMENTS & MEETINGS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/stages/:stageId/evaluate', memberAccess, RecruitmentController.evaluateStage);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/stages/:stageId/schedule-interview', memberAccess, RecruitmentController.scheduleInterview);

// --- TRIALS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/trial', memberAccess, RecruitmentController.scheduleTrial);
tenantProtected.get('/organizations/:orgId/recruitment/applications/:id/trial', memberAccess, RecruitmentController.getTrial);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/trial/start', memberAccess, RecruitmentController.startTrial);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/trial/complete', memberAccess, RecruitmentController.completeTrial);

// --- OFFERS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/offer', memberAccess, RecruitmentController.createOffer);
tenantProtected.get('/organizations/:orgId/recruitment/applications/:id/offer', memberAccess, RecruitmentController.getOffer);
tenantProtected.post('/organizations/:orgId/recruitment/offers/:offerId/accept', memberAccess, RecruitmentController.acceptOffer);
tenantProtected.post('/organizations/:orgId/recruitment/offers/:offerId/reject', memberAccess, RecruitmentController.rejectOffer);
tenantProtected.post('/organizations/:orgId/recruitment/offers/:offerId/rescind', memberAccess, RecruitmentController.rescindOffer);

// --- HIRING CONVERSION ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/hire', memberAccess, RecruitmentController.hireCandidate);

recruitmentRouter.use(tenantProtected);
