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

export interface TaskDependency {
  id: string;
  organizationId: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: string;
  createdAt: string;
}

export const projectsApi = {
  listProjects: async (orgId: string): Promise<Project[]> => {
    return apiClient.get<Project[]>('/projects', { organizationId: orgId });
  },

  getProjectById: async (orgId: string, projectId: string): Promise<Project> => {
    return apiClient.get<Project>(`/projects/${projectId}`, { organizationId: orgId });
  },

  createProject: async (orgId: string, payload: Partial<Project>): Promise<Project> => {
    return apiClient.post<Project>('/projects', payload, { organizationId: orgId });
  },

  updateProject: async (orgId: string, projectId: string, payload: Partial<Project>): Promise<Project> => {
    return apiClient.patch<Project>(`/projects/${projectId}`, payload, { organizationId: orgId });
  },

  transitionProjectStatus: async (orgId: string, projectId: string, status: ProjectStatus): Promise<Project> => {
    return apiClient.post<Project>(`/projects/${projectId}/status`, { status }, { organizationId: orgId });
  },

  getProjectOwners: async (orgId: string, projectId: string): Promise<any[]> => {
    return apiClient.get<any[]>(`/projects/${projectId}/owners`, { organizationId: orgId });
  },

  getProjectBusinessUnits: async (orgId: string, projectId: string): Promise<any[]> => {
    return apiClient.get<any[]>(`/projects/${projectId}/business-units`, { organizationId: orgId });
  },

  getProjectAssignments: async (orgId: string, projectId: string): Promise<any[]> => {
    return apiClient.get<any[]>(`/projects/${projectId}/assignments`, { organizationId: orgId });
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

  createTask: async (orgId: string, payload: Partial<Task>): Promise<Task> => {
    return apiClient.post<Task>('/tasks', payload, { organizationId: orgId });
  },

  updateTask: async (orgId: string, taskId: string, payload: Partial<Task>): Promise<Task> => {
    return apiClient.patch<Task>(`/tasks/${taskId}`, payload, { organizationId: orgId });
  },

  transitionTaskStatus: async (orgId: string, taskId: string, status: TaskStatus): Promise<Task> => {
    return apiClient.post<Task>(`/tasks/${taskId}/status`, { status }, { organizationId: orgId });
  },

  getTaskDependencies: async (orgId: string, taskId: string): Promise<TaskDependency[]> => {
    return apiClient.get<TaskDependency[]>(`/tasks/${taskId}/dependencies`, { organizationId: orgId });
  },

  addDependency: async (
    orgId: string,
    taskId: string,
    dependsOnTaskId: string,
    dependencyType = 'blocks'
  ): Promise<TaskDependency> => {
    return apiClient.post<TaskDependency>(
      `/tasks/${taskId}/dependencies`,
      { dependsOnTaskId, dependencyType },
      { organizationId: orgId }
    );
  },

  removeDependency: async (orgId: string, taskId: string, dependencyId: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/tasks/${taskId}/dependencies/${dependencyId}`, {
      organizationId: orgId,
    });
  },
};
