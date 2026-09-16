'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { peopleApi, Person, Role, Employment } from '../../../api/people.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { organizationApi } from '../../../api/organization.api';
import { workApi } from '../../../api/work.api';

export function useFounderPeople() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['founder', 'people-full', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['founder', 'roles', orgId],
    queryFn: () => peopleApi.listRoles(orgId),
    enabled: Boolean(orgId),
  });

  const { data: employments = [] } = useQuery({
    queryKey: ['founder', 'employments', orgId],
    queryFn: () => peopleApi.listEmployments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['founder', 'assignments', orgId],
    queryFn: () => assignmentsApi.listAssignments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['founder', 'bus', orgId],
    queryFn: () => organizationApi.listBusinessUnits(orgId),
    enabled: Boolean(orgId),
  });

  const { data: workRecords = [] } = useQuery({
    queryKey: ['founder', 'work', orgId],
    queryFn: () => workApi.listWorkRecords(orgId),
    enabled: Boolean(orgId),
  });

  const buMap = new Map(businessUnits.map((bu) => [bu.id, bu.name]));

  return {
    people,
    roles,
    employments,
    assignments,
    businessUnits,
    buMap,
    workRecords,
    isLoading: isPeopleLoading,
  };
}
