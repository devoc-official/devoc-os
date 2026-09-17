import { Request, Response, NextFunction } from 'express';
import { EvaluationTemplateService } from '../application/evaluation-template.service.js';
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

export class EvaluationTemplateController {
  private service: EvaluationTemplateService;

  constructor(service?: EvaluationTemplateService) {
    this.service = service || new EvaluationTemplateService();
  }

  public listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const templates = await this.service.listTemplates(organizationId);
      sendSuccess(res, templates);
    } catch (err) {
      next(err);
    }
  };

  public createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { name, description, criteria } = req.body;

      if (!name) {
        throw new ValidationError('Template name is required');
      }

      const template = await this.service.createTemplate(
        organizationId,
        { name, description, criteria },
        req.user?.id
      );
      sendSuccess(res, template, 201);
    } catch (err) {
      next(err);
    }
  };

  public getTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const template = await this.service.getTemplate(organizationId, id);
      sendSuccess(res, template);
    } catch (err) {
      next(err);
    }
  };

  public updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { name, description, criteria } = req.body;

      const template = await this.service.updateTemplate(
        organizationId,
        id,
        { name, description, criteria },
        req.user?.id
      );
      sendSuccess(res, template);
    } catch (err) {
      next(err);
    }
  };

  public deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      await this.service.deactivateTemplate(organizationId, id, req.user?.id);
      sendSuccess(res, { message: `Template '${id}' deactivated` });
    } catch (err) {
      next(err);
    }
  };
}
