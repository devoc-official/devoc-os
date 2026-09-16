'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { workApi, WorkRecord, WorkCategory } from '../../../api/work.api';
import { projectsApi, Project } from '../../../api/projects.api';

export function usePMWork() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const queryClient = useQueryClient();

  const {
    data: workRecords = [],
    isLoading: isWorkLoading,
    refetch,
  } = useQuery({
    queryKey: ['pm', 'team-work-all', orgId],
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

  const { data: categories = [] } = useQuery({
    queryKey: ['pm', 'work-categories', orgId],
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

  const { data: projects = [] } = useQuery({
    queryKey: ['pm', 'work-projects', orgId],
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

  const approveMutation = useMutation({
    mutationFn: async (workId: string) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await workApi.approveWork(orgId, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'team-work-all'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ workId, reason }: { workId: string; reason?: string }) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await workApi.rejectWork(orgId, workId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'team-work-all'] });
    },
  });

  return {
    workRecords,
    categories,
    projects,
    isLoading: isWorkLoading,
    approveWork: (workId: string) => approveMutation.mutateAsync(workId),
    rejectWork: (workId: string, reason?: string) => rejectMutation.mutateAsync({ workId, reason }),
    refetch,
  };
}
