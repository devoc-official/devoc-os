import { Request, Response } from 'express';
import { MeetingService } from '../application/meeting.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class MeetingNotesController {
  public static async getNotes(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');

      const notes = await MeetingService.getNotes(organizationId, meetingId);
      sendSuccess(res, notes);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async upsertDraftNotes(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const { content, preparedByPersonId, metadata } = req.body;

      if (!content) {
        throw new ValidationError('content is a required field');
      }

      const notes = await MeetingService.upsertDraftNotes(
        organizationId,
        meetingId,
        content,
        preparedByPersonId,
        metadata,
        req.user?.id
      );

      sendSuccess(res, notes, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async finalizeNotes(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const { preparedByPersonId } = req.body;

      const notes = await MeetingService.finalizeNotes(
        organizationId,
        meetingId,
        preparedByPersonId,
        req.user?.id
      );

      sendSuccess(res, notes, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
