import { Router } from 'express';
import { RecruitmentController } from './recruitment.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireRecruitmentPermission } from './recruitment-auth.middleware.js';

export const recruitmentRouter = Router();

const tenantProtected = Router({ mergeParams: true });
tenantProtected.use(authenticate, resolveTenant);

// --- POSITIONS ---
tenantProtected.post('/organizations/:orgId/recruitment/positions', requireRecruitmentPermission('recruitment:create'), RecruitmentController.createPosition);
tenantProtected.get('/organizations/:orgId/recruitment/positions', requireRecruitmentPermission('recruitment:view'), RecruitmentController.listPositions);
tenantProtected.get('/organizations/:orgId/recruitment/positions/:id', requireRecruitmentPermission('recruitment:view'), RecruitmentController.getPosition);
tenantProtected.patch('/organizations/:orgId/recruitment/positions/:id', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.updatePosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/open', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.openPosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/pause', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.pausePosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/close', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.closePosition);
tenantProtected.post('/organizations/:orgId/recruitment/positions/:id/archive', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.archivePosition);

// --- CANDIDATES ---
tenantProtected.post('/organizations/:orgId/recruitment/candidates', requireRecruitmentPermission('recruitment:create'), RecruitmentController.createCandidate);
tenantProtected.get('/organizations/:orgId/recruitment/candidates', requireRecruitmentPermission('recruitment:view'), RecruitmentController.listCandidates);
tenantProtected.get('/organizations/:orgId/recruitment/candidates/:id', requireRecruitmentPermission('recruitment:view'), RecruitmentController.getCandidate);
tenantProtected.patch('/organizations/:orgId/recruitment/candidates/:id', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.updateCandidate);

// --- PIPELINE STAGES ---
tenantProtected.get('/organizations/:orgId/recruitment/stages', requireRecruitmentPermission('recruitment:view'), RecruitmentController.listPipelineStages);
tenantProtected.post('/organizations/:orgId/recruitment/stages', requireRecruitmentPermission('recruitment:admin'), RecruitmentController.createPipelineStage);
tenantProtected.patch('/organizations/:orgId/recruitment/stages/:id', requireRecruitmentPermission('recruitment:admin'), RecruitmentController.updatePipelineStage);

// --- APPLICATIONS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications', requireRecruitmentPermission('recruitment:create'), RecruitmentController.applyPosition);
tenantProtected.get('/organizations/:orgId/recruitment/applications', requireRecruitmentPermission('recruitment:view'), RecruitmentController.listApplications);
tenantProtected.get('/organizations/:orgId/recruitment/applications/:id', requireRecruitmentPermission('recruitment:view'), RecruitmentController.getApplication);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/advance', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.advanceApplication);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/reject', requireRecruitmentPermission('recruitment:decide'), RecruitmentController.rejectApplication);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/withdraw', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.withdrawApplication);

// --- STAGE ASSESSMENTS & MEETINGS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/stages/:stageId/evaluate', requireRecruitmentPermission('recruitment:assess'), RecruitmentController.evaluateStage);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/stages/:stageId/schedule-interview', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.scheduleInterview);

// --- TRIALS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/trial', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.scheduleTrial);
tenantProtected.get('/organizations/:orgId/recruitment/applications/:id/trial', requireRecruitmentPermission('recruitment:view'), RecruitmentController.getTrial);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/trial/start', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.startTrial);
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/trial/complete', requireRecruitmentPermission('recruitment:manage'), RecruitmentController.completeTrial);

// --- OFFERS ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/offer', requireRecruitmentPermission('recruitment:offer'), RecruitmentController.createOffer);
tenantProtected.get('/organizations/:orgId/recruitment/applications/:id/offer', requireRecruitmentPermission('recruitment:view'), RecruitmentController.getOffer);
tenantProtected.post('/organizations/:orgId/recruitment/offers/:offerId/accept', requireRecruitmentPermission('recruitment:offer'), RecruitmentController.acceptOffer);
tenantProtected.post('/organizations/:orgId/recruitment/offers/:offerId/reject', requireRecruitmentPermission('recruitment:offer'), RecruitmentController.rejectOffer);
tenantProtected.post('/organizations/:orgId/recruitment/offers/:offerId/rescind', requireRecruitmentPermission('recruitment:offer'), RecruitmentController.rescindOffer);

// --- HIRING CONVERSION ---
tenantProtected.post('/organizations/:orgId/recruitment/applications/:id/hire', requireRecruitmentPermission('recruitment:decide'), RecruitmentController.hireCandidate);

recruitmentRouter.use(tenantProtected);
