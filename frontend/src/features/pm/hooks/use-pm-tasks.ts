'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Task, Project, TaskStatus, TaskPriority, TaskDependency } from '../../../api/projects.api';

export function usePMTasks() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['pm', 'tasks-management', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await projectsApi.listTasks(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['pm', 'tasks-projects-ref', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await projectsApi.listProjects(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (payload: {
      projectId: string;
      title: string;
      taskType: any;
      priority: TaskPriority;
      description?: string;
      dueAt?: string;
    }) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await projectsApi.createTask(orgId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'tasks-management'] });
    },
  });

  const transitionStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await projectsApi.transitionTaskStatus(orgId, taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'tasks-management'] });
    },
  });

  const getDependencies = async (taskId: string): Promise<TaskDependency[]> => {
    if (!orgId) return [];
    try {
      return await projectsApi.getTaskDependencies(orgId, taskId);
    } catch {
      return [];
    }
  };

  const addDependency = async (taskId: string, dependsOnTaskId: string) => {
    if (!orgId) return;
    await projectsApi.addDependency(orgId, taskId, dependsOnTaskId);
    queryClient.invalidateQueries({ queryKey: ['pm', 'tasks-management'] });
  };

  const removeDependency = async (taskId: string, dependencyId: string) => {
    if (!orgId) return;
    await projectsApi.removeDependency(orgId, taskId, dependencyId);
    queryClient.invalidateQueries({ queryKey: ['pm', 'tasks-management'] });
  };

  return {
    tasks,
    projects,
    isLoading: isTasksLoading || isProjectsLoading,
    createTask: createTaskMutation.mutateAsync,
    transitionStatus: (taskId: string, status: TaskStatus) =>
      transitionStatusMutation.mutateAsync({ taskId, status }),
    getDependencies,
    addDependency,
    removeDependency,
    refetch: refetchTasks,
  };
}
