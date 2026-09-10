import { StructureRepository } from '../infrastructure/structure.repository.js';
import { ResourceValidator, ResourceStatus } from '../domain/structure.entity.js';
import { eventBus } from '../../../events/event-bus.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/index.js';

export class StructureService {
  // --- BRANCHES ---
  public static async createBranch(
    organizationId: string,
    data: { name: string; code: string; status?: ResourceStatus },
    actorId?: string,
    requestId?: string
  ) {
    ResourceValidator.validateCode(data.code);
    try {
      const branch = await StructureRepository.createBranch({
        organizationId,
        name: data.name,
        code: data.code,
        status: data.status,
      });

      eventBus.publish({
        eventName: 'BranchCreated',
        organizationId,
        actorId,
        entityType: 'Branch',
        entityId: branch.id,
        payload: { name: branch.name, code: branch.code },
        requestId,
      });

      return branch;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError(`Branch with code '${data.code}' already exists in this organization`);
      }
      throw err;
    }
  }

  public static async listBranches(organizationId: string) {
    return StructureRepository.listBranches(organizationId);
  }

  public static async getBranch(organizationId: string, id: string) {
    const branch = await StructureRepository.findBranchById(organizationId, id);
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }
    return branch;
  }

  public static async updateBranch(
    organizationId: string,
    id: string,
    data: { name?: string; status?: ResourceStatus },
    actorId?: string,
    requestId?: string
  ) {
    const existing = await this.getBranch(organizationId, id);
    if (data.status) {
      ResourceValidator.validateStatusTransition(existing.status, data.status);
    }

    const updated = await StructureRepository.updateBranch(organizationId, id, data);
    if (!updated) {
      throw new NotFoundError('Branch not found');
    }

    eventBus.publish({
      eventName: 'BranchUpdated',
      organizationId,
      actorId,
      entityType: 'Branch',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }

  // --- BUSINESS UNITS ---
  public static async createBusinessUnit(
    organizationId: string,
    data: { name: string; code: string; status?: ResourceStatus },
    actorId?: string,
    requestId?: string
  ) {
    ResourceValidator.validateCode(data.code);
    try {
      const bu = await StructureRepository.createBusinessUnit({
        organizationId,
        name: data.name,
        code: data.code,
        status: data.status,
      });

      eventBus.publish({
        eventName: 'BusinessUnitCreated',
        organizationId,
        actorId,
        entityType: 'BusinessUnit',
        entityId: bu.id,
        payload: { name: bu.name, code: bu.code },
        requestId,
      });

      return bu;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError(`Business Unit with code '${data.code}' already exists in this organization`);
      }
      throw err;
    }
  }

  public static async listBusinessUnits(organizationId: string) {
    return StructureRepository.listBusinessUnits(organizationId);
  }

  public static async getBusinessUnit(organizationId: string, id: string) {
    const bu = await StructureRepository.findBusinessUnitById(organizationId, id);
    if (!bu) {
      throw new NotFoundError('Business Unit not found');
    }
    return bu;
  }

  public static async updateBusinessUnit(
    organizationId: string,
    id: string,
    data: { name?: string; status?: ResourceStatus },
    actorId?: string,
    requestId?: string
  ) {
    const existing = await this.getBusinessUnit(organizationId, id);
    if (data.status) {
      ResourceValidator.validateStatusTransition(existing.status, data.status);
    }

    const updated = await StructureRepository.updateBusinessUnit(organizationId, id, data);
    if (!updated) {
      throw new NotFoundError('Business Unit not found');
    }

    eventBus.publish({
      eventName: 'BusinessUnitUpdated',
      organizationId,
      actorId,
      entityType: 'BusinessUnit',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }

  // --- DEPARTMENTS ---
  public static async createDepartment(
    organizationId: string,
    data: { name: string; code: string; status?: ResourceStatus },
    actorId?: string,
    requestId?: string
  ) {
    ResourceValidator.validateCode(data.code);
    try {
      const dept = await StructureRepository.createDepartment({
        organizationId,
        name: data.name,
        code: data.code,
        status: data.status,
      });

      eventBus.publish({
        eventName: 'DepartmentCreated',
        organizationId,
        actorId,
        entityType: 'Department',
        entityId: dept.id,
        payload: { name: dept.name, code: dept.code },
        requestId,
      });

      return dept;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError(`Department with code '${data.code}' already exists in this organization`);
      }
      throw err;
    }
  }

  public static async listDepartments(organizationId: string) {
    return StructureRepository.listDepartments(organizationId);
  }

  public static async getDepartment(organizationId: string, id: string) {
    const dept = await StructureRepository.findDepartmentById(organizationId, id);
    if (!dept) {
      throw new NotFoundError('Department not found');
    }
    return dept;
  }

  public static async updateDepartment(
    organizationId: string,
    id: string,
    data: { name?: string; status?: ResourceStatus },
    actorId?: string,
    requestId?: string
  ) {
    const existing = await this.getDepartment(organizationId, id);
    if (data.status) {
      ResourceValidator.validateStatusTransition(existing.status, data.status);
    }

    const updated = await StructureRepository.updateDepartment(organizationId, id, data);
    if (!updated) {
      throw new NotFoundError('Department not found');
    }

    eventBus.publish({
      eventName: 'DepartmentUpdated',
      organizationId,
      actorId,
      entityType: 'Department',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }

  // --- TEAMS ---
  public static async createTeam(
    organizationId: string,
    data: {
      name: string;
      code: string;
      status?: ResourceStatus;
      isTemporary?: boolean;
      departmentId?: string | null;
      businessUnitId?: string | null;
    },
    actorId?: string,
    requestId?: string
  ) {
    ResourceValidator.validateCode(data.code);
    try {
      const team = await StructureRepository.createTeam({
        organizationId,
        name: data.name,
        code: data.code,
        status: data.status,
        isTemporary: data.isTemporary,
        departmentId: data.departmentId,
        businessUnitId: data.businessUnitId,
      });

      eventBus.publish({
        eventName: 'TeamCreated',
        organizationId,
        actorId,
        entityType: 'Team',
        entityId: team.id,
        payload: { name: team.name, code: team.code, isTemporary: team.isTemporary },
        requestId,
      });

      return team;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError(`Team with code '${data.code}' already exists in this organization`);
      }
      throw err;
    }
  }

  public static async listTeams(organizationId: string) {
    return StructureRepository.listTeams(organizationId);
  }

  public static async getTeam(organizationId: string, id: string) {
    const team = await StructureRepository.findTeamById(organizationId, id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }
    return team;
  }

  public static async updateTeam(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      status?: ResourceStatus;
      isTemporary?: boolean;
      departmentId?: string | null;
      businessUnitId?: string | null;
    },
    actorId?: string,
    requestId?: string
  ) {
    const existing = await this.getTeam(organizationId, id);
    if (data.status) {
      ResourceValidator.validateStatusTransition(existing.status, data.status);
    }

    const updated = await StructureRepository.updateTeam(organizationId, id, data);
    if (!updated) {
      throw new NotFoundError('Team not found');
    }

    eventBus.publish({
      eventName: 'TeamUpdated',
      organizationId,
      actorId,
      entityType: 'Team',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }
}
