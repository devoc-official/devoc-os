import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { PositionService } from '../application/position.service.js';
import { CandidateService } from '../application/candidate.service.js';
import { ApplicationService } from '../application/application.service.js';
import { TrialService } from '../application/trial.service.js';
import { OfferService } from '../application/offer.service.js';
import { HiringService } from '../application/hiring.service.js';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository.js';
import { PipelineStageEntity } from '../domain/pipeline-stage.entity.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { v4 as uuidv4 } from 'uuid';

export class RecruitmentController {
  // --- POSITIONS ---
  public static async createPosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const position = await PositionService.createPosition({
        ...req.body,
        organizationId: orgId,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, position, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listPositions(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const positions = await PositionService.listPositions(orgId, {
        status: req.query.status as any,
        businessUnitId: req.query.businessUnitId as string,
        departmentId: req.query.departmentId as string,
        teamId: req.query.teamId as string,
        search: req.query.search as string,
      });
      sendSuccess(res, positions, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getPosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const position = await PositionService.getPosition(orgId, id);
      sendSuccess(res, position, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updatePosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const position = await PositionService.updatePosition(orgId, id, {
        ...req.body,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, position, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async openPosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const position = await PositionService.transitionStatus(orgId, id, 'open', req.user?.id, req.requestId);
      sendSuccess(res, position, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async pausePosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const position = await PositionService.transitionStatus(orgId, id, 'pause', req.user?.id, req.requestId);
      sendSuccess(res, position, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async closePosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const position = await PositionService.transitionStatus(orgId, id, 'close', req.user?.id, req.requestId);
      sendSuccess(res, position, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async archivePosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const position = await PositionService.transitionStatus(orgId, id, 'archive', req.user?.id, req.requestId);
      sendSuccess(res, position, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- CANDIDATES ---
  public static async createCandidate(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const candidate = await CandidateService.createCandidate({
        ...req.body,
        organizationId: orgId,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, candidate, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listCandidates(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const candidates = await CandidateService.listCandidates(orgId, {
        status: req.query.status as any,
        source: req.query.source as any,
        search: req.query.search as string,
      });
      sendSuccess(res, candidates, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getCandidate(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const candidate = await CandidateService.getCandidate(orgId, id);
      sendSuccess(res, candidate, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateCandidate(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const candidate = await CandidateService.updateCandidate(orgId, id, {
        ...req.body,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, candidate, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- PIPELINE STAGES ---
  public static async listPipelineStages(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      let stages = await PipelineStageRepository.list(orgId);
      if (stages.length === 0) {
        stages = await PipelineStageRepository.seedDefaultStages(orgId);
      }
      sendSuccess(res, stages, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createPipelineStage(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const stage = new PipelineStageEntity({
        id: uuidv4(),
        organizationId: orgId,
        stageCode: req.body.stageCode,
        name: req.body.name,
        stageType: req.body.stageType,
        orderIndex: req.body.orderIndex ?? 0,
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await PipelineStageRepository.create(stage);
      sendSuccess(res, saved, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updatePipelineStage(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const stage = await PipelineStageRepository.findById(orgId, id);
      if (!stage) {
        sendError(res, new NotFoundError(`Stage '${id}' not found`), req.requestId);
        return;
      }
      if (req.body.name !== undefined) stage.name = req.body.name;
      if (req.body.orderIndex !== undefined) stage.orderIndex = req.body.orderIndex;
      if (req.body.isActive !== undefined) stage.isActive = req.body.isActive;
      stage.updatedAt = new Date();

      const saved = await PipelineStageRepository.update(stage);
      sendSuccess(res, saved, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- APPLICATIONS ---
  public static async applyPosition(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const application = await ApplicationService.applyPosition({
        ...req.body,
        organizationId: orgId,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, application, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listApplications(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const applications = await ApplicationService.listApplications(orgId, {
        candidateId: req.query.candidateId as string,
        positionId: req.query.positionId as string,
        status: req.query.status as any,
        stageId: req.query.stageId as string,
      });
      sendSuccess(res, applications, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getApplication(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const data = await ApplicationService.getApplication(orgId, id);
      sendSuccess(res, { ...data.application, stageHistory: data.history }, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async advanceApplication(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const application = await ApplicationService.advanceStage(
        orgId,
        id,
        req.body.stageId,
        req.body.notes,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, application, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async rejectApplication(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const application = await ApplicationService.rejectApplication(
        orgId,
        id,
        req.body.reason,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, application, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async withdrawApplication(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const application = await ApplicationService.withdrawApplication(
        orgId,
        id,
        req.body.reason,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, application, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- STAGE ASSESSMENTS & MEETINGS ---
  public static async evaluateStage(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const stageId = req.params.stageId as string;
      const result = await ApplicationService.evaluateStage({
        organizationId: orgId,
        applicationId: id,
        stageId,
        status: req.body.status,
        notes: req.body.notes,
        evaluatorId: req.body.evaluatorId,
        evaluationId: req.body.evaluationId,
        meetingId: req.body.meetingId,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async scheduleInterview(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const stageId = req.params.stageId as string;
      const result = await ApplicationService.scheduleInterview(
        orgId,
        id,
        stageId,
        req.body.meetingId,
        req.body.evaluatorId,
        req.body.notes,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- TRIALS ---
  public static async scheduleTrial(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const trial = await TrialService.scheduleTrial({
        ...req.body,
        organizationId: orgId,
        applicationId: id,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, trial, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getTrial(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const trial = await TrialService.getTrial(orgId, id);
      sendSuccess(res, trial, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async startTrial(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const trial = await TrialService.startTrial(orgId, id, req.user?.id, req.requestId);
      sendSuccess(res, trial, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async completeTrial(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const trial = await TrialService.completeTrial({
        organizationId: orgId,
        applicationId: id,
        deliverablesSummary: req.body.deliverablesSummary,
        outcomeNotes: req.body.outcomeNotes,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, trial, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- OFFERS ---
  public static async createOffer(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const offer = await OfferService.createOffer({
        ...req.body,
        organizationId: orgId,
        applicationId: id,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, offer, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getOffer(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const offer = await OfferService.getActiveOfferByApplication(orgId, id);
      sendSuccess(res, offer, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async acceptOffer(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const offerId = req.params.offerId as string;
      const offer = await OfferService.acceptOffer({
        organizationId: orgId,
        offerId,
        responseNotes: req.body.responseNotes,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, offer, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async rejectOffer(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const offerId = req.params.offerId as string;
      const offer = await OfferService.rejectOffer({
        organizationId: orgId,
        offerId,
        responseNotes: req.body.responseNotes,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, offer, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async rescindOffer(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const offerId = req.params.offerId as string;
      const offer = await OfferService.rescindOffer({
        organizationId: orgId,
        offerId,
        responseNotes: req.body.responseNotes,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, offer, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- HIRING CONVERSION ---
  public static async hireCandidate(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = req.params.id as string;
      const result = await HiringService.hireCandidate({
        organizationId: orgId,
        applicationId: id,
        offerId: req.body.offerId,
        actorId: req.user?.id,
        requestId: req.requestId,
      });
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
