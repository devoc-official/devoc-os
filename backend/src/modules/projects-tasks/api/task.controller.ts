import { Request, Response } from 'express';
import { TaskService } from '../application/task.service.js';
import { AssignmentRepository } from '../../assignments/infrastructure/assignment.repository.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { TaskStatus, TaskPriority, TaskType, DependencyType } from '../domain/task.entity.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class TaskController {
  private static assignmentRepo = new AssignmentRepository();

  public static async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const {
        projectId,
        parentTaskId,
        title,
        description,
        taskKey,
        taskType,
        status,
        priority,
        startAt,
        dueAt,
        createdByPersonId,
        metadata,
      } = req.body;

      if (!projectId || !title || !createdByPersonId) {
        throw new ValidationError('projectId, title, and createdByPersonId are required fields');
      }

      const task = await TaskService.createTask({
        organizationId,
        projectId,
        parentTaskId,
        title,
        description,
        taskKey,
        taskType,
        status,
        priority,
        startAt: startAt ? new Date(startAt) : null,
        dueAt: dueAt ? new Date(dueAt) : null,
        createdByPersonId,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, task, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listTasks(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const projectId = req.query.projectId as string | undefined;
      const parentTaskId = req.query.parentTaskId as string | undefined;
      const status = req.query.status as TaskStatus | undefined;
      const priority = req.query.priority as TaskPriority | undefined;
      const taskType = req.query.taskType as TaskType | undefined;
      const createdByPersonId = req.query.createdByPersonId as string | undefined;

      const tasks = await TaskService.listTasks(organizationId, {
        projectId,
        parentTaskId,
        status,
        priority,
        taskType,
        createdByPersonId,
      });

      sendSuccess(res, tasks);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');

      const task = await TaskService.getTaskById(organizationId, taskId);
      sendSuccess(res, task);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');
      const { title, description, priority, startAt, dueAt, parentTaskId, metadata } = req.body;

      const task = await TaskService.updateTask(organizationId, taskId, {
        title,
        description,
        priority,
        startAt: startAt !== undefined ? (startAt ? new Date(startAt) : null) : undefined,
        dueAt: dueAt !== undefined ? (dueAt ? new Date(dueAt) : null) : undefined,
        parentTaskId,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(res, task);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- LIFECYCLE TRANSITIONS ---
  public static async transitionTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');
      const { status } = req.body;

      if (!status) {
        throw new ValidationError('Target status is required');
      }

      const task = await TaskService.transitionTaskStatus(
        organizationId,
        taskId,
        status as TaskStatus,
        req.user?.id
      );

      sendSuccess(res, task);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static createTransitionHandler(targetStatus: TaskStatus) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const { organizationId } = req.tenantContext!;
        const taskId = getParamId(req, 'taskId');

        const task = await TaskService.transitionTaskStatus(
          organizationId,
          taskId,
          targetStatus,
          req.user?.id
        );

        sendSuccess(res, task);
      } catch (err) {
        sendError(res, err as Error, req.requestId);
      }
    };
  }

  // --- CHILD TASKS ---
  public static async listChildTasks(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');

      // Verify task exists
      await TaskService.getTaskById(organizationId, taskId);

      const childTasks = await TaskService.listTasks(organizationId, { parentTaskId: taskId });
      sendSuccess(res, childTasks);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- DEPENDENCIES ---
  public static async listDependencies(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');

      const result = await TaskService.getTaskDependencies(organizationId, taskId);
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async addDependency(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');
      const { dependsOnTaskId, dependencyType, metadata } = req.body;

      if (!dependsOnTaskId) {
        throw new ValidationError('dependsOnTaskId is a required field');
      }

      const dep = await TaskService.addDependency(
        organizationId,
        taskId,
        dependsOnTaskId,
        (dependencyType as DependencyType) || 'blocks',
        metadata,
        req.user?.id
      );

      sendSuccess(res, dep, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async removeDependency(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');
      const dependsOnTaskId = req.params.dependencyId || req.params.dependsOnTaskId;

      if (!dependsOnTaskId) {
        throw new ValidationError('dependencyId/dependsOnTaskId parameter is required');
      }

      await TaskService.removeDependency(
        organizationId,
        taskId,
        dependsOnTaskId as string,
        req.user?.id
      );

      sendSuccess(res, { message: 'Task dependency removed successfully' });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- ASSIGNMENTS ---
  public static async listTaskAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const taskId = getParamId(req, 'taskId');

      // Verify task exists in org
      await TaskService.getTaskById(organizationId, taskId);

      const assignments = await TaskController.assignmentRepo.findAll(organizationId, {
        targetType: 'task',
        targetId: taskId,
      });

      sendSuccess(res, assignments);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
