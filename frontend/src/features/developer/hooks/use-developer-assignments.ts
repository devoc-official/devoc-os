'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { projectsApi, Project } from '../../../api/projects.api';

export function useDeveloperAssignments() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;

  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
    refetch,
  } = useQuery({
    queryKey: ['developer', 'assignments-ledger', orgId, personId],
    queryFn: async () => {
      if (!orgId || !personId) return [];
      try {
        return await assignmentsApi.getPersonAssignments(orgId, personId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId && personId),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['developer', 'assignment-projects', orgId],
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

  return {
    assignments,
    projects,
    isLoading: isAssignmentsLoading,
    refetch,
  };
}
