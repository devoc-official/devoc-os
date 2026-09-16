'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { workApi, WorkRecord, WorkCategory } from '../../../api/work.api';
import { projectsApi, Project } from '../../../api/projects.api';

export function useEmployeeWork() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;
  const queryClient = useQueryClient();

  // 1. Work records
  const {
    data: workRecords = [],
    isLoading: isRecordsLoading,
    refetch,
  } = useQuery({
    queryKey: ['employee', 'work-records', orgId, personId],
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

  // 2. Categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['employee', 'work-categories', orgId],
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

  // 3. Projects for target selection
  const { data: projects = [] } = useQuery({
    queryKey: ['employee', 'work-projects', orgId],
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

  // 4. Create work record
  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      categoryId: string;
      durationMinutes: number;
      description?: string;
      targetType?: string;
      targetId?: string;
      evidenceTitle?: string;
      evidenceUrl?: string;
      autoSubmit?: boolean;
    }) => {
      if (!orgId || !personId) throw new Error('Missing tenant or identity context');

      const record = await workApi.createWorkRecord(orgId, {
        personId,
        categoryId: payload.categoryId,
        title: payload.title,
        description: payload.description,
        durationMinutes: payload.durationMinutes,
        targetType: payload.targetType,
        targetId: payload.targetId,
      });

      // Attach evidence if provided
      if (payload.evidenceTitle || payload.evidenceUrl) {
        await workApi.addEvidence(orgId, record.id, {
          title: payload.evidenceTitle || 'Deliverable Link',
          evidenceUrl: payload.evidenceUrl,
        }).catch(() => {});
      }

      // Auto-submit if requested
      if (payload.autoSubmit) {
        return await workApi.submitWork(orgId, record.id);
      }

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'work-records'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'work'] });
    },
  });

  // 5. Submit work record
  const submitMutation = useMutation({
    mutationFn: async (workId: string) => {
      if (!orgId) throw new Error('Missing organization context');
      return await workApi.submitWork(orgId, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'work-records'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'work'] });
    },
  });

  return {
    workRecords,
    categories,
    projects,
    isLoading: isRecordsLoading || isCategoriesLoading,
    createWork: createMutation.mutateAsync,
    submitWork: submitMutation.mutateAsync,
    refetch,
  };
}
