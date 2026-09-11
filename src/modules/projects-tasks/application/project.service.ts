import { ProjectRepository } from '../infrastructure/project.repository.js';
import { PeopleRepository } from '../../people/infrastructure/people.repository.js';
import { getDbClient } from '../../../database/index.js';
import {
  Project,
  ProjectOwner,
  ProjectBusinessUnit,
  ProjectStatus,
  ProjectPriority,
  ProjectOwnershipType,
  canTransitionProjectStatus,
  validateProjectDates,
  validateProjectKey,
} from '../domain/project.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateProjectDTO {
  organizationId: string;
  name: string;
  key: string;
  description?: string | null;
  projectType: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startAt?: Date | null;
  targetEndAt?: Date | null;
  createdByPersonId: string;
  metadata?: Record<string, unknown>;
  businessUnitIds?: string[];
  owners?: Array<{
    personId: string;
    ownershipType: ProjectOwnershipType;
    startAt?: Date | null;
    endAt?: Date | null;
    metadata?: Record<string, unknown>;
  }>;
  actorUserId?: string | null;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string | null;
  projectType?: string;
  priority?: ProjectPriority;
  startAt?: Date | null;
  targetEndAt?: Date | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
}

export interface ProjectDetail extends Project {
  owners: ProjectOwner[];
  businessUnits: ProjectBusinessUnit[];
}

export class ProjectService {
  public static async createProject(dto: CreateProjectDTO): Promise<ProjectDetail> {
    // 1. Validate key
    validateProjectKey(dto.key);

    // 2. Key uniqueness check within organization
    const existingKey = await ProjectRepository.findProjectByKey(dto.organizationId, dto.key);
    if (existingKey) {
      throw new ValidationError(`Project key '${dto.key.toUpperCase()}' already exists in organization`);
    }

    // 3. Validate dates
    validateProjectDates(dto.startAt, dto.targetEndAt);

    // 4. Verify createdByPersonId existence
    const creator = await PeopleRepository.findPersonById(dto.organizationId, dto.createdByPersonId);
    if (!creator) {
      throw new NotFoundError(`Creator person '${dto.createdByPersonId}' not found in organization`);
    }

    // 5. Verify Business Units existence
    const db = getDbClient();
    if (dto.businessUnitIds && dto.businessUnitIds.length > 0) {
      for (const buId of dto.businessUnitIds) {
        const buRes = await db.query(
          `SELECT id FROM business_units WHERE id = $1 AND organization_id = $2;`,
          [buId, dto.organizationId]
        );
        if (buRes.rows.length === 0) {
          throw new NotFoundError(`Business unit '${buId}' not found in organization`);
        }
      }
    }

    // 6. Verify Owners existence
    if (dto.owners && dto.owners.length > 0) {
      for (const owner of dto.owners) {
        const p = await PeopleRepository.findPersonById(dto.organizationId, owner.personId);
        if (!p) {
          throw new NotFoundError(`Owner person '${owner.personId}' not found in organization`);
        }
      }
    }

    // 7. Create project
    const project = await ProjectRepository.createProject({
      organizationId: dto.organizationId,
      name: dto.name,
      key: dto.key,
      description: dto.description,
      projectType: dto.projectType,
      status: dto.status || 'idea',
      priority: dto.priority || 'medium',
      startAt: dto.startAt,
      targetEndAt: dto.targetEndAt,
      createdByPersonId: dto.createdByPersonId,
      metadata: dto.metadata,
    });

    // 8. Link Business Units
    const createdBUs: ProjectBusinessUnit[] = [];
    if (dto.businessUnitIds && dto.businessUnitIds.length > 0) {
      for (const buId of dto.businessUnitIds) {
        const linked = await ProjectRepository.linkBusinessUnit(dto.organizationId, project.id, buId);
        createdBUs.push(linked);
      }
    }

    // 9. Add Owners
    const createdOwners: ProjectOwner[] = [];
    if (dto.owners && dto.owners.length > 0) {
      for (const owner of dto.owners) {
        const o = await ProjectRepository.addProjectOwner(
          dto.organizationId,
          project.id,
          owner.personId,
          owner.ownershipType,
          owner.startAt,
          owner.endAt,
          owner.metadata
        );
        createdOwners.push(o);
      }
    }

    // 10. Publish domain event
    eventBus.publish({
      eventName: 'project.created',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId || undefined,
      entityType: 'project',
      entityId: project.id,
      payload: {
        name: project.name,
        key: project.key,
        projectType: project.projectType,
        status: project.status,
      },
    });

    return {
      ...project,
      owners: createdOwners,
      businessUnits: createdBUs,
    };
  }

