import { Request, Response } from 'express';
import { ProjectService } from '../application/project.service.js';
import { TaskService } from '../application/task.service.js';
import { AssignmentRepository } from '../../assignments/infrastructure/assignment.repository.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { ProjectStatus, ProjectPriority, ProjectOwnershipType } from '../domain/project.entity.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class ProjectController {
  private static assignmentRepo = new AssignmentRepository();

  public static async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const {
        name,
        key,
        description,
        projectType,
        status,
        priority,
        startAt,
        targetEndAt,
        createdByPersonId,
        metadata,
        businessUnitIds,
        owners,
      } = req.body;

      if (!name || !key || !projectType || !createdByPersonId) {
        throw new ValidationError('name, key, projectType, and createdByPersonId are required fields');
      }

      const project = await ProjectService.createProject({
        organizationId,
        name,
        key,
        description,
        projectType,
        status,
        priority,
        startAt: startAt ? new Date(startAt) : null,
        targetEndAt: targetEndAt ? new Date(targetEndAt) : null,
        createdByPersonId,
        metadata,
        businessUnitIds,
        owners,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, project, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listProjects(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const status = req.query.status as ProjectStatus | undefined;
      const priority = req.query.priority as ProjectPriority | undefined;
      const projectType = req.query.projectType as string | undefined;
      const businessUnitId = req.query.businessUnitId as string | undefined;

      const projects = await ProjectService.listProjects(organizationId, {
        status,
        priority,
        projectType,
        businessUnitId,
      });

      sendSuccess(res, projects);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');

      const project = await ProjectService.getProjectById(organizationId, projectId);
      sendSuccess(res, project);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');
      const { name, description, projectType, priority, startAt, targetEndAt, metadata } = req.body;

      const project = await ProjectService.updateProject(organizationId, projectId, {
        name,
        description,
        projectType,
        priority,
        startAt: startAt !== undefined ? (startAt ? new Date(startAt) : null) : undefined,
        targetEndAt: targetEndAt !== undefined ? (targetEndAt ? new Date(targetEndAt) : null) : undefined,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, project);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- LIFECYCLE TRANSITIONS ---
  public static async transitionProjectStatus(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');
      const { status } = req.body;

      if (!status) {
        throw new ValidationError('Target status is required');
      }

      const project = await ProjectService.transitionProjectStatus(
        organizationId,
        projectId,
        status as ProjectStatus,
        req.user?.id
      );

      sendSuccess(res, project);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static createTransitionHandler(targetStatus: ProjectStatus) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const { organizationId } = req.tenantContext!;
        const projectId = getParamId(req, 'projectId');

        const project = await ProjectService.transitionProjectStatus(
          organizationId,
          projectId,
          targetStatus,
          req.user?.id
        );

        sendSuccess(res, project);
      } catch (err) {
        sendError(res, err as Error, req.requestId);
      }
    };
  }

  // --- OWNERS ---
  public static async listOwners(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');

      const project = await ProjectService.getProjectById(organizationId, projectId);
      sendSuccess(res, project.owners);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async addOwner(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');
      const { personId, ownershipType, startAt, endAt, metadata } = req.body;

      if (!personId || !ownershipType) {
        throw new ValidationError('personId and ownershipType are required fields');
      }

      const owner = await ProjectService.addOwner(organizationId, projectId, {
        personId,
        ownershipType: ownershipType as ProjectOwnershipType,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, owner, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async removeOwner(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');
      const ownerId = getParamId(req, 'ownerId');

      await ProjectService.removeOwner(organizationId, projectId, ownerId, req.user?.id);
      sendSuccess(res, { message: 'Project owner removed successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- BUSINESS UNITS ---
  public static async listBusinessUnits(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');

      const project = await ProjectService.getProjectById(organizationId, projectId);
      sendSuccess(res, project.businessUnits);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async linkBusinessUnit(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');
      const businessUnitId = req.params.businessUnitId || req.body.businessUnitId;

      if (!businessUnitId) {
        throw new ValidationError('businessUnitId is required');
      }

      const pbu = await ProjectService.linkBusinessUnit(
        organizationId,
        projectId,
        businessUnitId as string,
        req.user?.id
      );

      sendSuccess(res, pbu, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async unlinkBusinessUnit(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');
      const businessUnitId = getParamId(req, 'businessUnitId');

      await ProjectService.unlinkBusinessUnit(organizationId, projectId, businessUnitId, req.user?.id);
      sendSuccess(res, { message: 'Business unit unlinked successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- INTEGRATIONS ---
  public static async listProjectTasks(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');

      // Verify project exists in org
      await ProjectService.getProjectById(organizationId, projectId);

      const tasks = await TaskService.listTasks(organizationId, { projectId });
      sendSuccess(res, tasks);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listProjectAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = getParamId(req, 'projectId');

      // Verify project exists in org
      await ProjectService.getProjectById(organizationId, projectId);

      const assignments = await ProjectController.assignmentRepo.findAll(organizationId, {
        targetType: 'project',
        targetId: projectId,
      });

      sendSuccess(res, assignments);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
