import { Request, Response, NextFunction } from 'express';
import { EnrollmentService } from '../application/enrollment.service.js';

const enrollmentService = new EnrollmentService();

export async function createEnrollmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const actorId = req.user?.id || 'system';
    const enrollment = await enrollmentService.createEnrollment(orgId, req.body, actorId);
    res.status(201).json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listEnrollmentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const personId = req.query.personId as string;
    const programId = req.query.programId as string;
    const status = req.query.status as string;

    const enrollments = await enrollmentService.listEnrollments(orgId, { personId, programId, status });
    res.json({ data: enrollments.map((e) => e.toJSON()), meta: { count: enrollments.length } });
  } catch (err) {
    next(err);
  }
}

export async function getEnrollmentByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const enrollment = await enrollmentService.getEnrollmentById(orgId, enrollmentId);
    res.json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function activateEnrollmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const enrollment = await enrollmentService.activateEnrollment(orgId, enrollmentId, actorId);
    res.json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function pauseEnrollmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const enrollment = await enrollmentService.pauseEnrollment(orgId, enrollmentId, actorId);
    res.json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function resumeEnrollmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const enrollment = await enrollmentService.resumeEnrollment(orgId, enrollmentId, actorId);
    res.json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function completeEnrollmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const enrollment = await enrollmentService.completeEnrollment(orgId, enrollmentId, actorId);
    res.json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function withdrawEnrollmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const enrollment = await enrollmentService.withdrawEnrollment(orgId, enrollmentId, actorId);
    res.json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function cancelEnrollmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const enrollment = await enrollmentService.cancelEnrollment(orgId, enrollmentId, actorId);
    res.json({ data: enrollment.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function getPersonEnrollmentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const personId = req.params.personId as string;
    const enrollments = await enrollmentService.listEnrollmentsByPersonId(orgId, personId);
    res.json({ data: enrollments.map((e) => e.toJSON()), meta: { count: enrollments.length } });
  } catch (err) {
    next(err);
  }
}