  public static async getProjectById(
    organizationId: string,
    projectId: string
  ): Promise<ProjectDetail> {
    const project = await ProjectRepository.findProjectById(organizationId, projectId);
    if (!project) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    const owners = await ProjectRepository.findProjectOwners(organizationId, projectId);
    const businessUnits = await ProjectRepository.findProjectBusinessUnits(organizationId, projectId);

    return {
      ...project,
      owners,
      businessUnits,
    };
  }

  public static async listProjects(
    organizationId: string,
    filters?: {
      status?: ProjectStatus;
      priority?: ProjectPriority;
      projectType?: string;
      businessUnitId?: string;
    }
  ): Promise<ProjectDetail[]> {
    const projects = await ProjectRepository.findAllProjects(organizationId, filters);
    const details: ProjectDetail[] = [];

    for (const p of projects) {
      const owners = await ProjectRepository.findProjectOwners(organizationId, p.id);
      const businessUnits = await ProjectRepository.findProjectBusinessUnits(organizationId, p.id);
      details.push({
        ...p,
        owners,
        businessUnits,
      });
    }

    return details;
  }

  public static async updateProject(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDTO
  ): Promise<ProjectDetail> {
    const current = await ProjectRepository.findProjectById(organizationId, projectId);
    if (!current) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    if (current.status === 'archived') {
      throw new ValidationError('Cannot update an archived project');
    }

    const effectiveStartAt = dto.startAt !== undefined ? dto.startAt : current.startAt;
    const effectiveTargetEndAt = dto.targetEndAt !== undefined ? dto.targetEndAt : current.targetEndAt;
    validateProjectDates(effectiveStartAt, effectiveTargetEndAt);

    const updated = await ProjectRepository.updateProject(organizationId, projectId, dto);
    if (!updated) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    const owners = await ProjectRepository.findProjectOwners(organizationId, projectId);
    const businessUnits = await ProjectRepository.findProjectBusinessUnits(organizationId, projectId);

    eventBus.publish({
      eventName: 'project.updated',
      organizationId,
      actorId: dto.actorUserId || undefined,
      entityType: 'project',
      entityId: projectId,
      payload: { updates: dto },
    });

    return {
      ...updated,
      owners,
      businessUnits,
    };
  }

  public static async transitionProjectStatus(
    organizationId: string,
    projectId: string,
    targetStatus: ProjectStatus,
    actorUserId?: string
  ): Promise<ProjectDetail> {
    const project = await ProjectRepository.findProjectById(organizationId, projectId);
    if (!project) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    if (!canTransitionProjectStatus(project.status, targetStatus)) {
      throw new ValidationError(
        `Invalid project status transition from '${project.status}' to '${targetStatus}'`
      );
    }

    let actualEndAt: Date | null = project.actualEndAt ?? null;
    if (['released', 'maintenance', 'archived'].includes(targetStatus) && !actualEndAt) {
      actualEndAt = new Date();
    }

    const updated = await ProjectRepository.updateProjectStatus(
      organizationId,
      projectId,
      targetStatus,
      actualEndAt
    );
    if (!updated) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    const owners = await ProjectRepository.findProjectOwners(organizationId, projectId);
    const businessUnits = await ProjectRepository.findProjectBusinessUnits(organizationId, projectId);

    eventBus.publish({
      eventName: 'project.status_changed',
      organizationId,
      actorId: actorUserId,
      entityType: 'project',
      entityId: projectId,
      payload: {
        previousStatus: project.status,
        newStatus: targetStatus,
      },
    });

    return {
      ...updated,
      owners,
      businessUnits,
    };
  }

