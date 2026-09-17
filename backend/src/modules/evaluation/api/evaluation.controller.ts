import { Request, Response, NextFunction } from 'express';
import { EvaluationService } from '../application/evaluation.service.js';
import { sendSuccess } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { EvaluationState, FeedbackType } from '../domain/evaluation.entity.js';

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

export class EvaluationController {
  private service: EvaluationService;

  constructor(service?: EvaluationService) {
    this.service = service || new EvaluationService();
  }

  public createEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { template_id, templateId, subject_id, subjectId, evaluator_ids, evaluatorIds, scheduled_at, scheduledAt } = req.body;

      const tId = templateId || template_id;
      const sId = subjectId || subject_id;
      const eIds = evaluatorIds || evaluator_ids;
      const sAt = scheduledAt || scheduled_at;

      if (!tId) throw new ValidationError('templateId is required');
      if (!sId) throw new ValidationError('subjectId is required');

      const evaluation = await this.service.createEvaluation(
        organizationId,
        { templateId: tId, subjectId: sId, evaluatorIds: eIds, scheduledAt: sAt },
        req.user?.id
      );

      sendSuccess(res, evaluation, 201);
    } catch (err) {
      next(err);
    }
  };

  public listEvaluations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { state, subjectId, evaluatorId } = req.query;

      const evaluations = await this.service.listEvaluations(organizationId, {
        state: state as EvaluationState,
        subjectId: subjectId as string,
        evaluatorId: evaluatorId as string,
      });

      sendSuccess(res, evaluations);
    } catch (err) {
      next(err);
    }
  };

  public getEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const evaluation = await this.service.getEvaluation(organizationId, id);
      sendSuccess(res, evaluation);
    } catch (err) {
      next(err);
    }
  };

  public updateEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { state } = req.body;

      if (state) {
        const evaluation = await this.service.transitionState(organizationId, id, state as EvaluationState, req.user?.id);
        sendSuccess(res, evaluation);
        return;
      }

      const evaluation = await this.service.getEvaluation(organizationId, id);
      sendSuccess(res, evaluation);
    } catch (err) {
      next(err);
    }
  };

  public submitEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const evaluation = await this.service.transitionState(organizationId, id, 'Submitted', req.user?.id);
      sendSuccess(res, evaluation);
    } catch (err) {
      next(err);
    }
  };

  public completeEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const evaluation = await this.service.transitionState(organizationId, id, 'Completed', req.user?.id);
      sendSuccess(res, evaluation);
    } catch (err) {
      next(err);
    }
  };

  public cancelEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const evaluation = await this.service.transitionState(organizationId, id, 'Cancelled', req.user?.id);
      sendSuccess(res, evaluation);
    } catch (err) {
      next(err);
    }
  };

  public reopenEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const evaluation = await this.service.transitionState(organizationId, id, 'Draft', req.user?.id);
      sendSuccess(res, evaluation);
    } catch (err) {
      next(err);
    }
  };

  public getCriteriaResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const evaluation = await this.service.getEvaluation(organizationId, id);
      sendSuccess(res, evaluation.criterionResults || []);
    } catch (err) {
      next(err);
    }
  };

  public submitCriterionResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const criterionId = getParamId(req, 'criterionId');
      const { value, comments } = req.body;

      if (value === undefined || value === null) {
        throw new ValidationError('Result value is required');
      }

      const result = await this.service.submitCriterionResult(
        organizationId,
        id,
        criterionId,
        String(value),
        comments,
        req.user?.id
      );

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  public addFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { feedback_type, feedbackType, payload } = req.body;

      const fType = (feedbackType || feedback_type) as FeedbackType;
      if (!fType) throw new ValidationError('feedbackType is required');
      if (!payload) throw new ValidationError('payload is required');

      const feedback = await this.service.addFeedback(organizationId, id, fType, payload, req.user?.id);
      sendSuccess(res, feedback, 201);
    } catch (err) {
      next(err);
    }
  };

  public getHistorySnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const snapshot = await this.service.getHistorySnapshot(organizationId, id);
      sendSuccess(res, snapshot);
    } catch (err) {
      next(err);
    }
  };
}
