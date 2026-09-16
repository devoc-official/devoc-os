'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi, OrganizationMember } from '../../../api/admin.api';
import { peopleApi } from '../../../api/people.api';

export function useAdminUsers() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const queryClient = useQueryClient();

  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['admin', 'members', orgId],
    queryFn: () => adminApi.listMembers(orgId),
    enabled: Boolean(orgId),
  });

  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['admin', 'people-for-users', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: (data: { email: string; role?: 'org_admin' | 'org_member' }) =>
      adminApi.inviteMember(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'org_admin' | 'org_member' }) =>
      adminApi.updateMemberRole(orgId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) =>
      adminApi.updateMemberStatus(orgId, userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const linkUserMutation = useMutation({
    mutationFn: ({ personId, userId }: { personId: string; userId: string }) =>
      adminApi.linkUserToPerson(orgId, personId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'people', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'people-for-users', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const unlinkUserMutation = useMutation({
    mutationFn: (personId: string) => adminApi.unlinkUserFromPerson(orgId, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'people', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'people-for-users', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  return {
    members,
    people,
    isLoading: isMembersLoading || isPeopleLoading,
    inviteMember: inviteMemberMutation.mutateAsync,
    isInviting: inviteMemberMutation.isPending,
    updateMemberRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    updateMemberStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    linkUser: linkUserMutation.mutateAsync,
    isLinkingUser: linkUserMutation.isPending,
    unlinkUser: unlinkUserMutation.mutateAsync,
    isUnlinkingUser: unlinkUserMutation.isPending,
  };
}
