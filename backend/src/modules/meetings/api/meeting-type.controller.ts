import { Request, Response } from 'express';
import { MeetingTypeService } from '../application/meeting-type.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class MeetingTypeController {
  public static async createType(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { code, name, description, isActive, metadata } = req.body;

      if (!code || !name) {
        throw new ValidationError('code and name are required fields');
      }

      const type = await MeetingTypeService.createType(organizationId, {
        code,
        name,
        description,
        isActive,
        metadata,
      });

      sendSuccess(res, type, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listTypes(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const activeOnly = req.query.active === 'true';

      const types = await MeetingTypeService.listTypes(organizationId, activeOnly);
      sendSuccess(res, types);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateType(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const typeId = getParamId(req, 'meetingTypeId');
      const { name, description, isActive, metadata } = req.body;

      const updated = await MeetingTypeService.updateType(organizationId, typeId, {
        name,
        description,
        isActive,
        metadata,
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
