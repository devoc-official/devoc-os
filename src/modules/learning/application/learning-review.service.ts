import { LearningReviewRepository } from '../infrastructure/learning-review.repository.js';
import { EnrollmentRepository } from '../infrastructure/enrollment.repository.js';
import { PeopleService } from '../../people/application/people.service.js';
import { LearningReview, ReviewChangeProps } from '../domain/learning-review.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateReviewDTO {
  reviewerPersonId: string;
  reviewType?: string;
  reviewedAt?: string;
  summary: string;
  feedback?: string;
  progressValue?: number;
  metadata?: Record<string, any>;
}

export interface AddReviewChangeDTO {
  changeType: string;
  targetType: string;
  targetId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: Record<string, any>;
}

export class LearningReviewService {
  private repo: LearningReviewRepository;
  private enrollmentRepo: EnrollmentRepository;

  constructor() {
    this.repo = new LearningReviewRepository();
    this.enrollmentRepo = new EnrollmentRepository();
  }

  public async createReview(organizationId: string, enrollmentId: string, dto: CreateReviewDTO, actorId: string): Promise<LearningReview> {
    if (!dto.reviewerPersonId || !dto.summary) {
      throw new ValidationError('reviewerPersonId and summary are required for a learning review');
    }

    // 1. Validate enrollment exists
    const enrollment = await this.enrollmentRepo.findEnrollmentById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment '${enrollmentId}' not found`);
    }

    // 2. Validate reviewer person exists in organization
    await PeopleService.getPerson(organizationId, dto.reviewerPersonId);

    const review = await this.repo.createReview({
      organizationId,
      enrollmentId,
      reviewerPersonId: dto.reviewerPersonId,
      reviewType: dto.reviewType || 'weekly',
      reviewedAt: dto.reviewedAt ? new Date(dto.reviewedAt) : new Date(),
      summary: dto.summary,
      feedback: dto.feedback || null,
      progressValue: dto.progressValue ?? null,
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'review.created',
      entityType: 'learning_review',
      entityId: review.id,
      payload: { ...review.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'review.created',
      organizationId,
      actorId,
      entityType: 'learning_review',
      entityId: review.id,
      payload: { reviewId: review.id, enrollmentId, reviewerId: dto.reviewerPersonId },
    });

    return review;
  }

  public async getReviewById(organizationId: string, enrollmentId: string, reviewId: string): Promise<LearningReview> {
    const enrollment = await this.enrollmentRepo.findEnrollmentById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment '${enrollmentId}' not found`);
    }

    const review = await this.repo.findReviewById(organizationId, reviewId);
    if (!review || review.enrollmentId !== enrollmentId) {
      throw new NotFoundError(`Review '${reviewId}' not found for enrollment`);
    }

    return review;
  }

  public async listReviews(organizationId: string, enrollmentId: string): Promise<LearningReview[]> {
    const enrollment = await this.enrollmentRepo.findEnrollmentById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment '${enrollmentId}' not found`);
    }

    return this.repo.listReviewsByEnrollmentId(organizationId, enrollmentId);
  }

  public async addReviewChange(
    organizationId: string,
    enrollmentId: string,
    reviewId: string,
    dto: AddReviewChangeDTO,
    actorId: string
  ): Promise<ReviewChangeProps> {
    const review = await this.getReviewById(organizationId, enrollmentId, reviewId);

    if (!dto.changeType || !dto.targetType || !dto.targetId) {
      throw new ValidationError('changeType, targetType, and targetId are required for a review change');
    }

    const change = await this.repo.createReviewChange({
      organizationId,
      reviewId: review.id,
      changeType: dto.changeType,
      targetType: dto.targetType,
      targetId: dto.targetId,
      previousValue: dto.previousValue,
      newValue: dto.newValue,
      reason: dto.reason || null,
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'review.roadmap_updated',
      entityType: 'learning_review_change',
      entityId: change.id,
      payload: { ...change } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'review.roadmap_updated',
      organizationId,
      actorId,
      entityType: 'learning_review_change',
      entityId: change.id,
      payload: { reviewId: review.id, changeId: change.id, changeType: dto.changeType },
    });

    return change;
  }
}
