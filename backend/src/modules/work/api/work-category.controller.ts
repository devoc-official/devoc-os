import { Request, Response } from 'express';
import { WorkCategoryService } from '../application/work-category.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class WorkCategoryController {
  public static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name, code, description, active, metadata } = req.body;

      if (!name || !code) {
        throw new ValidationError('name and code are required fields');
      }

      const category = await WorkCategoryService.createCategory({
        organizationId,
        name,
        code,
        description,
        active,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, category, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const activeOnly = req.query.activeOnly === 'true';

      const categories = await WorkCategoryService.listCategories(organizationId, activeOnly);
      sendSuccess(res, categories);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const categoryId = getParamId(req, 'categoryId');
      const { name, description, active, metadata } = req.body;

      const category = await WorkCategoryService.updateCategory(organizationId, categoryId, {
        name,
        description,
        active,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, category);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
