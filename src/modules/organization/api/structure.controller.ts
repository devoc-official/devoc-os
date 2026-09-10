import { Request, Response } from 'express';
import { StructureService } from '../application/structure.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request): string => {
  const id = req.params.id;
  return (Array.isArray(id) ? id[0] : id) as string;
};

export class StructureController {
  // --- BRANCHES ---
  public static async listBranches(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const branches = await StructureService.listBranches(organizationId);
      sendSuccess(res, branches, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name, code, status } = req.body;
      if (!name || !code) {
        throw new ValidationError('name and code are required');
      }

      const branch = await StructureService.createBranch(
        organizationId,
        { name, code, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, branch, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getBranch(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const branch = await StructureService.getBranch(organizationId, id);
      sendSuccess(res, branch, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateBranch(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { name, status } = req.body;

      const updated = await StructureService.updateBranch(
        organizationId,
        id,
        { name, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- BUSINESS UNITS ---
  public static async listBusinessUnits(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const bus = await StructureService.listBusinessUnits(organizationId);
      sendSuccess(res, bus, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createBusinessUnit(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name, code, status } = req.body;
      if (!name || !code) {
        throw new ValidationError('name and code are required');
      }

      const bu = await StructureService.createBusinessUnit(
        organizationId,
        { name, code, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, bu, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getBusinessUnit(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const bu = await StructureService.getBusinessUnit(organizationId, id);
      sendSuccess(res, bu, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateBusinessUnit(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { name, status } = req.body;

      const updated = await StructureService.updateBusinessUnit(
        organizationId,
        id,
        { name, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- DEPARTMENTS ---
  public static async listDepartments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const depts = await StructureService.listDepartments(organizationId);
      sendSuccess(res, depts, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name, code, status } = req.body;
      if (!name || !code) {
        throw new ValidationError('name and code are required');
      }

      const dept = await StructureService.createDepartment(
        organizationId,
        { name, code, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, dept, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const dept = await StructureService.getDepartment(organizationId, id);
      sendSuccess(res, dept, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { name, status } = req.body;

      const updated = await StructureService.updateDepartment(
        organizationId,
        id,
        { name, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- TEAMS ---
  public static async listTeams(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const teams = await StructureService.listTeams(organizationId);
      sendSuccess(res, teams, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createTeam(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name, code, status, isTemporary, departmentId, businessUnitId } = req.body;
      if (!name || !code) {
        throw new ValidationError('name and code are required');
      }

      const team = await StructureService.createTeam(
        organizationId,
        { name, code, status, isTemporary, departmentId, businessUnitId },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, team, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getTeam(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const team = await StructureService.getTeam(organizationId, id);
      sendSuccess(res, team, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateTeam(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { name, status, isTemporary, departmentId, businessUnitId } = req.body;

      const updated = await StructureService.updateTeam(
        organizationId,
        id,
        { name, status, isTemporary, departmentId, businessUnitId },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
