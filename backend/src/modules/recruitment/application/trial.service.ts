import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../../database/index.js';
import { TrialEntity, TrialStatus } from '../domain/trial.entity.js';
import { TrialRepository } from '../infrastructure/trial.repository.js';
import { ApplicationRepository } from '../infrastructure/application.repository.js';
import { CandidateRepository } from '../infrastructure/candidate.repository.js';
import { RecruitmentTenantValidator } from '../infrastructure/recruitment-tenant.validator.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/index.js';

export interface ScheduleTrialInput {
  organizationId: string;
  applicationId: string;
  startDate: Date | string;
  endDate: Date | string;
  objectives?: string | null;
  mentorId?: string | null;
  assignmentId?: string | null;
  evaluationId?: string | null;
  actorId?: string;
  requestId?: string;
}

export interface CompleteTrialInput {
  organizationId: string;
  applicationId: string;
  deliverablesSummary?: string | null;
  outcomeNotes?: string | null;
  actorId?: string;
  requestId?: string;
}

export class TrialService {
  public static async scheduleTrial(input: ScheduleTrialInput): Promise<TrialEntity> {
    await RecruitmentTenantValidator.validateApplication(input.organizationId, input.applicationId);
    await RecruitmentTenantValidator.validatePerson(input.organizationId, input.mentorId, 'Mentor');

    const app = await ApplicationRepository.findById(input.organizationId, input.applicationId);
    if (!app) {
      throw new NotFoundError(`Application '${input.applicationId}' not found in organization`);
    }

    const candidate = await CandidateRepository.findById(input.organizationId, app.candidateId);
    if (!candidate) {
      throw new NotFoundError(`Candidate for application '${input.applicationId}' not found`);
    }

    const isExternalCandidate = candidate.internalPersonId === null || candidate.internalPersonId === undefined;

    const existingActive = await TrialRepository.findActiveByApplicationId(input.organizationId, input.applicationId);
    if (existingActive) {
      throw new ConflictError(`Application already has an active or scheduled trial`);
    }

    const id = uuidv4();
    const now = new Date();
    const entity = new TrialEntity({
      id,
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'scheduled',
      objectives: input.objectives ?? null,
      deliverablesSummary: null,
      outcomeNotes: null,
      mentorId: input.mentorId ?? null,
      assignmentId: input.assignmentId ?? null,
      evaluationId: input.evaluationId ?? null,
      createdAt: now,
      updatedAt: now,
      isExternalCandidate,
    });

    const result = await withTransaction(async (tx) => {
      const saved = await TrialRepository.create(entity, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.trial.scheduled',
        entityType: 'Trial',
        entityId: saved.id,
        afterState: { id: saved.id, applicationId: saved.applicationId, status: saved.status },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.trial.scheduled',
        entityType: 'Trial',
        entityId: saved.id,
        payload: { id: saved.id, applicationId: saved.applicationId },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async getTrial(organizationId: string, applicationId: string): Promise<TrialEntity> {
    const trial = await TrialRepository.findActiveByApplicationId(organizationId, applicationId);
    if (!trial) {
      const list = await TrialRepository.list(organizationId, { applicationId });
      if (list.length === 0) {
        throw new NotFoundError(`No trial found for application '${applicationId}'`);
      }
      return list[0];
    }
    return trial;
  }

  public static async startTrial(
    organizationId: string,
    applicationId: string,
    actorId?: string,
    requestId?: string
  ): Promise<TrialEntity> {
    const trial = await TrialService.getTrial(organizationId, applicationId);
    trial.activate();

    const result = await withTransaction(async (tx) => {
      const saved = await TrialRepository.update(trial, tx);

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'recruitment.trial.started',
        entityType: 'Trial',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status },
        requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'recruitment.trial.started',
        entityType: 'Trial',
        entityId: saved.id,
        payload: { id: saved.id, applicationId: saved.applicationId },
        actorId,
        requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async completeTrial(input: CompleteTrialInput): Promise<TrialEntity> {
    const trial = await TrialService.getTrial(input.organizationId, input.applicationId);
    trial.complete(input.deliverablesSummary, input.outcomeNotes);

    const result = await withTransaction(async (tx) => {
      const saved = await TrialRepository.update(trial, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.trial.completed',
        entityType: 'Trial',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status, deliverablesSummary: saved.deliverablesSummary },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.trial.completed',
        entityType: 'Trial',
        entityId: saved.id,
        payload: { id: saved.id, applicationId: saved.applicationId },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }
}
