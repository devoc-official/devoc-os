'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi, FeatureConfiguration } from '../../../api/admin.api';

export function useAdminFeatures() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const queryClient = useQueryClient();

  const { data: features = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'features', orgId],
    queryFn: () => adminApi.listFeatures(orgId),
    enabled: Boolean(orgId),
  });

  const setOverrideMutation = useMutation({
    mutationFn: ({
      featureKey,
      isEnabled,
      config,
      description,
    }: {
      featureKey: string;
      isEnabled: boolean;
      config?: Record<string, any>;
      description?: string;
    }) => adminApi.setFeatureOverride(orgId, featureKey, isEnabled, config, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'features', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (featureKey: string) => adminApi.deleteFeatureOverride(orgId, featureKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'features', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  return {
    features,
    isLoading,
    error,
    setFeatureOverride: setOverrideMutation.mutateAsync,
    isSettingOverride: setOverrideMutation.isPending,
    deleteFeatureOverride: deleteOverrideMutation.mutateAsync,
    isDeletingOverride: deleteOverrideMutation.isPending,
  };
}
