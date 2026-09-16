'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Project } from '../../../api/projects.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';

export function useEmployeeProjects() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;

  // 1. Projects
  const {
    data: allProjects = [],
    isLoading: isProjectsLoading,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['employee', 'projects-full', orgId],
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

  // 2. Assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['employee', 'assignments-projects', orgId, personId],
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

  // Filter projects where employee is assigned or all accessible projects
  const assignedProjectIds = new Set(
    assignments.filter((a) => a.targetType === 'project').map((a) => a.targetId)
  );

  const myProjects = allProjects.filter((p) => assignedProjectIds.has(p.id) || allProjects.length <= 5);

  return {
    projects: myProjects.length > 0 ? myProjects : allProjects,
    allProjects,
    assignments,
    isLoading: isProjectsLoading || isAssignmentsLoading,
    refetch: refetchProjects,
  };
}
