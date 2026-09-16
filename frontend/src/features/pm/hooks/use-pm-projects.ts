'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Project, ProjectStatus, Task } from '../../../api/projects.api';

export interface ProjectWithStats extends Project {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  progressPercent: number;
}

export function usePMProjects() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const queryClient = useQueryClient();

  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['pm', 'projects-list', orgId],
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

  const { data: allTasks = [] } = useQuery({
    queryKey: ['pm', 'projects-all-tasks', orgId],
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

  const projectsWithStats: ProjectWithStats[] = projects.map((p) => {
    const pTasks = allTasks.filter((t) => t.projectId === p.id);
    const completed = pTasks.filter((t) => t.status === 'done').length;
    const blocked = pTasks.filter((t) => t.status === 'blocked').length;
    const progress = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;

    return {
      ...p,
      totalTasks: pTasks.length,
      completedTasks: completed,
      blockedTasks: blocked,
      progressPercent: progress,
    };
  });

  const transitionStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await projectsApi.transitionProjectStatus(orgId, projectId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['pm', 'projects'] });
    },
  });

  return {
    projects: projectsWithStats,
    isLoading: isProjectsLoading,
    transitionStatus: (projectId: string, status: ProjectStatus) =>
      transitionStatusMutation.mutateAsync({ projectId, status }),
    refetch: refetchProjects,
  };
}
