import { WorkRepository } from '../infrastructure/work.repository.js';
import { WorkCategoryRepository } from '../infrastructure/work-category.repository.js';
import { PeopleRepository } from '../../people/infrastructure/people.repository.js';
import { AssignmentRepository } from '../../assignments/infrastructure/assignment.repository.js';
import { WorkTargetResolverRegistry } from '../domain/work-target.registry.js';
import {
  WorkRecord,
  WorkEvidence,
  Outcome,
  WorkOutcome,
  WorkStatus,
  canTransitionWorkStatus,
  validateWorkTimestampsAndDuration,
  validateTargetPair,
} from '../domain/work.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateWorkRecordDTO {
  organizationId: string;
  personId: string;
  targetType?: string | null;
  targetId?: string | null;
  assignmentId?: string | null;
  categoryId: string;
  title: string;
  description?: string | null;
  status?: WorkStatus;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationMinutes: number;
  createdByPersonId: string;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export interface UpdateWorkRecordDTO {
  title?: string;
  description?: string | null;
  categoryId?: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationMinutes?: number;
  assignmentId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export interface CreateEvidenceDTO {
  organizationId: string;
  workRecordId: string;
  evidenceType: string;
  title?: string | null;
  referenceUri?: string | null;
  provider?: string | null;
  externalId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export interface CreateOutcomeDTO {
  organizationId: string;
  outcomeType: string;
  title: string;
  description?: string | null;
  measurableValue?: number | null;
  measurableUnit?: string | null;
  metadata?: Record<string, unknown>;
  createdByPersonId: string;
  actorUserId?: string;
}

export interface WorkRecordDetail extends WorkRecord {
  evidence: WorkEvidence[];
  outcomes: Outcome[];
}

export class WorkService {
  private static assignmentRepo = new AssignmentRepository();

  public static async createWorkRecord(dto: CreateWorkRecordDTO): Promise<WorkRecord> {
    // 1. Verify Person existence and tenant scoping
    const person = await PeopleRepository.findPersonById(dto.organizationId, dto.personId);
    if (!person) {
      throw new NotFoundError(`Person '${dto.personId}' not found in organization`);
    }

    // 2. Verify CreatedByPerson existence
    const creator = await PeopleRepository.findPersonById(dto.organizationId, dto.createdByPersonId);
    if (!creator) {
      throw new NotFoundError(`Creator person '${dto.createdByPersonId}' not found in organization`);
    }

    // 3. Verify Category existence and active status
    const category = await WorkCategoryRepository.findCategoryById(dto.organizationId, dto.categoryId);
    if (!category) {
      throw new NotFoundError(`Work category '${dto.categoryId}' not found in organization`);
    }
    if (!category.active) {
      throw new ValidationError(`Work category '${category.name}' is inactive`);
    }

    // 4. Validate Target Pair and Target Resolver
    validateTargetPair(dto.targetType, dto.targetId);
    if (dto.targetType && dto.targetId) {
      const targetRegistry = WorkTargetResolverRegistry.getInstance();
      await targetRegistry.resolveTarget(dto.organizationId, dto.targetType, dto.targetId);
    }

    // 5. Validate Assignment Context if supplied
    if (dto.assignmentId) {
      const assignment = await WorkService.assignmentRepo.findById(dto.organizationId, dto.assignmentId);
      if (!assignment) {
        throw new NotFoundError(`Assignment '${dto.assignmentId}' not found in organization`);
      }
      if (assignment.personId !== dto.personId) {
        throw new ValidationError('Assignment must belong to the person performing the work');
      }
    }

    // 6. Validate Timestamps and Duration
    validateWorkTimestampsAndDuration(dto.startedAt, dto.endedAt, dto.durationMinutes);

    // 7. Create Work Record
    const workRecord = await WorkRepository.createWorkRecord({
      organizationId: dto.organizationId,
      personId: dto.personId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      assignmentId: dto.assignmentId,
      categoryId: dto.categoryId,
      title: dto.title,
      description: dto.description,
      status: dto.status || 'draft',
      startedAt: dto.startedAt,
      endedAt: dto.endedAt,
      durationMinutes: dto.durationMinutes,
      createdByPersonId: dto.createdByPersonId,
      metadata: dto.metadata,
    });

    // 8. Domain Event
    eventBus.publish({
      eventName: 'work.created',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId,
      entityType: 'work_record',
      entityId: workRecord.id,
      payload: {
        title: workRecord.title,
        personId: workRecord.personId,
        categoryId: workRecord.categoryId,
        status: workRecord.status,
        durationMinutes: workRecord.durationMinutes,
      },
    });

    return workRecord;
  }

  public static async getWorkRecordById(
    organizationId: string,
    workId: string
  ): Promise<WorkRecordDetail> {
    const workRecord = await WorkRepository.findWorkRecordById(organizationId, workId);
    if (!workRecord) {
      throw new NotFoundError(`Work record '${workId}' not found in organization`);
    }

    const evidence = await WorkRepository.findEvidenceForWork(organizationId, workId);
    const outcomes = await WorkRepository.findOutcomesForWork(organizationId, workId);

    return {
      ...workRecord,
      evidence,
      outcomes,
    };
  }

  public static async listWorkRecords(
    organizationId: string,
    filters?: {
      personId?: string;
      targetType?: string;
      targetId?: string;
      assignmentId?: string;
      categoryId?: string;
      status?: WorkStatus;
      startedFrom?: Date;
      startedTo?: Date;
    }
  ): Promise<WorkRecord[]> {
    return WorkRepository.findAllWorkRecords(organizationId, filters);
  }

  public static async updateWorkRecord(
    organizationId: string,
    workId: string,
    dto: UpdateWorkRecordDTO
  ): Promise<WorkRecordDetail> {
    const current = await WorkRepository.findWorkRecordById(organizationId, workId);
    if (!current) {
      throw new NotFoundError(`Work record '${workId}' not found in organization`);
    }

    if (current.status === 'approved' || current.status === 'cancelled') {
      throw new ValidationError(`Cannot update a work record in terminal status '${current.status}'`);
    }

    if (dto.categoryId) {
      const category = await WorkCategoryRepository.findCategoryById(organizationId, dto.categoryId);
      if (!category) {
        throw new NotFoundError(`Work category '${dto.categoryId}' not found in organization`);
      }
      if (!category.active) {
        throw new ValidationError(`Work category '${category.name}' is inactive`);
      }
    }

    const effectiveTargetType = dto.targetType !== undefined ? dto.targetType : current.targetType;
    const effectiveTargetId = dto.targetId !== undefined ? dto.targetId : current.targetId;
    validateTargetPair(effectiveTargetType, effectiveTargetId);

    if (effectiveTargetType && effectiveTargetId) {
      const targetRegistry = WorkTargetResolverRegistry.getInstance();
      await targetRegistry.resolveTarget(organizationId, effectiveTargetType, effectiveTargetId);
    }

    if (dto.assignmentId !== undefined && dto.assignmentId !== null) {
      const assignment = await WorkService.assignmentRepo.findById(organizationId, dto.assignmentId);
      if (!assignment) {
        throw new NotFoundError(`Assignment '${dto.assignmentId}' not found in organization`);
      }
      if (assignment.personId !== current.personId) {
        throw new ValidationError('Assignment must belong to the person performing the work');
      }
    }

    let effectiveStartedAt = dto.startedAt !== undefined ? dto.startedAt : current.startedAt;
    let effectiveEndedAt = dto.endedAt !== undefined ? dto.endedAt : current.endedAt;
    let effectiveDuration = dto.durationMinutes !== undefined ? dto.durationMinutes : current.durationMinutes;

    if (dto.durationMinutes !== undefined && dto.endedAt === undefined && effectiveStartedAt) {
      effectiveEndedAt = new Date(new Date(effectiveStartedAt).getTime() + dto.durationMinutes * 60000);
    } else if ((dto.startedAt !== undefined || dto.endedAt !== undefined) && dto.durationMinutes === undefined && effectiveStartedAt && effectiveEndedAt) {
      effectiveDuration = Math.round((new Date(effectiveEndedAt).getTime() - new Date(effectiveStartedAt).getTime()) / 60000);
    }

    validateWorkTimestampsAndDuration(effectiveStartedAt, effectiveEndedAt, effectiveDuration);

    const updateData = {
      ...dto,
      startedAt: effectiveStartedAt,
      endedAt: effectiveEndedAt,
      durationMinutes: effectiveDuration,
    };

    const updated = await WorkRepository.updateWorkRecord(organizationId, workId, updateData);
    if (!updated) {
      throw new NotFoundError(`Work record '${workId}' not found in organization`);
    }

    eventBus.publish({
      eventName: 'work.updated',
      organizationId,
      actorId: dto.actorUserId,
      entityType: 'work_record',
      entityId: workId,
      payload: { updates: dto },
    });

    return WorkService.getWorkRecordById(organizationId, workId);
  }

  public static async transitionWorkStatus(
    organizationId: string,
    workId: string,
    targetStatus: WorkStatus,
    actorUserId?: string
  ): Promise<WorkRecordDetail> {
    const current = await WorkRepository.findWorkRecordById(organizationId, workId);
    if (!current) {
      throw new NotFoundError(`Work record '${workId}' not found in organization`);
    }

    if (!canTransitionWorkStatus(current.status, targetStatus)) {
      throw new ValidationError(
        `Invalid work status transition from '${current.status}' to '${targetStatus}'`
      );
    }

    const updated = await WorkRepository.updateWorkStatus(organizationId, workId, targetStatus);
    if (!updated) {
      throw new NotFoundError(`Work record '${workId}' not found in organization`);
    }

    const eventNameMap: Record<WorkStatus, string> = {
      draft: 'work.updated',
      submitted: 'work.submitted',
      approved: 'work.approved',
      rejected: 'work.rejected',
      cancelled: 'work.cancelled',
    };

    eventBus.publish({
      eventName: eventNameMap[targetStatus],
      organizationId,
      actorId: actorUserId,
      entityType: 'work_record',
      entityId: workId,
      payload: {
        previousStatus: current.status,
        newStatus: targetStatus,
      },
    });

    return WorkService.getWorkRecordById(organizationId, workId);
  }

  // --- EVIDENCE ---
  public static async addEvidence(dto: CreateEvidenceDTO): Promise<WorkEvidence> {
    const work = await WorkRepository.findWorkRecordById(dto.organizationId, dto.workRecordId);
    if (!work) {
      throw new NotFoundError(`Work record '${dto.workRecordId}' not found in organization`);
    }

    if (work.status === 'approved' || work.status === 'cancelled') {
      throw new ValidationError(`Cannot add evidence to work record in terminal status '${work.status}'`);
    }

    const evidence = await WorkRepository.addEvidence({
      organizationId: dto.organizationId,
      workRecordId: dto.workRecordId,
      evidenceType: dto.evidenceType,
      title: dto.title,
      referenceUri: dto.referenceUri,
      provider: dto.provider,
      externalId: dto.externalId,
      description: dto.description,
      metadata: dto.metadata,
    });

    eventBus.publish({
      eventName: 'evidence.added',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId,
      entityType: 'work_evidence',
      entityId: evidence.id,
      payload: {
        workRecordId: dto.workRecordId,
        evidenceType: evidence.evidenceType,
      },
    });

    return evidence;
  }

  public static async listEvidence(
    organizationId: string,
    workRecordId: string
  ): Promise<WorkEvidence[]> {
    const work = await WorkRepository.findWorkRecordById(organizationId, workRecordId);
    if (!work) {
      throw new NotFoundError(`Work record '${workRecordId}' not found in organization`);
    }
    return WorkRepository.findEvidenceForWork(organizationId, workRecordId);
  }

  public static async removeEvidence(
    organizationId: string,
    workRecordId: string,
    evidenceId: string,
    actorUserId?: string
  ): Promise<void> {
    const work = await WorkRepository.findWorkRecordById(organizationId, workRecordId);
    if (!work) {
      throw new NotFoundError(`Work record '${workRecordId}' not found in organization`);
    }

    if (work.status === 'approved') {
      throw new ValidationError('Cannot remove evidence from an approved work record');
    }

    const removed = await WorkRepository.removeEvidence(organizationId, workRecordId, evidenceId);
    if (!removed) {
      throw new NotFoundError(`Evidence '${evidenceId}' not found on work record`);
    }

    eventBus.publish({
      eventName: 'evidence.removed',
      organizationId,
      actorId: actorUserId,
      entityType: 'work_evidence',
      entityId: evidenceId,
      payload: { workRecordId },
    });
  }

  // --- OUTCOMES ---
  public static async createOutcome(dto: CreateOutcomeDTO): Promise<Outcome> {
    const creator = await PeopleRepository.findPersonById(dto.organizationId, dto.createdByPersonId);
    if (!creator) {
      throw new NotFoundError(`Creator person '${dto.createdByPersonId}' not found in organization`);
    }

    const outcome = await WorkRepository.createOutcome({
      organizationId: dto.organizationId,
      outcomeType: dto.outcomeType,
      title: dto.title,
      description: dto.description,
      measurableValue: dto.measurableValue,
      measurableUnit: dto.measurableUnit,
      metadata: dto.metadata,
      createdByPersonId: dto.createdByPersonId,
    });

    eventBus.publish({
      eventName: 'outcome.created',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId,
      entityType: 'outcome',
      entityId: outcome.id,
      payload: {
        title: outcome.title,
        outcomeType: outcome.outcomeType,
      },
    });

    return outcome;
  }

  public static async getOutcomeById(organizationId: string, outcomeId: string): Promise<Outcome> {
    const outcome = await WorkRepository.findOutcomeById(organizationId, outcomeId);
    if (!outcome) {
      throw new NotFoundError(`Outcome '${outcomeId}' not found in organization`);
    }
    return outcome;
  }

  public static async listOutcomes(
    organizationId: string,
    outcomeType?: string
  ): Promise<Outcome[]> {
    return WorkRepository.findAllOutcomes(organizationId, outcomeType);
  }

  public static async linkWorkOutcome(
    organizationId: string,
    workRecordId: string,
    outcomeId: string,
    contributionType?: string | null,
    contributionValue?: number | null,
    metadata?: Record<string, unknown>,
    actorUserId?: string
  ): Promise<WorkOutcome> {
    const work = await WorkRepository.findWorkRecordById(organizationId, workRecordId);
    if (!work) {
      throw new NotFoundError(`Work record '${workRecordId}' not found in organization`);
    }

    const outcome = await WorkRepository.findOutcomeById(organizationId, outcomeId);
    if (!outcome) {
      throw new NotFoundError(`Outcome '${outcomeId}' not found in organization`);
    }

    const workOutcome = await WorkRepository.linkWorkOutcome({
      workRecordId,
      outcomeId,
      contributionType,
      contributionValue,
      metadata,
    });

    eventBus.publish({
      eventName: 'work_outcome.linked',
      organizationId,
      actorId: actorUserId,
      entityType: 'work_outcome',
      entityId: workRecordId,
      payload: { workRecordId, outcomeId },
    });

    return workOutcome;
  }

  public static async listWorkOutcomes(
    organizationId: string,
    workRecordId: string
  ): Promise<Outcome[]> {
    const work = await WorkRepository.findWorkRecordById(organizationId, workRecordId);
    if (!work) {
      throw new NotFoundError(`Work record '${workRecordId}' not found in organization`);
    }
    return WorkRepository.findOutcomesForWork(organizationId, workRecordId);
  }

  public static async unlinkWorkOutcome(
    organizationId: string,
    workRecordId: string,
    outcomeId: string,
    actorUserId?: string
  ): Promise<void> {
    const work = await WorkRepository.findWorkRecordById(organizationId, workRecordId);
    if (!work) {
      throw new NotFoundError(`Work record '${workRecordId}' not found in organization`);
    }

    const unlinked = await WorkRepository.unlinkWorkOutcome(organizationId, workRecordId, outcomeId);
    if (!unlinked) {
      throw new NotFoundError(`Association between work record '${workRecordId}' and outcome '${outcomeId}' not found`);
    }

    eventBus.publish({
      eventName: 'work_outcome.unlinked',
      organizationId,
      actorId: actorUserId,
      entityType: 'work_outcome',
      entityId: workRecordId,
      payload: { workRecordId, outcomeId },
    });
  }
}
