'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi, OrganizationSettings } from '../../../api/admin.api';

export function useAdminSettings() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['admin', 'settings', orgId],
    queryFn: () => adminApi.getSettings(orgId),
    enabled: Boolean(orgId),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['admin', 'branches', orgId],
    queryFn: () => adminApi.listBranches(orgId),
    enabled: Boolean(orgId),
  });

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['admin', 'business-units', orgId],
    queryFn: () => adminApi.listBusinessUnits(orgId),
    enabled: Boolean(orgId),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<OrganizationSettings>) =>
      adminApi.updateSettings(orgId, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'organization-profile', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  return {
    settings,
    branches,
    businessUnits,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
  };
}
