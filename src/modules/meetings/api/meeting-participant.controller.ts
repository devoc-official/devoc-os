import { Request, Response } from 'express';
import { MeetingService } from '../application/meeting.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class MeetingParticipantController {
  public static async addParticipant(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const { personId, participantType, responseStatus, joinedAt, leftAt, notes, metadata } = req.body;

      if (!personId) {
        throw new ValidationError('personId is a required field');
      }

      const participant = await MeetingService.addParticipant(
        organizationId,
        meetingId,
        {
          personId,
          participantType,
          responseStatus,
          joinedAt: joinedAt ? new Date(joinedAt) : null,
          leftAt: leftAt ? new Date(leftAt) : null,
          notes,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, participant, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');

      const participants = await MeetingService.listParticipants(organizationId, meetingId);
      sendSuccess(res, participants);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateParticipant(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const participantId = getParamId(req, 'participantId');
      const { participantType, responseStatus, joinedAt, leftAt, notes, metadata } = req.body;

      const updated = await MeetingService.updateParticipant(
        organizationId,
        meetingId,
        participantId,
        {
          participantType,
          responseStatus,
          joinedAt: joinedAt !== undefined ? (joinedAt ? new Date(joinedAt) : null) : undefined,
          leftAt: leftAt !== undefined ? (leftAt ? new Date(leftAt) : null) : undefined,
          notes,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async removeParticipant(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const participantId = getParamId(req, 'participantId');

      await MeetingService.removeParticipant(organizationId, meetingId, participantId, req.user?.id);
      sendSuccess(res, { message: 'Participant removed successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
