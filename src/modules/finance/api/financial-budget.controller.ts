import { Request, Response, NextFunction } from 'express';
import { FinancialBudgetService } from '../application/financial-budget.service.js';
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

export class FinancialBudgetController {
  private service: FinancialBudgetService;

  constructor(service?: FinancialBudgetService) {
    this.service = service || new FinancialBudgetService();
  }

  public listBudgets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { businessUnitId, business_unit_id, projectId, project_id, status } = req.query;

      const buId = (businessUnitId || business_unit_id) as string;
      const pId = (projectId || project_id) as string;

      const budgets = await this.service.listBudgets(organizationId, {
        businessUnitId: buId,
        projectId: pId,
        status: status as string,
      });

      sendSuccess(res, budgets);
    } catch (err) {
      next(err);
    }
  };

  public createBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const {
        business_unit_id,
        businessUnitId,
        department_id,
        departmentId,
        project_id,
        projectId,
        category_id,
        categoryId,
        period_name,
        periodName,
        budget_amount,
        budgetAmount,
        period_start,
        periodStart,
        period_end,
        periodEnd,
      } = req.body;

      const pName = periodName || period_name;
      const bAmount = budgetAmount !== undefined ? budgetAmount : budget_amount;
      const pStart = periodStart || period_start;
      const pEnd = periodEnd || period_end;

      if (!pName || bAmount === undefined || !pStart || !pEnd) {
        throw new ValidationError('periodName, budgetAmount, periodStart, and periodEnd are required');
      }

      const budget = await this.service.createBudget(
        organizationId,
        {
          businessUnitId: businessUnitId || business_unit_id,
          departmentId: departmentId || department_id,
          projectId: projectId || project_id,
          categoryId: categoryId || category_id,
          periodName: pName,
          budgetAmount: Number(bAmount),
          periodStart: pStart,
          periodEnd: pEnd,
        },
        req.user?.id
      );

      sendSuccess(res, budget, 201);
    } catch (err) {
      next(err);
    }
  };

  public getBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const budget = await this.service.getBudget(organizationId, id);
      sendSuccess(res, budget);
    } catch (err) {
      next(err);
    }
  };

  public updateBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { budget_amount, budgetAmount, status } = req.body;

      const bAmount = budgetAmount !== undefined ? budgetAmount : budget_amount;
      const budget = await this.service.updateBudget(
        organizationId,
        id,
        { budgetAmount: bAmount !== undefined ? Number(bAmount) : undefined, status },
        req.user?.id
      );

      sendSuccess(res, budget);
    } catch (err) {
      next(err);
    }
  };
}
