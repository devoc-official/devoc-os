import { apiClient } from './client';

export type ProjectStatus =
  | 'idea'
  | 'research'
  | 'planning'
  | 'development'
  | 'testing'
  | 'beta'
  | 'released'
  | 'maintenance'
  | 'archived';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'feature' | 'bug' | 'task' | 'milestone' | 'research';

export interface Project {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string | null;
  projectType: string;
  status: ProjectStatus;
  startedAt?: string | null;
  targetCompletionAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  taskKey?: string | null;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  startAt?: string | null;
  dueAt?: string | null;
  createdByPersonId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  listProjects: async (orgId: string): Promise<Project[]> => {
    return apiClient.get<Project[]>('/projects', { organizationId: orgId });
  },

  getProjectById: async (orgId: string, projectId: string): Promise<Project> => {
    return apiClient.get<Project>(`/projects/${projectId}`, { organizationId: orgId });
  },

  listTasks: async (
    orgId: string,
    params?: { projectId?: string; status?: TaskStatus; priority?: TaskPriority; createdByPersonId?: string }
  ): Promise<Task[]> => {
    return apiClient.get<Task[]>('/tasks', {
      organizationId: orgId,
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  getTaskById: async (orgId: string, taskId: string): Promise<Task> => {
    return apiClient.get<Task>(`/tasks/${taskId}`, { organizationId: orgId });
  },

  listProjectTasks: async (orgId: string, projectId: string): Promise<Task[]> => {
    return apiClient.get<Task[]>(`/projects/${projectId}/tasks`, { organizationId: orgId });
  },
};
