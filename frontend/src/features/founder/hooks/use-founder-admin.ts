'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi, OrganizationSettings, OrganizationMember, FeatureConfiguration, AdminAuditLog } from '../../../api/admin.api';

export function useFounderAdmin() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['founder', 'admin-settings', orgId],
    queryFn: () => adminApi.getSettings(orgId),
    enabled: Boolean(orgId),
  });

  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['founder', 'admin-members', orgId],
    queryFn: () => adminApi.listMembers(orgId),
    enabled: Boolean(orgId),
  });

  const { data: features = [], isLoading: isFeaturesLoading } = useQuery({
    queryKey: ['founder', 'admin-features', orgId],
    queryFn: () => adminApi.listFeatures(orgId),
    enabled: Boolean(orgId),
  });

  const { data: auditLogs = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ['founder', 'admin-audit', orgId],
    queryFn: () => adminApi.listAuditLogs(orgId, { limit: 50 }),
    enabled: Boolean(orgId),
  });

  return {
    settings,
    members,
    features,
    auditLogs,
    isLoading: isSettingsLoading || isMembersLoading || isFeaturesLoading || isAuditLoading,
  };
}
