'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { organizationApi } from '../../../api/organization.api';
import { peopleApi } from '../../../api/people.api';
import { projectsApi } from '../../../api/projects.api';

export function useFounderOrganization() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ['founder', 'organization', orgId],
    queryFn: () => organizationApi.getOrganization(orgId),
    enabled: Boolean(orgId),
  });

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ['founder', 'branches', orgId],
    queryFn: () => organizationApi.listBranches(orgId),
    enabled: Boolean(orgId),
  });

  const { data: businessUnits = [], isLoading: isBUsLoading } = useQuery({
    queryKey: ['founder', 'business-units', orgId],
    queryFn: () => organizationApi.listBusinessUnits(orgId),
    enabled: Boolean(orgId),
  });

  const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
    queryKey: ['founder', 'departments', orgId],
    queryFn: () => organizationApi.listDepartments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: ['founder', 'teams', orgId],
    queryFn: () => organizationApi.listTeams(orgId),
    enabled: Boolean(orgId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['founder', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['founder', 'projects', orgId],
    queryFn: () => projectsApi.listProjects(orgId),
    enabled: Boolean(orgId),
  });

  const peopleMap = new Map(people.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));

  const isLoading =
    isOrgLoading ||
    isBranchesLoading ||
    isBUsLoading ||
    isDeptsLoading ||
    isTeamsLoading;

  return {
    organization,
    branches,
    businessUnits,
    departments,
    teams,
    people,
    peopleMap,
    projects,
    isLoading,
  };
}
