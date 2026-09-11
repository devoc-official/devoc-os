import { EnrollmentRepository } from '../infrastructure/enrollment.repository.js';
import { LearningProgramRepository } from '../infrastructure/learning-program.repository.js';
import { PeopleService } from '../../people/application/people.service.js';
import {
  LearningEnrollment,
  EnrollmentMilestone,
  LearningActivity,
  LearningActivityReferenceProps,
} from '../domain/enrollment.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';
import { TargetResolverRegistry } from '../../assignments/domain/target-resolver.registry.js';

export interface CreateEnrollmentDTO {
  personId: string;
  learningProgramId: string;
  expectedEndAt?: string;
  metadata?: Record<string, any>;
}

export interface AddActivityReferenceDTO {
  referenceType: 'project' | 'task';
  referenceId: string;
  metadata?: Record<string, any>;
}

export class EnrollmentService {
  private repo: EnrollmentRepository;
  private programRepo: LearningProgramRepository;

  constructor() {
    this.repo = new EnrollmentRepository();
    this.programRepo = new LearningProgramRepository();
  }

  public async createEnrollment(organizationId: string, dto: CreateEnrollmentDTO, actorId: string): Promise<LearningEnrollment> {
    if (!dto.personId || !dto.learningProgramId) {
      throw new ValidationError('personId and learningProgramId are required');
    }

    // 1. Validate person exists in organization
    await PeopleService.getPerson(organizationId, dto.personId);

    // 2. Validate program exists in organization and is active
    const program = await this.programRepo.findProgramById(organizationId, dto.learningProgramId);
    if (!program) {
      throw new NotFoundError(`Learning program '${dto.learningProgramId}' not found`);
    }
    if (program.status !== 'active') {
      throw new ValidationError(`Cannot enroll in a program with status '${program.status}'. Program must be active.`);
    }

    // 3. Create Enrollment record
    const enrollment = await this.repo.createEnrollment({
      organizationId,
      personId: dto.personId,
      learningProgramId: dto.learningProgramId,
      status: 'pending',
      enrolledAt: new Date(),
      expectedEndAt: dto.expectedEndAt ? new Date(dto.expectedEndAt) : null,
      metadata: dto.metadata || {},
    });

    // 4. Decoupled plan generation: Copy program milestones & activity definitions
    const programMilestones = await this.programRepo.listMilestones(organizationId, program.id);
    for (const pm of programMilestones) {
      const em = await this.repo.createEnrollmentMilestone({
        organizationId,
        enrollmentId: enrollment.id,
        sourceMilestoneId: pm.id,
        title: pm.name,
        description: pm.description,
        sequence: pm.sequence,
        status: 'pending',
        metadata: { required: pm.required },
      });

      const activityDefs = await this.programRepo.listActivityDefinitions(organizationId, pm.id);
      for (const ad of activityDefs) {
        await this.repo.createLearningActivity({
          organizationId,
          enrollmentMilestoneId: em.id,
          sourceActivityId: ad.id,
          title: ad.title,
          description: ad.description,
          activityType: ad.activityType,
          sequence: ad.sequence,
          status: 'pending',
          metadata: { required: ad.required },
        });
      }
    }

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'enrollment.created',
      entityType: 'learning_enrollment',
      entityId: enrollment.id,
      payload: { ...enrollment.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'enrollment.created',
      organizationId,
      actorId,
      entityType: 'learning_enrollment',
      entityId: enrollment.id,
      payload: { enrollmentId: enrollment.id, personId: dto.personId, programId: program.id },
    });

