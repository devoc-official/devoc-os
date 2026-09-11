import { Request, Response, NextFunction } from 'express';
import { LearningReviewService } from '../application/learning-review.service.js';

const reviewService = new LearningReviewService();

export async function createReviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const actorId = req.user?.id || 'system';
    const review = await reviewService.createReview(orgId, enrollmentId, req.body, actorId);
    res.status(201).json({ data: review.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listReviewsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const reviews = await reviewService.listReviews(orgId, enrollmentId);
    res.json({ data: reviews.map((r) => r.toJSON()), meta: { count: reviews.length } });
  } catch (err) {
    next(err);
  }
}

export async function getReviewByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const reviewId = req.params.reviewId as string;
    const review = await reviewService.getReviewById(orgId, enrollmentId, reviewId);
    res.json({ data: review.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function addReviewChangeController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const enrollmentId = req.params.enrollmentId as string;
    const reviewId = req.params.reviewId as string;
    const actorId = req.user?.id || 'system';
    const change = await reviewService.addReviewChange(orgId, enrollmentId, reviewId, req.body, actorId);
    res.status(201).json({ data: change, meta: {} });
  } catch (err) {
    next(err);
  }
}
