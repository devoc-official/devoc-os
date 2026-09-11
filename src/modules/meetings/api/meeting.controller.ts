import { Request, Response } from 'express';
import { MeetingService } from '../application/meeting.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { MeetingStatus } from '../domain/meeting.entity.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class MeetingController {
  public static async createMeeting(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const {
        title,
        description,
        meetingTypeId,
        scheduledStartAt,
        scheduledEndAt,
        locationType,
        locationReference,
        organizerPersonId,
        createdByPersonId,
        targetType,
        targetId,
        metadata,
      } = req.body;

      if (!title || !meetingTypeId || !scheduledStartAt || !scheduledEndAt || !organizerPersonId || !createdByPersonId) {
        throw new ValidationError(
          'title, meetingTypeId, scheduledStartAt, scheduledEndAt, organizerPersonId, and createdByPersonId are required fields'
        );
      }

      const meeting = await MeetingService.createMeeting({
        organizationId,
        title,
        description,
        meetingTypeId,
        scheduledStartAt: new Date(scheduledStartAt),
        scheduledEndAt: new Date(scheduledEndAt),
        locationType,
        locationReference,
        organizerPersonId,
        createdByPersonId,
        targetType,
        targetId,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, meeting, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listMeetings(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const status = req.query.status as MeetingStatus | undefined;
      const meetingTypeId = req.query.meetingTypeId as string | undefined;
      const organizerPersonId = req.query.organizerPersonId as string | undefined;
      const targetType = req.query.targetType as string | undefined;
      const targetId = req.query.targetId as string | undefined;
      const scheduledFrom = req.query.scheduledFrom ? new Date(req.query.scheduledFrom as string) : undefined;
      const scheduledTo = req.query.scheduledTo ? new Date(req.query.scheduledTo as string) : undefined;
      const participantPersonId = req.query.participantPersonId as string | undefined;

      const meetings = await MeetingService.listMeetings(organizationId, {
        status,
        meetingTypeId,
        organizerPersonId,
        targetType,
        targetId,
        scheduledFrom,
        scheduledTo,
        participantPersonId,
      });

      sendSuccess(res, meetings);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getMeetingById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');

      const meeting = await MeetingService.getMeetingById(organizationId, meetingId);
      sendSuccess(res, meeting);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateMeeting(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const {
        title,
        description,
        meetingTypeId,
        scheduledStartAt,
        scheduledEndAt,
        actualStartAt,
        actualEndAt,
        locationType,
        locationReference,
        organizerPersonId,
        targetType,
        targetId,
        metadata,
      } = req.body;

      const updated = await MeetingService.updateMeeting(organizationId, meetingId, {
        title,
        description,
        meetingTypeId,
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : undefined,
        scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : undefined,
        actualStartAt: actualStartAt !== undefined ? (actualStartAt ? new Date(actualStartAt) : null) : undefined,
        actualEndAt: actualEndAt !== undefined ? (actualEndAt ? new Date(actualEndAt) : null) : undefined,
        locationType,
        locationReference,
        organizerPersonId,
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

  // --- LIFECYCLE HANDLERS ---
  public static createTransitionHandler(targetStatus: MeetingStatus) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const { organizationId } = req.tenantContext!;
        const meetingId = getParamId(req, 'meetingId');
        const { actualStartAt, actualEndAt } = req.body;

        const updated = await MeetingService.transitionMeetingStatus(
          organizationId,
          meetingId,
          targetStatus,
          actualStartAt ? new Date(actualStartAt) : undefined,
          actualEndAt ? new Date(actualEndAt) : undefined,
          req.user?.id
        );

        sendSuccess(res, updated);
      } catch (err) {
        sendError(res, err as Error, req.requestId);
      }
    };
  }
}
