import { Request, Response } from 'express';
import { WorkService } from '../application/work.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { WorkStatus } from '../domain/work.entity.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class WorkController {
  public static async createWorkRecord(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const {
        personId,
        targetType,
        targetId,
        assignmentId,
        categoryId,
        title,
        description,
        status,
        startedAt,
        endedAt,
        durationMinutes,
        createdByPersonId,
        metadata,
      } = req.body;

      if (!personId || !categoryId || !title || durationMinutes === undefined || !createdByPersonId) {
        throw new ValidationError('personId, categoryId, title, durationMinutes, and createdByPersonId are required fields');
      }

      const workRecord = await WorkService.createWorkRecord({
        organizationId,
        personId,
        targetType,
        targetId,
        assignmentId,
        categoryId,
        title,
        description,
        status,
        startedAt: startedAt ? new Date(startedAt) : null,
        endedAt: endedAt ? new Date(endedAt) : null,
        durationMinutes: Number(durationMinutes),
        createdByPersonId,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, workRecord, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listWorkRecords(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = req.query.personId as string | undefined;
      const targetType = req.query.targetType as string | undefined;
      const targetId = req.query.targetId as string | undefined;
      const assignmentId = req.query.assignmentId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const status = req.query.status as WorkStatus | undefined;
      const startedFrom = req.query.startedFrom ? new Date(req.query.startedFrom as string) : undefined;
      const startedTo = req.query.startedTo ? new Date(req.query.startedTo as string) : undefined;

      const workRecords = await WorkService.listWorkRecords(organizationId, {
        personId,
        targetType,
        targetId,
        assignmentId,
        categoryId,
        status,
        startedFrom,
        startedTo,
      });

      sendSuccess(res, workRecords);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getWorkRecordById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workId = getParamId(req, 'workId');

      const workRecord = await WorkService.getWorkRecordById(organizationId, workId);
      sendSuccess(res, workRecord);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateWorkRecord(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workId = getParamId(req, 'workId');
      const {
        title,
        description,
        categoryId,
        startedAt,
        endedAt,
        durationMinutes,
        assignmentId,
        targetType,
        targetId,
        metadata,
      } = req.body;

      const updated = await WorkService.updateWorkRecord(organizationId, workId, {
        title,
        description,
        categoryId,
        startedAt: startedAt !== undefined ? (startedAt ? new Date(startedAt) : null) : undefined,
        endedAt: endedAt !== undefined ? (endedAt ? new Date(endedAt) : null) : undefined,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        assignmentId,
        targetType,
        targetId,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- LIFECYCLE TRANSITIONS ---
  public static createTransitionHandler(targetStatus: WorkStatus) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const { organizationId } = req.tenantContext!;
        const workId = getParamId(req, 'workId');

        const updated = await WorkService.transitionWorkStatus(
          organizationId,
          workId,
          targetStatus,
          req.user?.id
        );

        sendSuccess(res, updated);
      } catch (err) {
        sendError(res, err as Error, req.requestId);
      }
    };
  }

  // --- EVIDENCE ---
  public static async addEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workRecordId = getParamId(req, 'workId');
      const { evidenceType, title, referenceUri, provider, externalId, description, metadata } = req.body;

      if (!evidenceType) {
        throw new ValidationError('evidenceType is a required field');
      }

      const evidence = await WorkService.addEvidence({
        organizationId,
        workRecordId,
        evidenceType,
        title,
        referenceUri,
        provider,
        externalId,
        description,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, evidence, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workRecordId = getParamId(req, 'workId');

      const evidenceList = await WorkService.listEvidence(organizationId, workRecordId);
      sendSuccess(res, evidenceList);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async removeEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workRecordId = getParamId(req, 'workId');
      const evidenceId = getParamId(req, 'evidenceId');

      await WorkService.removeEvidence(organizationId, workRecordId, evidenceId, req.user?.id);
      sendSuccess(res, { message: 'Evidence removed successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- WORK OUTCOMES ---
  public static async linkOutcome(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workRecordId = getParamId(req, 'workId');
      const { outcomeId, contributionType, contributionValue, metadata } = req.body;

      if (!outcomeId) {
        throw new ValidationError('outcomeId is a required field');
      }

      const workOutcome = await WorkService.linkWorkOutcome(
        organizationId,
        workRecordId,
        outcomeId,
        contributionType,
        contributionValue !== undefined ? Number(contributionValue) : undefined,
        metadata,
        req.user?.id
      );

      sendSuccess(res, workOutcome, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listWorkOutcomes(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workRecordId = getParamId(req, 'workId');

      const outcomes = await WorkService.listWorkOutcomes(organizationId, workRecordId);
      sendSuccess(res, outcomes);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async unlinkOutcome(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const workRecordId = getParamId(req, 'workId');
      const outcomeId = getParamId(req, 'outcomeId');

      await WorkService.unlinkWorkOutcome(organizationId, workRecordId, outcomeId, req.user?.id);
      sendSuccess(res, { message: 'Work outcome unlinked successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
