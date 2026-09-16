'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi } from '../../../api/admin.api';
import { peopleApi } from '../../../api/people.api';
import { organizationApi } from '../../../api/organization.api';

export function useAdminDashboard() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  // 1. Organization Profile & Settings
  const { data: orgProfile, isLoading: isOrgLoading } = useQuery({
    queryKey: ['admin', 'organization-profile', orgId],
    queryFn: () => adminApi.getOrganizationProfile(orgId),
    enabled: Boolean(orgId),
  });

  // 2. Members & Access
  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['admin', 'members', orgId],
    queryFn: () => adminApi.listMembers(orgId),
    enabled: Boolean(orgId),
  });

  // 3. Structure
  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ['admin', 'branches', orgId],
    queryFn: () => adminApi.listBranches(orgId),
    enabled: Boolean(orgId),
  });

  const { data: businessUnits = [], isLoading: isBuLoading } = useQuery({
    queryKey: ['admin', 'business-units', orgId],
    queryFn: () => adminApi.listBusinessUnits(orgId),
    enabled: Boolean(orgId),
  });

  const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
    queryKey: ['admin', 'departments', orgId],
    queryFn: () => adminApi.listDepartments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: ['admin', 'teams', orgId],
    queryFn: () => adminApi.listTeams(orgId),
    enabled: Boolean(orgId),
  });

  // 4. People & Roles
  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['admin', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['admin', 'roles', orgId],
    queryFn: () => peopleApi.listRoles(orgId),
    enabled: Boolean(orgId),
  });

  // 5. Feature Configurations
  const { data: features = [], isLoading: isFeaturesLoading } = useQuery({
    queryKey: ['admin', 'features', orgId],
    queryFn: () => adminApi.listFeatures(orgId),
    enabled: Boolean(orgId),
  });

  // 6. Recent Audit Logs
  const { data: recentAuditLogs = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ['admin', 'audit-logs-recent', orgId],
    queryFn: () => adminApi.listAuditLogs(orgId, { limit: 10 }),
    enabled: Boolean(orgId),
  });

  // Derived Access Stats
  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingOrInvitedMembers = members.filter((m) => m.status === 'invited');
  const suspendedMembers = members.filter((m) => m.status === 'suspended');
  const orgAdmins = members.filter((m) => m.role === 'org_admin');
  const unlinkedMembers = members.filter((m) => !m.linkedPerson);

  // Derived Structure Stats
  const activeBusinessUnits = businessUnits.filter((b) => b.status === 'active');
  const busWithoutHead = businessUnits.filter((b) => !b.headPersonId);

  // Derived Features
  const enabledFeatures = features.filter((f) => f.isEnabled);

  // Real Administrative Attention Items (Zero synthetic metrics)
  const attentionItems: Array<{
    id: string;
    category: 'access' | 'structure' | 'configuration' | 'security';
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    actionHref: string;
    actionLabel: string;
  }> = [];

  if (unlinkedMembers.length > 0) {
    attentionItems.push({
      id: 'att-unlinked-users',
      category: 'access',
      title: `${unlinkedMembers.length} Unlinked User Identity Account${unlinkedMembers.length > 1 ? 's' : ''}`,
      description: 'Active login accounts exist without an associated operational Person profile.',
      severity: 'warning',
      actionHref: '/admin/users',
      actionLabel: 'Link Person',
    });
  }

  if (suspendedMembers.length > 0) {
    attentionItems.push({
      id: 'att-suspended-users',
      category: 'security',
      title: `${suspendedMembers.length} Suspended Organization Member${suspendedMembers.length > 1 ? 's' : ''}`,
      description: 'Users with suspended status remain in tenant directory.',
      severity: 'info',
      actionHref: '/admin/users',
      actionLabel: 'Review Access',
    });
  }

  if (busWithoutHead.length > 0) {
    attentionItems.push({
      id: 'att-bus-no-head',
      category: 'structure',
      title: `${busWithoutHead.length} Business Unit${busWithoutHead.length > 1 ? 's' : ''} Missing Designated Head`,
      description: 'Operational business unit lacks an assigned head person.',
      severity: 'warning',
      actionHref: '/admin/structure',
      actionLabel: 'Assign Head',
    });
  }

  if (!orgProfile?.settings?.timezone || !orgProfile?.settings?.currency) {
    attentionItems.push({
      id: 'att-missing-settings',
      category: 'configuration',
      title: 'Operational Defaults Unset',
      description: 'Default timezone or reporting currency not yet configured for this organization.',
      severity: 'warning',
      actionHref: '/admin/settings',
      actionLabel: 'Configure Defaults',
    });
  }

  const isLoading =
    isOrgLoading ||
    isMembersLoading ||
    isBranchesLoading ||
    isBuLoading ||
    isDeptsLoading ||
    isTeamsLoading ||
    isPeopleLoading ||
    isRolesLoading ||
    isFeaturesLoading ||
    isAuditLoading;

  return {
    organization: orgProfile?.organization,
    settings: orgProfile?.settings,
    members,
    activeMembers,
    pendingOrInvitedMembers,
    suspendedMembers,
    orgAdmins,
    unlinkedMembers,
    branches,
    businessUnits,
    activeBusinessUnits,
    departments,
    teams,
    people,
    roles,
    features,
    enabledFeatures,
    recentAuditLogs,
    attentionItems,
    isLoading,
  };
}
