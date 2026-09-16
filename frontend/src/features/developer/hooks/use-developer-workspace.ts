'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Task, Project, TaskStatus } from '../../../api/projects.api';
import { workApi, WorkRecord, WorkCategory } from '../../../api/work.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';

export function useDeveloperWorkspace() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;
  const queryClient = useQueryClient();

  // 1. Projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['developer', 'workspace-projects', orgId],
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

  // 2. Assigned Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['developer', 'workspace-tasks', orgId],
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

  // 3. M3 Assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['developer', 'workspace-assignments', orgId, personId],
    queryFn: async () => {
      if (!orgId || !personId) return [];
      try {
        return await assignmentsApi.getPersonAssignments(orgId, personId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId && personId),
  });

  // 4. Work records
  const { data: workRecords = [], isLoading: isWorkLoading } = useQuery({
    queryKey: ['developer', 'workspace-work', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workApi.listWorkRecords(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 5. Work categories
  const { data: categories = [] } = useQuery({
    queryKey: ['developer', 'workspace-categories', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workApi.listCategories(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // Status transition mutation
  const transitionTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await projectsApi.transitionTaskStatus(orgId, taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'workspace-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['developer', 'tasks'] });
    },
  });

  const activeProjects = projects.filter((p) => p.status === 'development' || p.status === 'testing');
  const myTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');

  return {
    projects: activeProjects.length > 0 ? activeProjects : projects,
    tasks: myTasks,
    allTasks: tasks,
    assignments,
    workRecords,
    categories,
    isLoading: isProjectsLoading || isTasksLoading || isAssignmentsLoading || isWorkLoading,
    transitionTaskStatus: (taskId: string, status: TaskStatus) =>
      transitionTaskMutation.mutateAsync({ taskId, status }),
  };
}
