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
} from './learning-review.controller.js';
import {
  createAssessmentController,
  listAssessmentsController,
  getAssessmentByIdController,
  submitAttemptController,
  listAttemptsController,
  completeAttemptController,
} from './assessment.controller.js';

export const learningRouter = Router({ mergeParams: true });

learningRouter.use(authenticate);
learningRouter.use(resolveTenant);

// Learning Programs
learningRouter.post('/organizations/:orgId/learning-programs', createProgramController);
learningRouter.get('/organizations/:orgId/learning-programs', listProgramsController);
learningRouter.get('/organizations/:orgId/learning-programs/:programId', getProgramByIdController);
learningRouter.patch('/organizations/:orgId/learning-programs/:programId', updateProgramController);
learningRouter.post('/organizations/:orgId/learning-programs/:programId/archive', archiveProgramController);
learningRouter.post('/organizations/:orgId/learning-programs/:programId/milestones', addMilestoneController);
learningRouter.get('/organizations/:orgId/learning-programs/:programId/milestones', listMilestonesController);
learningRouter.post('/organizations/:orgId/learning-programs/:programId/milestones/:milestoneId/activities', addActivityDefController);
learningRouter.get('/organizations/:orgId/learning-programs/:programId/milestones/:milestoneId/activities', listActivityDefsController);

// Learning Enrollments
learningRouter.post('/organizations/:orgId/learning-enrollments', createEnrollmentController);
learningRouter.get('/organizations/:orgId/learning-enrollments', listEnrollmentsController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId', getEnrollmentByIdController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/activate', activateEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/pause', pauseEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/resume', resumeEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/complete', completeEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/withdraw', withdrawEnrollmentController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/cancel', cancelEnrollmentController);

// Personalized Plan (Milestones & Activities)
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones', listEnrollmentMilestonesController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones/:milestoneId/activate', activateMilestoneController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones/:milestoneId/complete', completeMilestoneController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/milestones/:milestoneId/skip', skipMilestoneController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/activities', listEnrollmentActivitiesController);
learningRouter.post('/organizations/:orgId/learning-activities/:activityId/complete', completeActivityController);
learningRouter.post('/organizations/:orgId/learning-activities/:activityId/skip', skipActivityController);
learningRouter.post('/organizations/:orgId/learning-activities/:activityId/references', addActivityReferenceController);

// Reviews
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews', createReviewController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews', listReviewsController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews/:reviewId', getReviewByIdController);
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/reviews/:reviewId/changes', addReviewChangeController);

// Assessments
learningRouter.post('/organizations/:orgId/learning-enrollments/:enrollmentId/assessments', createAssessmentController);
learningRouter.get('/organizations/:orgId/learning-enrollments/:enrollmentId/assessments', listAssessmentsController);
learningRouter.get('/organizations/:orgId/assessments/:assessmentId', getAssessmentByIdController);
learningRouter.post('/organizations/:orgId/assessments/:assessmentId/attempts', submitAttemptController);
learningRouter.get('/organizations/:orgId/assessments/:assessmentId/attempts', listAttemptsController);
learningRouter.post('/organizations/:orgId/assessment-attempts/:attemptId/complete', completeAttemptController);

// People / Enrollments view
learningRouter.get('/organizations/:orgId/people/:personId/learning-enrollments', getPersonEnrollmentsController);
