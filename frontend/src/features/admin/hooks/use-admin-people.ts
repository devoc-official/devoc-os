'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { peopleApi, Person, Role } from '../../../api/people.api';
import { organizationApi } from '../../../api/organization.api';
import { adminApi } from '../../../api/admin.api';

export function useAdminPeople() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const queryClient = useQueryClient();

  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['admin', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: employments = [], isLoading: isEmploymentsLoading } = useQuery({
    queryKey: ['admin', 'employments', orgId],
    queryFn: () => peopleApi.listEmployments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['admin', 'roles', orgId],
    queryFn: () => peopleApi.listRoles(orgId),
    enabled: Boolean(orgId),
  });

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['admin', 'business-units', orgId],
    queryFn: () => organizationApi.listBusinessUnits(orgId),
    enabled: Boolean(orgId),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['admin', 'departments', orgId],
    queryFn: () => organizationApi.listDepartments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin', 'teams', orgId],
    queryFn: () => organizationApi.listTeams(orgId),
    enabled: Boolean(orgId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['admin', 'members', orgId],
    queryFn: () => adminApi.listMembers(orgId),
    enabled: Boolean(orgId),
  });

  // Maps for efficient lookups
  const employmentMap = new Map(employments.map((e) => [e.personId, e]));
  const buMap = new Map(businessUnits.map((b) => [b.id, b.name]));
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  const assignRoleMutation = useMutation({
    mutationFn: ({
      personId,
      roleId,
      businessUnitId,
      departmentId,
      teamId,
      startDate,
      endDate,
    }: {
      personId: string;
      roleId: string;
      businessUnitId?: string | null;
      departmentId?: string | null;
      teamId?: string | null;
      startDate?: string;
      endDate?: string;
    }) =>
      adminApi.assignPersonRole(orgId, personId, {
        roleId,
        businessUnitId,
        departmentId,
        teamId,
        startDate,
        endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'people', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const endRoleMutation = useMutation({
    mutationFn: ({ personId, personRoleId }: { personId: string; personRoleId: string }) =>
      adminApi.endPersonRole(orgId, personId, personRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'people', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const linkUserMutation = useMutation({
    mutationFn: ({ personId, userId }: { personId: string; userId: string }) =>
      adminApi.linkUserToPerson(orgId, personId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'people', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const unlinkUserMutation = useMutation({
    mutationFn: (personId: string) => adminApi.unlinkUserFromPerson(orgId, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'people', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  return {
    people,
    employments,
    employmentMap,
    roles,
    businessUnits,
    buMap,
    departments,
    deptMap,
    teams,
    teamMap,
    members,
    isLoading: isPeopleLoading || isEmploymentsLoading || isRolesLoading,
    assignRole: assignRoleMutation.mutateAsync,
    isAssigningRole: assignRoleMutation.isPending,
    endRole: endRoleMutation.mutateAsync,
    isEndingRole: endRoleMutation.isPending,
    linkUser: linkUserMutation.mutateAsync,
    isLinkingUser: linkUserMutation.isPending,
    unlinkUser: unlinkUserMutation.mutateAsync,
    isUnlinkingUser: unlinkUserMutation.isPending,
  };
}