  public static async addOwner(
    organizationId: string,
    projectId: string,
    data: {
      personId: string;
      ownershipType: ProjectOwnershipType;
      startAt?: Date | null;
      endAt?: Date | null;
      metadata?: Record<string, unknown>;
      actorUserId?: string;
    }
  ): Promise<ProjectOwner> {
    const project = await ProjectRepository.findProjectById(organizationId, projectId);
    if (!project) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    if (project.status === 'archived') {
      throw new ValidationError('Cannot modify owners on an archived project');
    }

    const person = await PeopleRepository.findPersonById(organizationId, data.personId);
    if (!person) {
      throw new NotFoundError(`Person '${data.personId}' not found in organization`);
    }

    const owner = await ProjectRepository.addProjectOwner(
      organizationId,
      projectId,
      data.personId,
      data.ownershipType,
      data.startAt,
      data.endAt,
      data.metadata
    );

    eventBus.publish({
      eventName: 'project.owner_added',
      organizationId,
      actorId: data.actorUserId,
      entityType: 'project',
      entityId: projectId,
      payload: {
        personId: data.personId,
        ownershipType: data.ownershipType,
      },
    });

    return owner;
  }

  public static async removeOwner(
    organizationId: string,
    projectId: string,
    ownerId: string,
    actorUserId?: string
  ): Promise<void> {
    const project = await ProjectRepository.findProjectById(organizationId, projectId);
    if (!project) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    if (project.status === 'archived') {
      throw new ValidationError('Cannot modify owners on an archived project');
    }

    const removed = await ProjectRepository.removeProjectOwner(organizationId, projectId, ownerId);
    if (!removed) {
      throw new NotFoundError(`Project owner '${ownerId}' not found on project`);
    }

    eventBus.publish({
      eventName: 'project.owner_removed',
      organizationId,
      actorId: actorUserId,
      entityType: 'project',
      entityId: projectId,
      payload: { ownerId },
    });
  }

  public static async linkBusinessUnit(
    organizationId: string,
    projectId: string,
    businessUnitId: string,
    actorUserId?: string
  ): Promise<ProjectBusinessUnit> {
    const project = await ProjectRepository.findProjectById(organizationId, projectId);
    if (!project) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    if (project.status === 'archived') {
      throw new ValidationError('Cannot modify business units on an archived project');
    }

    const db = getDbClient();
    const buRes = await db.query(
      `SELECT id FROM business_units WHERE id = $1 AND organization_id = $2;`,
      [businessUnitId, organizationId]
    );
    if (buRes.rows.length === 0) {
      throw new NotFoundError(`Business unit '${businessUnitId}' not found in organization`);
    }

    const pbu = await ProjectRepository.linkBusinessUnit(organizationId, projectId, businessUnitId);

    eventBus.publish({
      eventName: 'project.business_unit_linked',
      organizationId,
      actorId: actorUserId,
      entityType: 'project',
      entityId: projectId,
      payload: { businessUnitId },
    });

    return pbu;
  }

  public static async unlinkBusinessUnit(
    organizationId: string,
    projectId: string,
    businessUnitId: string,
    actorUserId?: string
  ): Promise<void> {
    const project = await ProjectRepository.findProjectById(organizationId, projectId);
    if (!project) {
      throw new NotFoundError(`Project '${projectId}' not found in organization`);
    }

    if (project.status === 'archived') {
      throw new ValidationError('Cannot modify business units on an archived project');
    }

    const unlinked = await ProjectRepository.unlinkBusinessUnit(organizationId, projectId, businessUnitId);
    if (!unlinked) {
      throw new NotFoundError(`Business unit '${businessUnitId}' is not linked to project`);
    }

    eventBus.publish({
      eventName: 'project.business_unit_unlinked',
      organizationId,
      actorId: actorUserId,
      entityType: 'project',
      entityId: projectId,
      payload: { businessUnitId },
    });
  }
}
