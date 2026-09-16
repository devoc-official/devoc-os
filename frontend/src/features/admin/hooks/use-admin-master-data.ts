'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi, WorkCategoryItem, MeetingTypeItem, EvaluationTemplateItem, FinanceCategoryItem, SkillItem } from '../../../api/admin.api';

export function useAdminMasterData() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const queryClient = useQueryClient();

  // Queries
  const { data: workCategories = [], isLoading: isWcLoading } = useQuery({
    queryKey: ['admin', 'master-data', 'work-categories', orgId],
    queryFn: () => adminApi.listWorkCategories(orgId, true),
    enabled: Boolean(orgId),
  });

  const { data: meetingTypes = [], isLoading: isMtLoading } = useQuery({
    queryKey: ['admin', 'master-data', 'meeting-types', orgId],
    queryFn: () => adminApi.listMeetingTypes(orgId, true),
    enabled: Boolean(orgId),
  });

  const { data: evaluationTemplates = [], isLoading: isEtLoading } = useQuery({
    queryKey: ['admin', 'master-data', 'evaluation-templates', orgId],
    queryFn: () => adminApi.listEvaluationTemplates(orgId),
    enabled: Boolean(orgId),
  });

  const { data: financeCategories = [], isLoading: isFcLoading } = useQuery({
    queryKey: ['admin', 'master-data', 'finance-categories', orgId],
    queryFn: () => adminApi.listFinanceCategories(orgId, true),
    enabled: Boolean(orgId),
  });

  const { data: skills = [], isLoading: isSkillsLoading } = useQuery({
    queryKey: ['admin', 'master-data', 'skills', orgId],
    queryFn: () => adminApi.listSkills(orgId),
    enabled: Boolean(orgId),
  });

  // Work Categories Mutations
  const createWorkCategoryMutation = useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      adminApi.createWorkCategory(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'work-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateWorkCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; active?: boolean } }) =>
      adminApi.updateWorkCategory(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'work-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const retireWorkCategoryMutation = useMutation({
    mutationFn: (id: string) => adminApi.retireWorkCategory(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'work-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  // Meeting Types Mutations
  const createMeetingTypeMutation = useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      adminApi.createMeetingType(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'meeting-types', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateMeetingTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; active?: boolean } }) =>
      adminApi.updateMeetingType(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'meeting-types', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const retireMeetingTypeMutation = useMutation({
    mutationFn: (id: string) => adminApi.retireMeetingType(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'meeting-types', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  // Evaluation Templates Mutations
  const createEvaluationTemplateMutation = useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      adminApi.createEvaluationTemplate(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'evaluation-templates', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateEvaluationTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      adminApi.updateEvaluationTemplate(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'evaluation-templates', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  // Finance Categories Mutations
  const createFinanceCategoryMutation = useMutation({
    mutationFn: (data: { name: string; code: string; type?: string }) =>
      adminApi.createFinanceCategory(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'finance-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateFinanceCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; type?: string; active?: boolean } }) =>
      adminApi.updateFinanceCategory(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'finance-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const retireFinanceCategoryMutation = useMutation({
    mutationFn: (id: string) => adminApi.retireFinanceCategory(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'finance-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  // Skills Mutations
  const createSkillMutation = useMutation({
    mutationFn: (data: { name: string; category?: string; description?: string }) =>
      adminApi.createSkill(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'skills', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; category?: string; description?: string } }) =>
      adminApi.updateSkill(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'master-data', 'skills', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const isLoading = isWcLoading || isMtLoading || isEtLoading || isFcLoading || isSkillsLoading;

  return {
    workCategories,
    meetingTypes,
    evaluationTemplates,
    financeCategories,
    skills,
    isLoading,
    createWorkCategory: createWorkCategoryMutation.mutateAsync,
    updateWorkCategory: updateWorkCategoryMutation.mutateAsync,
    retireWorkCategory: retireWorkCategoryMutation.mutateAsync,
    createMeetingType: createMeetingTypeMutation.mutateAsync,
    updateMeetingType: updateMeetingTypeMutation.mutateAsync,
    retireMeetingType: retireMeetingTypeMutation.mutateAsync,
    createEvaluationTemplate: createEvaluationTemplateMutation.mutateAsync,
    updateEvaluationTemplate: updateEvaluationTemplateMutation.mutateAsync,
    createFinanceCategory: createFinanceCategoryMutation.mutateAsync,
    updateFinanceCategory: updateFinanceCategoryMutation.mutateAsync,
    retireFinanceCategory: retireFinanceCategoryMutation.mutateAsync,
    createSkill: createSkillMutation.mutateAsync,
    updateSkill: updateSkillMutation.mutateAsync,
  };
}
