'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { peopleApi } from '../../../api/people.api';
import { adminApi } from '../../../api/admin.api';

export interface CapabilityDefinition {
  code: string;
  name: string;
  description: string;
  scope: 'organization' | 'business_unit' | 'project' | 'team';
  module: string;
}

export const DEVOC_CAPABILITIES: CapabilityDefinition[] = [
  { code: 'platform:admin', name: 'Platform Administrator', description: 'System-wide platform root configuration', scope: 'organization', module: 'admin' },
  { code: 'organization:admin', name: 'Organization Administrator', description: 'Tenant settings, branches, and memberships', scope: 'organization', module: 'admin' },
  { code: 'structure:manage', name: 'Structure Manager', description: 'Create and update Business Units, Departments, Teams', scope: 'organization', module: 'organization' },
  { code: 'membership:manage', name: 'Membership Manager', description: 'Invite users, update member roles and statuses', scope: 'organization', module: 'admin' },
  { code: 'people:admin', name: 'People Administrator', description: 'Manage Person identities, employments, and role assignments', scope: 'organization', module: 'people' },
  { code: 'roles:manage', name: 'Role Governance', description: 'Inspect and configure organizational roles and capabilities', scope: 'organization', module: 'people' },
  { code: 'masterdata:manage', name: 'Master Data Manager', description: 'Administer work categories, meeting types, evaluation templates', scope: 'organization', module: 'admin' },
  { code: 'features:manage', name: 'Feature Configurator', description: 'Enable/disable feature flags and configuration payloads', scope: 'organization', module: 'admin' },
  { code: 'audit:view', name: 'Audit Inspector', description: 'Read-only inspection of tenant audit event history', scope: 'organization', module: 'audit' },
  { code: 'finance:admin', name: 'Finance Administrator', description: 'Treasury transactions, budgets, obligations', scope: 'organization', module: 'finance' },
  { code: 'learning:manage', name: 'Academy Operations', description: 'Curriculum milestones, mentor assignments, and cohorts', scope: 'business_unit', module: 'learning' },
  { code: 'project:manage', name: 'Project Delivery', description: 'Project milestones, task backlogs, team allocations', scope: 'project', module: 'projects' },
];

export function useAdminRoles() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['admin', 'roles', orgId],
    queryFn: () => peopleApi.listRoles(orgId),
    enabled: Boolean(orgId),
  });

  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['admin', 'members', orgId],
    queryFn: () => adminApi.listMembers(orgId),
    enabled: Boolean(orgId),
  });

  return {
    roles,
    capabilities: DEVOC_CAPABILITIES,
    members,
    isLoading: isRolesLoading || isMembersLoading,
  };
}
