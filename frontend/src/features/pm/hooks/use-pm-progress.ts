'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Task, Project } from '../../../api/projects.api';
import { workApi, WorkRecord } from '../../../api/work.api';

export function usePMProgress() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;

  // 1. Projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['pm', 'progress-projects', orgId],
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

  // 2. Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['pm', 'progress-tasks', orgId],
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

  // 3. Work records
  const { data: workRecords = [], isLoading: isWorkLoading } = useQuery({
    queryKey: ['pm', 'progress-work', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workApi.listWorkRecords(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // Authoritative task status breakdown
  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    done: tasks.filter((t) => t.status === 'done').length,
    cancelled: tasks.filter((t) => t.status === 'cancelled').length,
  };

  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((tasksByStatus.done / totalTasks) * 100) : 0;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');

  // Overdue tasks
  const now = Date.now();
  const overdueTasks = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < now && t.status !== 'done' && t.status !== 'cancelled'
  );

  return {
    projects,
    tasks,
    workRecords,
    tasksByStatus,
    completionRate,
    blockedTasks,
    overdueTasks,
    totalTasks,
    isLoading: isProjectsLoading || isTasksLoading || isWorkLoading,
  };
}
