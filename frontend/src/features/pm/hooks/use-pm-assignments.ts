'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { peopleApi, Person } from '../../../api/people.api';
import { projectsApi, Project } from '../../../api/projects.api';

export function usePMAssignments() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const queryClient = useQueryClient();

  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
    refetch,
  } = useQuery({
    queryKey: ['pm', 'assignments-all', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await assignmentsApi.listAssignments(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['pm', 'assignments-people', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await peopleApi.listPeople(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['pm', 'assignments-projects-ref', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await projectsApi.listProjects(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: {
      personId: string;
      targetId: string;
      targetType: string;
      roleContext: string;
      capacityValue: number;
      capacityUnit: string;
    }) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await assignmentsApi.createAssignment(orgId, {
        personId: payload.personId,
        targetType: payload.targetType,
        targetId: payload.targetId,
        assignmentType: 'project_role',
        roleContext: payload.roleContext,
        capacityType: 'allocation',
        capacityValue: payload.capacityValue,
        capacityUnit: payload.capacityUnit,
        authorityType: 'pm',
        status: 'active',
        startAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'assignments-all'] });
    },
  });

  return {
    assignments,
    people,
    projects,
    isLoading: isAssignmentsLoading,
    createAssignment: createAssignmentMutation.mutateAsync,
    refetch,
  };
}
