import { TaskRepository } from '../infrastructure/task.repository.js';
import { ProjectRepository } from '../infrastructure/project.repository.js';
import { PeopleRepository } from '../../people/infrastructure/people.repository.js';
import {
  Task,
  TaskDependency,
  TaskStatus,
  TaskPriority,
  TaskType,
  DependencyType,
  canTransitionTaskStatus,
  validateTaskDates,
  validateTaskTypeHierarchy,
  detectDependencyCycle,
} from '../domain/task.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateTaskDTO {
  organizationId: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  taskKey?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  startAt?: Date | null;
  dueAt?: Date | null;
  createdByPersonId: string;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  startAt?: Date | null;
  dueAt?: Date | null;
  parentTaskId?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
}

export class TaskService {
  public static async createTask(dto: CreateTaskDTO): Promise<Task> {
    // 1. Verify Project existence and tenant boundary
    const project = await ProjectRepository.findProjectById(dto.organizationId, dto.projectId);
    if (!project) {
      throw new NotFoundError(`Project '${dto.projectId}' not found in organization`);
    }

    if (project.status === 'archived') {
      throw new ValidationError('Cannot create tasks in an archived project');
    }

    // 2. Verify createdByPersonId existence
    const creator = await PeopleRepository.findPersonById(dto.organizationId, dto.createdByPersonId);
    if (!creator) {
      throw new NotFoundError(`Creator person '${dto.createdByPersonId}' not found in organization`);
    }

    const taskType = dto.taskType || 'task';

    // 3. Parent Task check & hierarchy validation
    let parentTaskType: TaskType | null = null;
    if (dto.parentTaskId) {
      const parentTask = await TaskRepository.findTaskById(dto.organizationId, dto.parentTaskId);
      if (!parentTask) {
        throw new NotFoundError(`Parent task '${dto.parentTaskId}' not found in organization`);
      }
      if (parentTask.projectId !== dto.projectId) {
        throw new ValidationError('Parent task must belong to the same project');
      }
      parentTaskType = parentTask.taskType;
    }

    validateTaskTypeHierarchy(taskType, parentTaskType);

    // 4. Validate dates
    validateTaskDates(dto.startAt, dto.dueAt);

    // 5. Determine Task Key
    let taskKey = dto.taskKey?.trim().toUpperCase();
    if (!taskKey) {
      const existingTasks = await TaskRepository.findAllTasks(dto.organizationId, { projectId: dto.projectId });
      const sequence = existingTasks.length + 1;
      taskKey = `${project.key}-${sequence}`;
    }

    // Key uniqueness check within project
    const existingKey = await TaskRepository.findTaskByKey(dto.projectId, taskKey);
    if (existingKey) {
      throw new ValidationError(`Task key '${taskKey}' already exists in project`);
    }

    // 6. Create task
    const task = await TaskRepository.createTask({
      organizationId: dto.organizationId,
      projectId: dto.projectId,
      parentTaskId: dto.parentTaskId,
      title: dto.title,
      description: dto.description,
      taskKey,
      taskType,
      status: dto.status || 'backlog',
      priority: dto.priority || 'medium',
      startAt: dto.startAt,
      dueAt: dto.dueAt,
      createdByPersonId: dto.createdByPersonId,
      metadata: dto.metadata,
    });

    // 7. Domain event
    eventBus.publish({
      eventName: 'task.created',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId || undefined,
      entityType: 'task',
      entityId: task.id,
      payload: {
        title: task.title,
        taskKey: task.taskKey,
        projectId: task.projectId,
        taskType: task.taskType,
        status: task.status,
      },
    });

    return task;
  }

