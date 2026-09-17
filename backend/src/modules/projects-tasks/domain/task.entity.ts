import { ValidationError } from '../../../shared/errors/index.js';

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'testing'
  | 'blocked'
  | 'changes_requested'
  | 'done'
  | 'cancelled';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskType = 'epic' | 'task' | 'subtask';

export type DependencyType = 'blocks';

export interface Task {
  id: string;
  organizationId: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  taskKey: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  startAt?: Date | null;
  dueAt?: Date | null;
  completedAt?: Date | null;
  createdByPersonId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDependency {
  id: string;
  organizationId: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: DependencyType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo'],
  todo: ['in_progress', 'cancelled'],
  in_progress: ['in_review', 'blocked', 'cancelled'],
  blocked: ['in_progress'],
  in_review: ['testing', 'changes_requested'],
  changes_requested: ['in_progress'],
  testing: ['done', 'changes_requested', 'blocked'],
  done: [], // terminal
  cancelled: [], // terminal
};

export function canTransitionTaskStatus(
  currentStatus: TaskStatus,
  targetStatus: TaskStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_TASK_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateTaskDates(startAt?: Date | null, dueAt?: Date | null): void {
  if (startAt && dueAt && dueAt.getTime() < startAt.getTime()) {
    throw new ValidationError('Task due date cannot be before start date');
  }
}

export function validateTaskTypeHierarchy(
  taskType: TaskType,
  parentTaskType?: TaskType | null
): void {
  if (taskType === 'epic' && parentTaskType) {
    throw new ValidationError('Epic task type cannot have a parent task');
  }
  if (taskType === 'subtask' && !parentTaskType) {
    throw new ValidationError('Subtask task type must have a parent task');
  }
  if (taskType === 'subtask' && parentTaskType === 'subtask') {
    throw new ValidationError('Subtask cannot have another subtask as parent');
  }
}

/**
 * Checks whether adding a dependency (taskId depends on dependsOnTaskId) causes a cycle.
 * Edges represent existing dependencies: [a, b] means a depends on b.
 * Adding (taskId depends on dependsOnTaskId) adds edge: taskId -> dependsOnTaskId.
 * A cycle occurs if there is already a path from dependsOnTaskId to taskId.
 */
export function detectDependencyCycle(
  existingDependencies: Array<{ taskId: string; dependsOnTaskId: string }>,
  newTaskId: string,
  newDependsOnTaskId: string
): boolean {
  if (newTaskId === newDependsOnTaskId) return true;

  // Build adjacency list where u -> v means u depends on v
  const adj = new Map<string, string[]>();
  for (const dep of existingDependencies) {
    if (!adj.has(dep.taskId)) adj.set(dep.taskId, []);
    adj.get(dep.taskId)!.push(dep.dependsOnTaskId);
  }

  // Check if newDependsOnTaskId can reach newTaskId
  const visited = new Set<string>();
  const queue = [newDependsOnTaskId];
  visited.add(newDependsOnTaskId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === newTaskId) {
      return true; // Cycle detected!
    }
    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}
