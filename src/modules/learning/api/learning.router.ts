import { Router } from 'express';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import {
  createProgramController,
  listProgramsController,
  getProgramByIdController,
  updateProgramController,
  archiveProgramController,
  addMilestoneController,
  listMilestonesController,
  addActivityDefController,
  listActivityDefsController,
} from './learning-program.controller.js';
import {
  createEnrollmentController,
  listEnrollmentsController,
  getEnrollmentByIdController,
  activateEnrollmentController,
  pauseEnrollmentController,
  resumeEnrollmentController,
  completeEnrollmentController,
  withdrawEnrollmentController,
  cancelEnrollmentController,
  getPersonEnrollmentsController,
} from './enrollment.controller.js';
import {
  listEnrollmentMilestonesController,
  activateMilestoneController,
  completeMilestoneController,
  skipMilestoneController,
  listEnrollmentActivitiesController,
  completeActivityController,
  skipActivityController,
  addActivityReferenceController,
} from './personalized-plan.controller.js';
import {
  createReviewController,
  listReviewsController,
  getReviewByIdController,
  addReviewChangeController,
  listReviewChangesController,
} from './learning-review.controller.js';
import {
  createAssessmentController,
  listAssessmentsController,
  getAssessmentByIdController,
  submitAttemptController,
  listAttemptsController,
  completeAttemptController,
} from './assessment.controller.js';

import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';

export const learningRouter = Router({ mergeParams: true });

learningRouter.use(authenticate);
learningRouter.use(resolveTenant);

// Learning Programs
learningRouter.post('/organizations/:orgId/learning-programs', requireOrgAdmin, createProgramController);
learningRouter.get('/organizations/:orgId/learning-programs', requireRole(['org_admin', 'org_member']), listProgramsController);
learningRouter.get('/organizations/:orgId/learning-programs/:programId', requireRole(['org_admin', 'org_member']), getProgramByIdController);
learningRouter.patch('/organizations/:orgId/learning-programs/:programId', requireOrgAdmin, updateProgramController);
learningRouter.post('/organizations/:orgId/learning-programs/:programId/archive', requireOrgAdmin, archiveProgramController);
learningRouter.post('/organizations/:orgId/learning-programs/:programId/milestones', requireOrgAdmin, addMilestoneController);
learningRouter.get('/organizations/:orgId/learning-programs/:programId/milestones', requireRole(['org_admin', 'org_member']), listMilestonesController);
learningRouter.post('/organizations/:orgId/learning-programs/:programId/milestones/:milestoneId/activities', requireOrgAdmin, addActivityDefController);
learningRouter.get('/organizations/:orgId/learning-programs/:programId/milestones/:milestoneId/activities', requireRole(['org_admin', 'org_member']), listActivityDefsController);

// Learning Enrollments
learningRouter.post('/organizations/:orgId/learning-enrollments', requireRole(['org_admin', 'org_member']), createEnrollmentController);
learningRouter.get('/organizations/:orgId/learning-enrollments', requireRole(['org_admin', 'org_member']), listEnrollmentsController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId', requireRole(['org_admin', 'org_member']), getEnrollmentByIdController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/activate', requireRole(['org_admin', 'org_member']), activateEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/pause', requireRole(['org_admin', 'org_member']), pauseEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/resume', requireRole(['org_admin', 'org_member']), resumeEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/complete', requireRole(['org_admin', 'org_member']), completeEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/withdraw', requireRole(['org_admin', 'org_member']), withdrawEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/cancel', requireRole(['org_admin', 'org_member']), cancelEnrollmentController);

// Personalized Plan (Milestones & Activities)
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones', requireRole(['org_admin', 'org_member']), listEnrollmentMilestonesController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones/:milestoneId/activate', requireRole(['org_admin', 'org_member']), activateMilestoneController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones/:milestoneId/complete', requireRole(['org_admin', 'org_member']), completeMilestoneController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones/:milestoneId/skip', requireRole(['org_admin', 'org_member']), skipMilestoneController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/activities', requireRole(['org_admin', 'org_member']), listEnrollmentActivitiesController);
learningRouter.post('/organizations/:orgId/learning-activities/:activityId/complete', requireRole(['org_admin', 'org_member']), completeActivityController);
learningRouter.post('/organizations/:orgId/learning-activities/:activityId/skip', requireRole(['org_admin', 'org_member']), skipActivityController);
learningRouter.post('/organizations/:orgId/learning-activities/:activityId/references', requireRole(['org_admin', 'org_member']), addActivityReferenceController);

// Reviews
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews', requireRole(['org_admin', 'org_member']), createReviewController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews', requireRole(['org_admin', 'org_member']), listReviewsController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews/:reviewId', requireRole(['org_admin', 'org_member']), getReviewByIdController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews/:reviewId/changes', requireRole(['org_admin', 'org_member']), addReviewChangeController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews/:reviewId/changes', requireRole(['org_admin', 'org_member']), listReviewChangesController);

// Assessments
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/assessments', requireRole(['org_admin', 'org_member']), createAssessmentController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/assessments', requireRole(['org_admin', 'org_member']), listAssessmentsController);
learningRouter.get('/organizations/:orgId/assessments/:assessmentId', requireRole(['org_admin', 'org_member']), getAssessmentByIdController);
learningRouter.post('/organizations/:orgId/assessments/:assessmentId/attempts', requireRole(['org_admin', 'org_member']), submitAttemptController);
learningRouter.get('/organizations/:orgId/assessments/:assessmentId/attempts', requireRole(['org_admin', 'org_member']), listAttemptsController);
learningRouter.post('/organizations/:orgId/assessment-attempts/:attemptId/complete', requireRole(['org_admin', 'org_member']), completeAttemptController);

// People / Enrollments view
learningRouter.get('/organizations/:orgId/people/:personId/learning-enrollments', requireRole(['org_admin', 'org_member']), getPersonEnrollmentsController);