    return enrollment;
  }

  public async getEnrollmentById(organizationId: string, enrollmentId: string): Promise<LearningEnrollment> {
    const enrollment = await this.repo.findEnrollmentById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment '${enrollmentId}' not found`);
    }
    return enrollment;
  }

  public async listEnrollments(
    organizationId: string,
    filters?: { personId?: string; programId?: string; status?: string }
  ): Promise<LearningEnrollment[]> {
    return this.repo.listEnrollments(organizationId, filters);
  }

  public async listEnrollmentsByPersonId(organizationId: string, personId: string): Promise<LearningEnrollment[]> {
    await PeopleService.getPerson(organizationId, personId);
    return this.repo.listEnrollments(organizationId, { personId });
  }

  // Enrollment Status Transitions
  public async activateEnrollment(organizationId: string, enrollmentId: string, actorId: string): Promise<LearningEnrollment> {
    const enrollment = await this.getEnrollmentById(organizationId, enrollmentId);

    enrollment.activate();
    const saved = await this.repo.updateEnrollment(enrollment);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'enrollment.activated',
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'enrollment.activated',
      organizationId,
      actorId,
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { enrollmentId },
    });

    return saved;
  }

  public async pauseEnrollment(organizationId: string, enrollmentId: string, actorId: string): Promise<LearningEnrollment> {
    const enrollment = await this.getEnrollmentById(organizationId, enrollmentId);

    enrollment.pause();
    const saved = await this.repo.updateEnrollment(enrollment);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'enrollment.paused',
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'enrollment.paused',
      organizationId,
      actorId,
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { enrollmentId },
    });

    return saved;
  }

  public async resumeEnrollment(organizationId: string, enrollmentId: string, actorId: string): Promise<LearningEnrollment> {
    const enrollment = await this.getEnrollmentById(organizationId, enrollmentId);

    enrollment.resume();
    const saved = await this.repo.updateEnrollment(enrollment);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'enrollment.resumed',
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'enrollment.resumed',
      organizationId,
      actorId,
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { enrollmentId },
    });

    return saved;
  }

  public async completeEnrollment(organizationId: string, enrollmentId: string, actorId: string): Promise<LearningEnrollment> {
    const enrollment = await this.getEnrollmentById(organizationId, enrollmentId);

    enrollment.complete();
    const saved = await this.repo.updateEnrollment(enrollment);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'enrollment.completed',
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'enrollment.completed',
      organizationId,
      actorId,
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { enrollmentId },
    });

    return saved;
  }

  public async withdrawEnrollment(organizationId: string, enrollmentId: string, actorId: string): Promise<LearningEnrollment> {
    const enrollment = await this.getEnrollmentById(organizationId, enrollmentId);

    enrollment.withdraw();
    const saved = await this.repo.updateEnrollment(enrollment);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'enrollment.withdrawn',
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'enrollment.withdrawn',
      organizationId,
      actorId,
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { enrollmentId },
    });

    return saved;
  }

  public async cancelEnrollment(organizationId: string, enrollmentId: string, actorId: string): Promise<LearningEnrollment> {
    const enrollment = await this.getEnrollmentById(organizationId, enrollmentId);

    enrollment.cancel();
    const saved = await this.repo.updateEnrollment(enrollment);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'enrollment.cancelled',
      entityType: 'learning_enrollment',
      entityId: enrollmentId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    return saved;
  }

  // Personalized Plan Milestones
  public async getEnrollmentMilestones(organizationId: string, enrollmentId: string): Promise<EnrollmentMilestone[]> {
    await this.getEnrollmentById(organizationId, enrollmentId);
    return this.repo.listEnrollmentMilestones(organizationId, enrollmentId);
  }

  public async activateMilestone(organizationId: string, enrollmentId: string, milestoneId: string, actorId: string): Promise<EnrollmentMilestone> {
    await this.getEnrollmentById(organizationId, enrollmentId);
    const milestone = await this.repo.findEnrollmentMilestoneById(organizationId, milestoneId);
    if (!milestone || milestone.enrollmentId !== enrollmentId) {
      throw new NotFoundError(`Milestone '${milestoneId}' not found in enrollment`);
    }

    milestone.activate();
    const saved = await this.repo.updateEnrollmentMilestone(milestone);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'milestone.activated',
      entityType: 'enrollment_milestone',
      entityId: milestoneId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'milestone.activated',
      organizationId,
      actorId,
      entityType: 'enrollment_milestone',
      entityId: milestoneId,
      payload: { milestoneId, enrollmentId },
    });

    return saved;
  }

  public async completeMilestone(organizationId: string, enrollmentId: string, milestoneId: string, actorId: string): Promise<EnrollmentMilestone> {
    await this.getEnrollmentById(organizationId, enrollmentId);
    const milestone = await this.repo.findEnrollmentMilestoneById(organizationId, milestoneId);
    if (!milestone || milestone.enrollmentId !== enrollmentId) {
      throw new NotFoundError(`Milestone '${milestoneId}' not found in enrollment`);
    }

    milestone.complete();
    const saved = await this.repo.updateEnrollmentMilestone(milestone);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'milestone.completed',
      entityType: 'enrollment_milestone',
      entityId: milestoneId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'milestone.completed',
      organizationId,
      actorId,
      entityType: 'enrollment_milestone',
      entityId: milestoneId,
      payload: { milestoneId, enrollmentId },
    });

    return saved;
  }

  public async skipMilestone(organizationId: string, enrollmentId: string, milestoneId: string, actorId: string): Promise<EnrollmentMilestone> {
    await this.getEnrollmentById(organizationId, enrollmentId);
    const milestone = await this.repo.findEnrollmentMilestoneById(organizationId, milestoneId);
    if (!milestone || milestone.enrollmentId !== enrollmentId) {
      throw new NotFoundError(`Milestone '${milestoneId}' not found in enrollment`);
    }

    milestone.skip();
    const saved = await this.repo.updateEnrollmentMilestone(milestone);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'milestone.skipped',
      entityType: 'enrollment_milestone',
      entityId: milestoneId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'milestone.skipped',
      organizationId,
      actorId,
      entityType: 'enrollment_milestone',
      entityId: milestoneId,
      payload: { milestoneId, enrollmentId },
    });

    return saved;
  }

  // Personalized Plan Activities
  public async getEnrollmentActivities(organizationId: string, enrollmentId: string): Promise<LearningActivity[]> {
    await this.getEnrollmentById(organizationId, enrollmentId);
    return this.repo.listActivitiesByEnrollmentId(organizationId, enrollmentId);
  }

  public async completeActivity(organizationId: string, activityId: string, actorId: string): Promise<LearningActivity> {
    const activity = await this.repo.findLearningActivityById(organizationId, activityId);
    if (!activity) {
      throw new NotFoundError(`Activity '${activityId}' not found`);
    }

    activity.complete();
    const saved = await this.repo.updateLearningActivity(activity);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'activity.completed',
      entityType: 'learning_activity',
      entityId: activityId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'activity.completed',
      organizationId,
      actorId,
      entityType: 'learning_activity',
      entityId: activityId,
      payload: { activityId },
    });

    return saved;
  }

  public async skipActivity(organizationId: string, activityId: string, actorId: string): Promise<LearningActivity> {
    const activity = await this.repo.findLearningActivityById(organizationId, activityId);
    if (!activity) {
      throw new NotFoundError(`Activity '${activityId}' not found`);
    }

    activity.skip();
    const saved = await this.repo.updateLearningActivity(activity);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'activity.skipped',
      entityType: 'learning_activity',
      entityId: activityId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    return saved;
  }

  // Activity References
  public async addActivityReference(
    organizationId: string,
    activityId: string,
    dto: AddActivityReferenceDTO,
    actorId: string
  ): Promise<LearningActivityReferenceProps> {
    const activity = await this.repo.findLearningActivityById(organizationId, activityId);
    if (!activity) {
      throw new NotFoundError(`Activity '${activityId}' not found`);
    }

    if (!['project', 'task'].includes(dto.referenceType)) {
      throw new ValidationError(`Invalid referenceType '${dto.referenceType}'. Must be 'project' or 'task'`);
    }

    // Validate target using TargetResolverRegistry
    await TargetResolverRegistry.getInstance().resolveTarget(organizationId, dto.referenceType, dto.referenceId);

    const ref = await this.repo.createActivityReference({
      organizationId,
      learningActivityId: activityId,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'activity_reference.created',
      entityType: 'learning_activity_reference',
      entityId: ref.id,
      payload: { ...ref } as Record<string, unknown>,
    });

    return ref;
  }
}
