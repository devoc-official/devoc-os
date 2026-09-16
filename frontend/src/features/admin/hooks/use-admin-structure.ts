'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi } from '../../../api/admin.api';
import { peopleApi } from '../../../api/people.api';

export function useAdminStructure() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const queryClient = useQueryClient();

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

  const { data: people = [] } = useQuery({
    queryKey: ['admin', 'people-for-structure', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const peopleMap = new Map(people.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const buMap = new Map(businessUnits.map((b) => [b.id, b.name]));
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  // Branch Mutations
  const createBranchMutation = useMutation({
    mutationFn: (data: { name: string; code: string; status?: 'active' | 'inactive'; location?: string }) =>
      adminApi.createBranch(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'branches', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; status?: 'active' | 'inactive'; location?: string } }) =>
      adminApi.updateBranch(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'branches', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  // Business Unit Mutations
  const createBuMutation = useMutation({
    mutationFn: (data: { name: string; code: string; headPersonId?: string | null; status?: 'active' | 'inactive' }) =>
      adminApi.createBusinessUnit(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'business-units', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateBuMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; headPersonId?: string | null; status?: 'active' | 'inactive' } }) =>
      adminApi.updateBusinessUnit(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'business-units', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  // Department Mutations
  const createDeptMutation = useMutation({
    mutationFn: (data: { name: string; code: string; businessUnitId?: string | null; status?: 'active' | 'inactive' }) =>
      adminApi.createDepartment(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; businessUnitId?: string | null; status?: 'active' | 'inactive' } }) =>
      adminApi.updateDepartment(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  // Team Mutations
  const createTeamMutation = useMutation({
    mutationFn: (data: {
      name: string;
      code: string;
      departmentId?: string | null;
      businessUnitId?: string | null;
      status?: 'active' | 'inactive';
      isTemporary?: boolean;
    }) => adminApi.createTeam(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; departmentId?: string | null; businessUnitId?: string | null; status?: 'active' | 'inactive' };
    }) => adminApi.updateTeam(orgId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs-recent', orgId] });
    },
  });

  const isLoading = isBranchesLoading || isBuLoading || isDeptsLoading || isTeamsLoading;

  return {
    branches,
    businessUnits,
    departments,
    teams,
    people,
    peopleMap,
    buMap,
    deptMap,
    isLoading,
    createBranch: createBranchMutation.mutateAsync,
    updateBranch: updateBranchMutation.mutateAsync,
    createBusinessUnit: createBuMutation.mutateAsync,
    updateBusinessUnit: updateBuMutation.mutateAsync,
    createDepartment: createDeptMutation.mutateAsync,
    updateDepartment: updateDeptMutation.mutateAsync,
    createTeam: createTeamMutation.mutateAsync,
    updateTeam: updateTeamMutation.mutateAsync,
  };
}
