import { Request, Response } from 'express';
import { EmploymentService } from '../application/employment.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string = 'id'): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class EmploymentController {
  public static async listEmployments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const list = await EmploymentService.listEmployments(organizationId);
      sendSuccess(res, list, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createEmployment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { personId, employmentType, status, jobTitle, departmentId, businessUnitId, branchId, managerId, startDate } = req.body;

      if (!personId || !employmentType || !jobTitle) {
        throw new ValidationError('personId, employmentType, and jobTitle are required');
      }

      const employment = await EmploymentService.createEmployment(
        organizationId,
        {
          personId,
          employmentType,
          status,
          jobTitle,
          departmentId,
          businessUnitId,
          branchId,
          managerId,
          startDate: startDate ? new Date(startDate) : undefined,
        },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, employment, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getEmployment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const employment = await EmploymentService.getEmployment(organizationId, id);
      sendSuccess(res, employment, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateEmployment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { jobTitle, departmentId, businessUnitId, branchId, managerId, endDate } = req.body;

      const updated = await EmploymentService.updateEmployment(
        organizationId,
        id,
        {
          jobTitle,
          departmentId,
          businessUnitId,
          branchId,
          managerId,
          endDate: endDate ? new Date(endDate) : undefined,
        },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { nextStatus, changeReason, effectiveDate } = req.body;

      if (!nextStatus) {
        throw new ValidationError('nextStatus is required');
      }

      const updated = await EmploymentService.updateEmploymentStatus(
        organizationId,
        id,
        {
          nextStatus,
          changeReason,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const history = await EmploymentService.getEmploymentHistory(organizationId, id);
      sendSuccess(res, history, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getDirectReports(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = getParamId(req, 'personId');
      const reports = await EmploymentService.getDirectReports(organizationId, personId);
      sendSuccess(res, reports, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