  public static async getTaskById(organizationId: string, taskId: string): Promise<Task> {
    const task = await TaskRepository.findTaskById(organizationId, taskId);
    if (!task) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }
    return task;
  }

  public static async listTasks(
    organizationId: string,
    filters?: {
      projectId?: string;
      parentTaskId?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      taskType?: TaskType;
      createdByPersonId?: string;
    }
  ): Promise<Task[]> {
    return TaskRepository.findAllTasks(organizationId, filters);
  }

  public static async updateTask(
    organizationId: string,
    taskId: string,
    dto: UpdateTaskDTO
  ): Promise<Task> {
    const current = await TaskRepository.findTaskById(organizationId, taskId);
    if (!current) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    const project = await ProjectRepository.findProjectById(organizationId, current.projectId);
    if (project && project.status === 'archived') {
      throw new ValidationError('Cannot update task in an archived project');
    }

    if (current.status === 'done' || current.status === 'cancelled') {
      // allow metadata or simple updates if needed, but validate status
    }

    const effectiveStartAt = dto.startAt !== undefined ? dto.startAt : current.startAt;
    const effectiveDueAt = dto.dueAt !== undefined ? dto.dueAt : current.dueAt;
    validateTaskDates(effectiveStartAt, effectiveDueAt);

    if (dto.parentTaskId !== undefined && dto.parentTaskId !== current.parentTaskId) {
      if (dto.parentTaskId === current.id) {
        throw new ValidationError('Task cannot be its own parent');
      }
      let parentTaskType: TaskType | null = null;
      if (dto.parentTaskId) {
        const parentTask = await TaskRepository.findTaskById(organizationId, dto.parentTaskId);
        if (!parentTask) {
          throw new NotFoundError(`Parent task '${dto.parentTaskId}' not found in organization`);
        }
        if (parentTask.projectId !== current.projectId) {
          throw new ValidationError('Parent task must belong to the same project');
        }
        parentTaskType = parentTask.taskType;
      }
      validateTaskTypeHierarchy(current.taskType, parentTaskType);
    }

    const updated = await TaskRepository.updateTask(organizationId, taskId, dto);
    if (!updated) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    eventBus.publish({
      eventName: 'task.updated',
      organizationId,
      actorId: dto.actorUserId || undefined,
      entityType: 'task',
      entityId: taskId,
      payload: { updates: dto },
    });

    return updated;
  }

  public static async transitionTaskStatus(
    organizationId: string,
    taskId: string,
    targetStatus: TaskStatus,
    actorUserId?: string
  ): Promise<Task> {
    const task = await TaskRepository.findTaskById(organizationId, taskId);
    if (!task) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    if (!canTransitionTaskStatus(task.status, targetStatus)) {
      throw new ValidationError(
        `Invalid task status transition from '${task.status}' to '${targetStatus}'`
      );
    }

    let completedAt: Date | null = task.completedAt ?? null;
    if (targetStatus === 'done' && !completedAt) {
      completedAt = new Date();
    } else if (targetStatus !== 'done') {
      completedAt = null;
    }

    const updated = await TaskRepository.updateTaskStatus(
      organizationId,
      taskId,
      targetStatus,
      completedAt
    );
    if (!updated) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    eventBus.publish({
      eventName: 'task.status_changed',
      organizationId,
      actorId: actorUserId,
      entityType: 'task',
      entityId: taskId,
      payload: {
        previousStatus: task.status,
        newStatus: targetStatus,
      },
    });

    return updated;
  }

  // --- DEPENDENCIES ---
  public static async addDependency(
    organizationId: string,
    taskId: string,
    dependsOnTaskId: string,
    dependencyType: DependencyType = 'blocks',
    metadata?: Record<string, unknown>,
    actorUserId?: string
  ): Promise<TaskDependency> {
    if (taskId === dependsOnTaskId) {
      throw new ValidationError('Task cannot depend on itself');
    }

    const task = await TaskRepository.findTaskById(organizationId, taskId);
    if (!task) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    const dependsOnTask = await TaskRepository.findTaskById(organizationId, dependsOnTaskId);
    if (!dependsOnTask) {
      throw new NotFoundError(`Target dependency task '${dependsOnTaskId}' not found in organization`);
    }

    // Check for circular dependency
    const allOrgDeps = await TaskRepository.findAllOrganizationDependencies(organizationId);
    const existingEdges = allOrgDeps.map((d) => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId }));

    if (detectDependencyCycle(existingEdges, taskId, dependsOnTaskId)) {
      throw new ValidationError(
        `Adding dependency from '${taskId}' to '${dependsOnTaskId}' would create a circular dependency chain`
      );
    }

    const dep = await TaskRepository.addDependency(
      organizationId,
      taskId,
      dependsOnTaskId,
      dependencyType,
      metadata
    );

    eventBus.publish({
      eventName: 'task.dependency_added',
      organizationId,
      actorId: actorUserId,
      entityType: 'task',
      entityId: taskId,
      payload: {
        dependsOnTaskId,
        dependencyType,
      },
    });

    return dep;
  }

  public static async removeDependency(
    organizationId: string,
    taskId: string,
    dependsOnTaskId: string,
    actorUserId?: string
  ): Promise<void> {
    const task = await TaskRepository.findTaskById(organizationId, taskId);
    if (!task) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    const removed = await TaskRepository.removeDependency(organizationId, taskId, dependsOnTaskId);
    if (!removed) {
      throw new NotFoundError(`Task dependency between '${taskId}' and '${dependsOnTaskId}' not found`);
    }

    eventBus.publish({
      eventName: 'task.dependency_removed',
      organizationId,
      actorId: actorUserId,
      entityType: 'task',
      entityId: taskId,
      payload: { dependsOnTaskId },
    });
  }

  public static async getTaskDependencies(
    organizationId: string,
    taskId: string
  ): Promise<{ dependencies: TaskDependency[]; dependents: TaskDependency[] }> {
    const task = await TaskRepository.findTaskById(organizationId, taskId);
    if (!task) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    const dependencies = await TaskRepository.findTaskDependencies(organizationId, taskId);
    const dependents = await TaskRepository.findTaskDependents(organizationId, taskId);

    return { dependencies, dependents };
  }
}
