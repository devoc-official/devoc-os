import { Request, Response } from 'express';
import { PeopleService } from '../application/people.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParamId = (req: Request, paramName: string = 'id'): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class PeopleController {
  // --- PEOPLE ---
  public static async listPeople(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const people = await PeopleService.listPeople(organizationId);
      sendSuccess(res, people, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createPerson(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { firstName, lastName, email, phone, userId, status } = req.body;
      if (!firstName || !lastName || !email) {
        throw new ValidationError('firstName, lastName, and email are required');
      }

      const person = await PeopleService.createPerson(
        organizationId,
        { firstName, lastName, email, phone, userId, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, person, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getPerson(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const person = await PeopleService.getPerson(organizationId, id);
      sendSuccess(res, person, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updatePerson(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { firstName, lastName, phone, status, userId } = req.body;

      const updated = await PeopleService.updatePerson(
        organizationId,
        id,
        { firstName, lastName, phone, status, userId },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async archivePerson(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);

      const archived = await PeopleService.archivePerson(
        organizationId,
        id,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, archived, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- ROLES ---
  public static async listRoles(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const roles = await PeopleService.listRoles(organizationId);
      sendSuccess(res, roles, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name, code, description, isSystem, status } = req.body;
      if (!name || !code) {
        throw new ValidationError('name and code are required');
      }

      const role = await PeopleService.createRole(
        organizationId,
        { name, code, description, isSystem, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, role, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getRole(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const role = await PeopleService.getRole(organizationId, id);
      sendSuccess(res, role, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const { name, description, status } = req.body;

      const updated = await PeopleService.updateRole(
        organizationId,
        id,
        { name, description, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- PERSON ROLES ---
  public static async assignPersonRole(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = getParamId(req, 'personId');
      const { roleId, businessUnitId, departmentId, teamId, startDate } = req.body;
      if (!roleId) {
        throw new ValidationError('roleId is required');
      }

      const personRole = await PeopleService.assignRoleToPerson(
        organizationId,
        personId,
        { roleId, businessUnitId, departmentId, teamId, startDate: startDate ? new Date(startDate) : undefined },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, personRole, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listPersonRoles(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = getParamId(req, 'personId');
      const roles = await PeopleService.listRolesForPerson(organizationId, personId);
      sendSuccess(res, roles, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async endPersonRole(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const id = getParamId(req);
      const ended = await PeopleService.endPersonRole(organizationId, id, req.user?.id, req.requestId);
      sendSuccess(res, ended, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
