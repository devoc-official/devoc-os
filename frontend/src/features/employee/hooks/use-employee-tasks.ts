'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Task, Project, TaskStatus, TaskDependency } from '../../../api/projects.api';

export function useEmployeeTasks() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;
  const queryClient = useQueryClient();

  // 1. Tasks
  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    refetch,
  } = useQuery({
    queryKey: ['employee', 'tasks-list', orgId, personId],
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

  // 2. Projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['employee', 'tasks-projects', orgId],
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

  // 3. Status Transition
  const transitionStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      if (!orgId) throw new Error('Missing organization context');
      return await projectsApi.transitionTaskStatus(orgId, taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'tasks'] });
    },
  });

  // 4. Load dependencies for a specific task
  const loadDependencies = async (taskId: string): Promise<TaskDependency[]> => {
    if (!orgId) return [];
    try {
      return await projectsApi.getTaskDependencies(orgId, taskId);
    } catch {
      return [];
    }
  };

  return {
    tasks,
    projects,
    isLoading: isTasksLoading || isProjectsLoading,
    transitionStatus: (taskId: string, status: TaskStatus) =>
      transitionStatusMutation.mutateAsync({ taskId, status }),
    loadDependencies,
    refetch,
  };
}
