import { Request, Response, NextFunction } from 'express';
import { FinancialObligationService } from '../application/financial-obligation.service.js';
import { sendSuccess } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { ObligationState, AdjustmentType } from '../domain/financial-obligation.entity.js';

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

export class FinancialObligationController {
  private service: FinancialObligationService;

  constructor(service?: FinancialObligationService) {
    this.service = service || new FinancialObligationService();
  }

  public listObligations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { partyId, party_id, direction, state, projectId, project_id, businessUnitId, business_unit_id } = req.query;

      const pId = (partyId || party_id) as string;
      const projId = (projectId || project_id) as string;
      const buId = (businessUnitId || business_unit_id) as string;

      const obligations = await this.service.listObligations(organizationId, {
        partyId: pId,
        direction: direction as string,
        state: state as ObligationState,
        projectId: projId,
        businessUnitId: buId,
      });

      sendSuccess(res, obligations);
    } catch (err) {
      next(err);
    }
  };

  public createObligation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const {
        party_id,
        partyId,
        category_id,
        categoryId,
        direction,
        title,
        description,
        currency,
        issue_at,
        issueAt,
        due_at,
        dueAt,
        branch_id,
        branchId,
        business_unit_id,
        businessUnitId,
        department_id,
        departmentId,
        project_id,
        projectId,
        target_type,
        targetType,
        target_id,
        targetId,
        items,
      } = req.body;

      const pId = partyId || party_id;
      const cId = categoryId || category_id;
      const iAt = issueAt || issue_at;
      const dAt = dueAt || due_at;

      if (!pId || !cId || !direction || !title) {
        throw new ValidationError('partyId, categoryId, direction, and title are required');
      }

      const obligation = await this.service.createObligation(
        organizationId,
        {
          partyId: pId,
          categoryId: cId,
          direction,
          title,
          description,
          currency,
          issueAt: iAt,
          dueAt: dAt,
          branchId: branchId || branch_id,
          businessUnitId: businessUnitId || business_unit_id,
          departmentId: departmentId || department_id,
          projectId: projectId || project_id,
          targetType: targetType || target_type,
          targetId: targetId || target_id,
          items,
        },
        req.user?.id
      );

      sendSuccess(res, obligation, 201);
    } catch (err) {
      next(err);
    }
  };

  public getObligation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const obligation = await this.service.getObligation(organizationId, id);
      sendSuccess(res, obligation);
    } catch (err) {
      next(err);
    }
  };

  public issueObligation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const obligation = await this.service.transitionState(organizationId, id, 'Issued', req.user?.id);
      sendSuccess(res, obligation);
    } catch (err) {
      next(err);
    }
  };

  public cancelObligation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const obligation = await this.service.transitionState(organizationId, id, 'Cancelled', req.user?.id);
      sendSuccess(res, obligation);
    } catch (err) {
      next(err);
    }
  };

  public addAdjustment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { adjustment_type, adjustmentType, amount, reason } = req.body;

      const aType = (adjustmentType || adjustment_type) as AdjustmentType;
      if (!aType || amount === undefined || !reason) {
        throw new ValidationError('adjustmentType, amount, and reason are required');
      }

      const adjustment = await this.service.addAdjustment(
        organizationId,
        id,
        aType,
        Number(amount),
        reason,
        req.user?.id
      );

      sendSuccess(res, adjustment, 201);
    } catch (err) {
      next(err);
    }
  };
}
