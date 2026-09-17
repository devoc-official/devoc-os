import { Request, Response } from 'express';
import { SkillService } from '../application/skill.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string = 'id'): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class SkillController {
  public static async listSkills(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const list = await SkillService.listSkills(organizationId);
      sendSuccess(res, list, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createSkill(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name, code, category, status } = req.body;
      if (!name || !code) {
        throw new ValidationError('name and code are required');
      }

      const skill = await SkillService.createSkill(
        organizationId,
        { name, code, category, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, skill, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getSkill(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const skill = await SkillService.getSkill(organizationId, id);
      sendSuccess(res, skill, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async assignPersonSkill(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = getParamId(req, 'personId');
      const { skillId, proficiencyLevel } = req.body;

      if (!skillId || !proficiencyLevel) {
        throw new ValidationError('skillId and proficiencyLevel are required');
      }

      const personSkill = await SkillService.assignPersonSkill(
        organizationId,
        personId,
        { skillId, proficiencyLevel },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, personSkill, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listPersonSkills(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = getParamId(req, 'personId');
      const list = await SkillService.listPersonSkills(organizationId, personId);
      sendSuccess(res, list, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async removePersonSkill(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      await SkillService.removePersonSkill(organizationId, id, req.user?.id, req.requestId);
      sendSuccess(res, { message: 'Person skill assignment removed successfully' }, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
