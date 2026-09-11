import { Request, Response } from 'express';
import { MeetingService } from '../application/meeting.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class MeetingAgendaController {
  public static async addAgendaItem(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const { title, description, position, ownerPersonId, durationMinutes, status, metadata } = req.body;

      if (!title) {
        throw new ValidationError('title is a required field');
      }

      const item = await MeetingService.addAgendaItem(
        organizationId,
        meetingId,
        {
          title,
          description,
          position: position !== undefined ? Number(position) : undefined,
          ownerPersonId,
          durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
          status,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, item, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listAgendaItems(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');

      const items = await MeetingService.listAgendaItems(organizationId, meetingId);
      sendSuccess(res, items);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateAgendaItem(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const agendaItemId = getParamId(req, 'agendaItemId');
      const { title, description, position, ownerPersonId, durationMinutes, status, metadata } = req.body;

      const updated = await MeetingService.updateAgendaItem(
        organizationId,
        meetingId,
        agendaItemId,
        {
          title,
          description,
          position: position !== undefined ? Number(position) : undefined,
          ownerPersonId,
          durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
          status,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async removeAgendaItem(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const agendaItemId = getParamId(req, 'agendaItemId');

      await MeetingService.removeAgendaItem(organizationId, meetingId, agendaItemId, req.user?.id);
      sendSuccess(res, { message: 'Agenda item removed successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
