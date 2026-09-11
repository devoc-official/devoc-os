import { Request, Response, NextFunction } from 'express';
import { AssessmentService } from '../application/assessment.service.js';

const assessmentService = new AssessmentService();

export async function createAssessmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const assessment = await assessmentService.createAssessment(orgId, enrollmentId, req.body, actorId);
    res.status(201).json({ data: assessment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listAssessmentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const assessments = await assessmentService.listAssessments(orgId, enrollmentId);
    res.json({ data: assessments.map((a) => a.toJSON()), meta: { count: assessments.length } });
  } catch (err) {
    next(err);
  }
}

export async function getAssessmentByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const assessmentId = req.params.assessmentId as string;
    const assessment = await assessmentService.getAssessmentById(orgId, assessmentId);
    res.json({ data: assessment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function submitAttemptController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const assessmentId = req.params.assessmentId as string;
    const actorId = req.user?.id || 'system';
    const attempt = await assessmentService.submitAttempt(orgId, assessmentId, req.body, actorId);
    res.status(201).json({ data: attempt.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listAttemptsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const assessmentId = req.params.assessmentId as string;
    const attempts = await assessmentService.listAttempts(orgId, assessmentId);
    res.json({ data: attempts.map((a) => a.toJSON()), meta: { count: attempts.length } });
  } catch (err) {
    next(err);
  }
}

export async function completeAttemptController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const attemptId = req.params.attemptId as string;
    const actorId = req.user?.id || 'system';
    const attempt = await assessmentService.completeAttempt(orgId, attemptId, req.body, actorId);
    res.json({ data: attempt.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}
