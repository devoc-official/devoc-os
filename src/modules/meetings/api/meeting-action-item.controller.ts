import { Request, Response } from 'express';
import { MeetingService } from '../application/meeting.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class MeetingActionItemController {
  public static async createActionItem(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const { title, description, ownerPersonId, dueAt, status, taskId, metadata } = req.body;

      if (!title) {
        throw new ValidationError('title is a required field');
      }

      const actionItem = await MeetingService.createActionItem(
        organizationId,
        meetingId,
        {
          title,
          description,
          ownerPersonId,
          dueAt: dueAt ? new Date(dueAt) : null,
          status,
          taskId,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, actionItem, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listActionItems(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');

      const actionItems = await MeetingService.listActionItems(organizationId, meetingId);
      sendSuccess(res, actionItems);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateActionItem(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const actionItemId = getParamId(req, 'actionItemId');
      const { title, description, ownerPersonId, dueAt, status, taskId, metadata } = req.body;

      const updated = await MeetingService.updateActionItem(
        organizationId,
        meetingId,
        actionItemId,
        {
          title,
          description,
          ownerPersonId,
          dueAt: dueAt !== undefined ? (dueAt ? new Date(dueAt) : null) : undefined,
          status,
          taskId,
          metadata,
        },
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async completeActionItem(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const actionItemId = getParamId(req, 'actionItemId');

      const updated = await MeetingService.updateActionItem(
        organizationId,
        meetingId,
        actionItemId,
        { status: 'completed' },
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async cancelActionItem(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const actionItemId = getParamId(req, 'actionItemId');

      const updated = await MeetingService.updateActionItem(
        organizationId,
        meetingId,
        actionItemId,
        { status: 'cancelled' },
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async linkTask(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const actionItemId = getParamId(req, 'actionItemId');
      const taskId = getParamId(req, 'taskId');

      const updated = await MeetingService.linkTaskToActionItem(
        organizationId,
        meetingId,
        actionItemId,
        taskId,
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async unlinkTask(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const meetingId = getParamId(req, 'meetingId');
      const actionItemId = getParamId(req, 'actionItemId');

      const updated = await MeetingService.unlinkTaskFromActionItem(
        organizationId,
        meetingId,
        actionItemId,
        req.user?.id
      );

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
