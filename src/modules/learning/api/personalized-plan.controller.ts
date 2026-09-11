import { Request, Response, NextFunction } from 'express';
import { EnrollmentService } from '../application/enrollment.service.js';

const enrollmentService = new EnrollmentService();

export async function listEnrollmentMilestonesController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const milestones = await enrollmentService.getEnrollmentMilestones(orgId, enrollmentId);
    res.json({ data: milestones.map((m) => m.toJSON()), meta: { count: milestones.length } });
  } catch (err) {
    next(err);
  }
}

export async function activateMilestoneController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const milestoneId = req.params.milestoneId as string;
    const actorId = req.user?.id || 'system';
    const milestone = await enrollmentService.activateMilestone(orgId, enrollmentId, milestoneId, actorId);
    res.json({ data: milestone.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function completeMilestoneController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const milestoneId = req.params.milestoneId as string;
    const actorId = req.user?.id || 'system';
    const milestone = await enrollmentService.completeMilestone(orgId, enrollmentId, milestoneId, actorId);
    res.json({ data: milestone.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function skipMilestoneController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const milestoneId = req.params.milestoneId as string;
    const actorId = req.user?.id || 'system';
    const milestone = await enrollmentService.skipMilestone(orgId, enrollmentId, milestoneId, actorId);
    res.json({ data: milestone.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listEnrollmentActivitiesController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const activities = await enrollmentService.getEnrollmentActivities(orgId, enrollmentId);
    res.json({ data: activities.map((a) => a.toJSON()), meta: { count: activities.length } });
  } catch (err) {
    next(err);
  }
}

export async function completeActivityController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const activityId = req.params.activityId as string;
    const actorId = req.user?.id || 'system';
    const activity = await enrollmentService.completeActivity(orgId, activityId, actorId);
    res.json({ data: activity.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function skipActivityController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const activityId = req.params.activityId as string;
    const actorId = req.user?.id || 'system';
    const activity = await enrollmentService.skipActivity(orgId, activityId, actorId);
    res.json({ data: activity.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function addActivityReferenceController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const activityId = req.params.activityId as string;
    const actorId = req.user?.id || 'system';
    const ref = await enrollmentService.addActivityReference(orgId, activityId, req.body, actorId);
    res.status(201).json({ data: ref, meta: {} });
  } catch (err) {
    next(err);
  }
}
