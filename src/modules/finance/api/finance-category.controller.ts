import { Request, Response, NextFunction } from 'express';
import { FinanceCategoryService } from '../application/finance-category.service.js';
import { sendSuccess } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getOrgId = (req: Request): string => {
  const headerOrgId = req.headers['x-organization-id'];
  const paramOrgId = req.params.organizationId;
  const ctxOrgId = req.tenantContext?.organizationId;
  const orgId = (ctxOrgId || headerOrgId || paramOrgId) as string;
  if (!orgId) throw new ValidationError('Organization context is required');
  return Array.isArray(orgId) ? orgId[0] : orgId;
};

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class FinanceCategoryController {
  private service: FinanceCategoryService;

  constructor(service?: FinanceCategoryService) {
    this.service = service || new FinanceCategoryService();
  }

  public listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const categories = await this.service.listCategories(organizationId);
      sendSuccess(res, categories);
    } catch (err) {
      next(err);
    }
  };

  public createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { name, code, category_type, categoryType, description } = req.body;

      const cType = categoryType || category_type;
      if (!name || !code || !cType) {
        throw new ValidationError('name, code, and categoryType are required');
      }

      const category = await this.service.createCategory(
        organizationId,
        { name, code, categoryType: cType, description },
        req.user?.id
      );

      sendSuccess(res, category, 201);
    } catch (err) {
      next(err);
    }
  };

  public updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { name, description, is_active, isActive } = req.body;

      const active = isActive !== undefined ? isActive : is_active;
      const category = await this.service.updateCategory(
        organizationId,
        id,
        { name, description, isActive: active },
        req.user?.id
      );

      sendSuccess(res, category);
    } catch (err) {
      next(err);
    }
  };
}
