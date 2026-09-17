import { Request, Response } from 'express';
import { WorkService } from '../application/work.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class OutcomeController {
  public static async createOutcome(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const {
        outcomeType,
        title,
        description,
        measurableValue,
        measurableUnit,
        metadata,
        createdByPersonId,
      } = req.body;

      if (!outcomeType || !title || !createdByPersonId) {
        throw new ValidationError('outcomeType, title, and createdByPersonId are required fields');
      }

      const outcome = await WorkService.createOutcome({
        organizationId,
        outcomeType,
        title,
        description,
        measurableValue: measurableValue !== undefined ? Number(measurableValue) : undefined,
        measurableUnit,
        metadata,
        createdByPersonId,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, outcome, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listOutcomes(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const outcomeType = req.query.outcomeType as string | undefined;

      const outcomes = await WorkService.listOutcomes(organizationId, outcomeType);
      sendSuccess(res, outcomes);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getOutcomeById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const outcomeId = getParamId(req, 'outcomeId');

      const outcome = await WorkService.getOutcomeById(organizationId, outcomeId);
      sendSuccess(res, outcome);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
