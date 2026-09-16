'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi, OrganizationSettings } from '../../../api/admin.api';

export function useAdminOrganization() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['admin', 'organization-profile', orgId],
    queryFn: () => adminApi.getOrganizationProfile(orgId),
    enabled: Boolean(orgId),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['admin', 'branches', orgId],
    queryFn: () => adminApi.listBranches(orgId),
    enabled: Boolean(orgId),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string }) => adminApi.updateOrganizationProfile(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organization-profile', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<OrganizationSettings>) => adminApi.updateSettings(orgId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organization-profile', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  return {
    organization: profile?.organization,
    settings: profile?.settings,
    branches,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}
