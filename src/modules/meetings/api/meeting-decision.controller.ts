import { Request, Response } from 'express';
import { MeetingService } from '../application/meeting.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class MeetingDecisionController {
  public static async createDecision(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const { title, decisionText, decidedAt, recordedByPersonId, metadata } = req.body;

      if (!title || !decisionText) {
        throw new ValidationError('title and decisionText are required fields');
      }

      const decision = await MeetingService.createDecision(
        organizationId,
        meetingId,
        {
          title,
          decisionText,
          decidedAt: decidedAt ? new Date(decidedAt) : undefined,
          recordedByPersonId,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, decision, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listDecisions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');

      const decisions = await MeetingService.listDecisions(organizationId, meetingId);
      sendSuccess(res, decisions);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateDecision(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const decisionId = getParamId(req, 'decisionId');
      const { title, decisionText, decidedAt, metadata } = req.body;

      const updated = await MeetingService.updateDecision(
        organizationId,
        meetingId,
        decisionId,
        {
          title,
          decisionText,
          decidedAt: decidedAt ? new Date(decidedAt) : undefined,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async deleteDecision(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const decisionId = getParamId(req, 'decisionId');

      await MeetingService.deleteDecision(organizationId, meetingId, decisionId);
      sendSuccess(res, { message: 'Decision deleted successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
