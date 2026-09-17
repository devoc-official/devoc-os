import { Request, Response } from 'express';
import { PlatformAdminService } from '../application/platform-admin.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParam = (req: Request, name: string): string => {
  const val = req.params[name];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class PlatformAdminController {
  public static async provisionOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { name, slug, adminEmail, adminPassword, adminFullName, timezone, locale, currency } = req.body;
      const result = await PlatformAdminService.provisionOrganization({
        name,
        slug,
        adminEmail,
        adminPassword,
        adminFullName,
        timezone,
        locale,
        currency,
        actorId: req.user?.id,
        requestId: req.requestId,
        correlationId: req.correlationId,
      });

      sendSuccess(res, result, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const { organizations, total } = await PlatformAdminService.listOrganizations({
        status,
        limit,
        offset,
      });

      sendSuccess(res, organizations, 200, {
        total,
        limit,
        offset,
        requestId: req.requestId,
      });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getOrganization(req: Request, res: Response): Promise<void> {
    try {
      const id = getParam(req, 'id');
      const result = await PlatformAdminService.getOrganization(id);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateOrganizationStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = getParam(req, 'id');
      const { status, reason } = req.body;
      if (!status) {
        throw new ValidationError("Body parameter 'status' is required");
      }

      const result = await PlatformAdminService.updateOrganizationStatus(
        id,
        status,
        reason,
        req.user?.id,
        req.requestId,
        req.correlationId
      );

      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- SETTINGS ---
  public static async listSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await PlatformAdminService.listPlatformSettings();
      sendSuccess(res, settings, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getSetting(req: Request, res: Response): Promise<void> {
    try {
      const key = getParam(req, 'key');
      const setting = await PlatformAdminService.getPlatformSetting(key);
      sendSuccess(res, setting, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateSetting(req: Request, res: Response): Promise<void> {
    try {
      const key = getParam(req, 'key');
      const { value, description } = req.body;
      if (value === undefined) {
        throw new ValidationError("Body parameter 'value' is required");
      }

      const setting = await PlatformAdminService.updatePlatformSetting(
        key,
        value,
        description,
        req.user?.id,
        req.requestId,
        req.correlationId
      );

      sendSuccess(res, setting, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- FEATURES ---
  public static async listFeatures(req: Request, res: Response): Promise<void> {
    try {
      const features = await PlatformAdminService.listPlatformFeatures();
      sendSuccess(res, features, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getFeature(req: Request, res: Response): Promise<void> {
    try {
      const featureKey = getParam(req, 'featureKey');
      const feature = await PlatformAdminService.getPlatformFeature(featureKey);
      sendSuccess(res, feature, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateFeature(req: Request, res: Response): Promise<void> {
    try {
      const featureKey = getParam(req, 'featureKey');
      const { isEnabled, configValue, description } = req.body;
      if (isEnabled === undefined || typeof isEnabled !== 'boolean') {
        throw new ValidationError("Boolean body parameter 'isEnabled' is required");
      }

      const feature = await PlatformAdminService.updatePlatformFeature(
        featureKey,
        isEnabled,
        configValue,
        description,
        req.user?.id,
        req.requestId,
        req.correlationId
      );

      sendSuccess(res, feature, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
