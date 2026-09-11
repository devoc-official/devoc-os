import { AssessmentRepository } from '../infrastructure/assessment.repository.js';
import { EnrollmentRepository } from '../infrastructure/enrollment.repository.js';
import { PeopleService } from '../../people/application/people.service.js';
import { LearningAssessment, AssessmentAttempt } from '../domain/assessment.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateAssessmentDTO {
  learningActivityId?: string;
  title: string;
  description?: string;
  assessmentType?: string;
  maxScore?: number;
  metadata?: Record<string, any>;
}

export interface SubmitAttemptDTO {
  personId: string;
  evidenceMetadata?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CompleteAttemptDTO {
  status: 'passed' | 'failed' | 'graded';
  score?: number;
  qualitativeResult?: string;
  metadata?: Record<string, any>;
}

export class AssessmentService {
  private repo: AssessmentRepository;
  private enrollmentRepo: EnrollmentRepository;

  constructor() {
    this.repo = new AssessmentRepository();
    this.enrollmentRepo = new EnrollmentRepository();
  }

  public async createAssessment(organizationId: string, enrollmentId: string, dto: CreateAssessmentDTO, actorId: string): Promise<LearningAssessment> {
    if (!dto.title) {
      throw new ValidationError('Assessment title is required');
    }

    const enrollment = await this.enrollmentRepo.findEnrollmentById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment '${enrollmentId}' not found`);
    }

    if (dto.learningActivityId) {
      const activity = await this.enrollmentRepo.findLearningActivityById(organizationId, dto.learningActivityId);
      if (!activity) {
        throw new NotFoundError(`Learning activity '${dto.learningActivityId}' not found`);
      }
    }

    const assessment = await this.repo.createAssessment({
      organizationId,
      enrollmentId,
      learningActivityId: dto.learningActivityId || null,
      title: dto.title,
      description: dto.description || null,
      assessmentType: dto.assessmentType || 'practical',
      status: 'active',
      maxScore: dto.maxScore ?? null,
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'assessment.created',
      entityType: 'learning_assessment',
      entityId: assessment.id,
      payload: { ...assessment.toJSON() } as Record<string, unknown>,
    });

    return assessment;
  }

  public async getAssessmentById(organizationId: string, assessmentId: string): Promise<LearningAssessment> {
    const assessment = await this.repo.findAssessmentById(organizationId, assessmentId);
    if (!assessment) {
      throw new NotFoundError(`Assessment '${assessmentId}' not found`);
    }
    return assessment;
  }

  public async listAssessments(organizationId: string, enrollmentId: string): Promise<LearningAssessment[]> {
    const enrollment = await this.enrollmentRepo.findEnrollmentById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment '${enrollmentId}' not found`);
    }
    return this.repo.listAssessmentsByEnrollmentId(organizationId, enrollmentId);
  }

  // Assessment Attempts
  public async submitAttempt(organizationId: string, assessmentId: string, dto: SubmitAttemptDTO, actorId: string): Promise<AssessmentAttempt> {
    if (!dto.personId) {
      throw new ValidationError('personId is required for assessment attempt submission');
    }

    const assessment = await this.getAssessmentById(organizationId, assessmentId);
    await PeopleService.getPerson(organizationId, dto.personId);

    const attemptNumber = await this.repo.getNextAttemptNumber(organizationId, assessmentId, dto.personId);

    const attempt = await this.repo.createAttempt({
      organizationId,
      assessmentId,
      personId: dto.personId,
      attemptNumber,
      status: 'submitted',
      submittedAt: new Date(),
      evidenceMetadata: dto.evidenceMetadata || {},
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'assessment.submitted',
      entityType: 'learning_assessment_attempt',
      entityId: attempt.id,
      payload: { ...attempt.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'assessment.submitted',
      organizationId,
      actorId,
      entityType: 'learning_assessment_attempt',
      entityId: attempt.id,
      payload: { assessmentId, attemptId: attempt.id, personId: dto.personId, attemptNumber },
    });

    return attempt;
  }

  public async getAttemptById(organizationId: string, attemptId: string): Promise<AssessmentAttempt> {
    const attempt = await this.repo.findAttemptById(organizationId, attemptId);
    if (!attempt) {
      throw new NotFoundError(`Assessment attempt '${attemptId}' not found`);
    }
    return attempt;
  }

  public async listAttempts(organizationId: string, assessmentId: string): Promise<AssessmentAttempt[]> {
    await this.getAssessmentById(organizationId, assessmentId);
    return this.repo.listAttemptsByAssessmentId(organizationId, assessmentId);
  }

  public async completeAttempt(organizationId: string, attemptId: string, dto: CompleteAttemptDTO, actorId: string): Promise<AssessmentAttempt> {
    const attempt = await this.getAttemptById(organizationId, attemptId);

    if (!['passed', 'failed', 'graded'].includes(dto.status)) {
      throw new ValidationError(`Invalid completion status '${dto.status}'. Must be 'passed', 'failed', or 'graded'.`);
    }

    attempt.complete(dto.status, dto.score, dto.qualitativeResult);
    const saved = await this.repo.updateAttempt(attempt);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'assessment.completed',
      entityType: 'learning_assessment_attempt',
      entityId: attemptId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'assessment.completed',
      organizationId,
      actorId,
      entityType: 'learning_assessment_attempt',
      entityId: attemptId,
      payload: { assessmentId: attempt.assessmentId, attemptId, status: dto.status, score: dto.score },
    });

    return saved;
  }
}
