import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../../database/index.js';
import { ApplicationEntity, ApplicationStatus } from '../domain/application.entity.js';
import { ApplicationRepository, ApplicationStageHistoryRow } from '../infrastructure/application.repository.js';
import { CandidateRepository } from '../infrastructure/candidate.repository.js';
import { PositionRepository } from '../infrastructure/position.repository.js';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository.js';
import { RecruitmentTenantValidator } from '../infrastructure/recruitment-tenant.validator.js';
import { DuplicateActiveApplicationError } from '../domain/recruitment.errors.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';

export interface ApplyPositionInput {
  organizationId: string;
  candidateId: string;
  positionId: string;
  notes?: string | null;
  actorId?: string;
  requestId?: string;
}

export interface EvaluateStageInput {
  organizationId: string;
  applicationId: string;
  stageId: string;
  status: 'passed' | 'failed' | 'in_progress' | 'skipped';
  notes?: string | null;
  evaluatorId?: string | null;
  evaluationId?: string | null;
  meetingId?: string | null;
  actorId?: string;
  requestId?: string;
}

export class ApplicationService {
  public static async applyPosition(input: ApplyPositionInput): Promise<ApplicationEntity> {
    await RecruitmentTenantValidator.validateCandidate(input.organizationId, input.candidateId);
    await RecruitmentTenantValidator.validatePosition(input.organizationId, input.positionId);

    const position = await PositionRepository.findById(input.organizationId, input.positionId);
    if (!position || position.status !== 'open') {
      throw new ValidationError(`Position is not currently open for applications`);
    }

    const existingActive = await ApplicationRepository.findActiveByCandidateAndPosition(
      input.organizationId,
      input.candidateId,
      input.positionId
    );
    if (existingActive) {
      throw new DuplicateActiveApplicationError(`Candidate already has an active application for this position`);
    }

    let stages = await PipelineStageRepository.list(input.organizationId);
    if (stages.length === 0) {
      stages = await PipelineStageRepository.seedDefaultStages(input.organizationId);
    }

    const initialStage = stages.find((s) => s.stageCode === 'applied') || stages[0];
    const id = uuidv4();
    const now = new Date();

    const entity = new ApplicationEntity({
      id,
      organizationId: input.organizationId,
      candidateId: input.candidateId,
      positionId: input.positionId,
      currentStageId: initialStage.id,
      status: 'applied',
      appliedAt: now,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await withTransaction(async (tx) => {
      const saved = await ApplicationRepository.create(entity, tx);
      await ApplicationRepository.recordStageHistory(
        input.organizationId,
        saved.id,
        initialStage.id,
        'in_progress',
        null,
        null,
        null,
        input.notes,
        tx
      );

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.application.created',
        entityType: 'Application',
        entityId: saved.id,
        afterState: { id: saved.id, candidateId: saved.candidateId, positionId: saved.positionId },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.application.created',
        entityType: 'Application',
        entityId: saved.id,
        payload: { id: saved.id, candidateId: saved.candidateId, positionId: saved.positionId },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async getApplication(
    organizationId: string,
    id: string
  ): Promise<{ application: ApplicationEntity; history: ApplicationStageHistoryRow[] }> {
    const application = await ApplicationRepository.findById(organizationId, id);
    if (!application) {
      throw new NotFoundError(`Application '${id}' not found in organization`);
    }
    const history = await ApplicationRepository.getStageHistory(organizationId, id);
    return { application, history };
  }

  public static async listApplications(
    organizationId: string,
    filters: {
      candidateId?: string;
      positionId?: string;
      status?: ApplicationStatus;
      stageId?: string;
    } = {}
  ): Promise<ApplicationEntity[]> {
    return ApplicationRepository.list(organizationId, filters);
  }

  public static async advanceStage(
    organizationId: string,
    id: string,
    stageId: string,
    notes?: string | null,
    actorId?: string,
    requestId?: string
  ): Promise<ApplicationEntity> {
    const { application } = await ApplicationService.getApplication(organizationId, id);
    await RecruitmentTenantValidator.validatePipelineStage(organizationId, stageId);

    const targetStage = await PipelineStageRepository.findById(organizationId, stageId);
    if (!targetStage) {
      throw new NotFoundError(`Pipeline stage '${stageId}' not found in organization`);
    }

    const newStatusMap: Record<string, ApplicationStatus> = {
      applied: 'applied',
      screening: 'screening',
      assessment: 'assessment',
      interview: 'interview',
      trial: 'trial',
      decision: 'decision',
      offer: 'offered',
      hired: 'hired',
    };

    const newStatus = newStatusMap[targetStage.stageType] || 'screening';
    application.advanceStage(stageId, newStatus);

    const result = await withTransaction(async (tx) => {
      const saved = await ApplicationRepository.update(application, tx);
      await ApplicationRepository.recordStageHistory(
        organizationId,
        saved.id,
        stageId,
        'in_progress',
        null,
        null,
        null,
        notes,
        tx
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'recruitment.application.stage_changed',
        entityType: 'Application',
        entityId: saved.id,
        afterState: { id: saved.id, stageId, status: saved.status },
        requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'recruitment.application.stage_changed',
        entityType: 'Application',
        entityId: saved.id,
        payload: { id: saved.id, stageId, status: saved.status },
        actorId,
        requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async rejectApplication(
    organizationId: string,
    id: string,
    reason?: string | null,
    actorId?: string,
    requestId?: string
  ): Promise<ApplicationEntity> {
    const { application } = await ApplicationService.getApplication(organizationId, id);
    application.reject(reason);

    const result = await withTransaction(async (tx) => {
      const saved = await ApplicationRepository.update(application, tx);

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'recruitment.application.rejected',
        entityType: 'Application',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status, rejectionReason: saved.rejectionReason },
        requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'recruitment.application.rejected',
        entityType: 'Application',
        entityId: saved.id,
        payload: { id: saved.id, reason: saved.rejectionReason },
        actorId,
        requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async withdrawApplication(
    organizationId: string,
    id: string,
    reason?: string | null,
    actorId?: string,
    requestId?: string
  ): Promise<ApplicationEntity> {
    const { application } = await ApplicationService.getApplication(organizationId, id);
    application.withdraw(reason);

    const result = await withTransaction(async (tx) => {
      const saved = await ApplicationRepository.update(application, tx);

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'recruitment.application.withdrawn',
        entityType: 'Application',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status, withdrawnReason: saved.withdrawnReason },
        requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'recruitment.application.withdrawn',
        entityType: 'Application',
        entityId: saved.id,
        payload: { id: saved.id, reason: saved.withdrawnReason },
        actorId,
        requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async evaluateStage(input: EvaluateStageInput): Promise<ApplicationStageHistoryRow> {
    const { application } = await ApplicationService.getApplication(input.organizationId, input.applicationId);
    await RecruitmentTenantValidator.validatePipelineStage(input.organizationId, input.stageId);
    await RecruitmentTenantValidator.validatePerson(input.organizationId, input.evaluatorId, 'Evaluator');

    const candidate = await CandidateRepository.findById(input.organizationId, application.candidateId);
    if (!candidate) {
      throw new NotFoundError(`Candidate for application '${input.applicationId}' not found`);
    }

    if (input.evaluationId) {
      if (!candidate.internalPersonId) {
        throw new ValidationError('External candidate without M2 Person identity cannot be linked to an M8 Evaluation');
      }
    }

    const txResult = await withTransaction(async (tx) => {
      const history = await ApplicationRepository.recordStageHistory(
        input.organizationId,
        input.applicationId,
        input.stageId,
        input.status,
        input.evaluatorId,
        input.evaluationId,
        input.meetingId,
        input.notes,
        tx
      );

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.application.stage_changed',
        entityType: 'ApplicationStage',
        entityId: history.id,
        afterState: { applicationId: input.applicationId, stageId: input.stageId, status: input.status },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.application.stage_changed',
        entityType: 'ApplicationStage',
        entityId: history.id,
        payload: { applicationId: input.applicationId, stageId: input.stageId, status: input.status },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { history, outbox };
    });

    await OutboxService.dispatchImmediate(txResult.outbox);
    return txResult.history;
  }

  public static async scheduleInterview(
    organizationId: string,
    applicationId: string,
    stageId: string,
    meetingId: string,
    evaluatorId?: string | null,
    notes?: string | null,
    actorId?: string,
    requestId?: string
  ): Promise<ApplicationStageHistoryRow> {
    await ApplicationService.getApplication(organizationId, applicationId);
    await RecruitmentTenantValidator.validatePipelineStage(organizationId, stageId);
    await RecruitmentTenantValidator.validatePerson(organizationId, evaluatorId, 'Evaluator');

    const txResult = await withTransaction(async (tx) => {
      const history = await ApplicationRepository.recordStageHistory(
        organizationId,
        applicationId,
        stageId,
        'scheduled',
        evaluatorId,
        null,
        meetingId,
        notes,
        tx
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'recruitment.application.stage_changed',
        entityType: 'ApplicationStage',
        entityId: history.id,
        afterState: { applicationId, stageId, meetingId },
        requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'recruitment.application.stage_changed',
        entityType: 'ApplicationStage',
        entityId: history.id,
        payload: { applicationId, stageId, meetingId },
        actorId,
        requestId,
        dbClient: tx,
      });

      return { history, outbox };
    });

    await OutboxService.dispatchImmediate(txResult.outbox);
    return txResult.history;
  }
}
