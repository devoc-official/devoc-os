'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { assignmentsApi } from '../../../api/assignments.api';
import { projectsApi, Project, Task } from '../../../api/projects.api';
import { workApi, WorkRecord } from '../../../api/work.api';

export interface StudentProjectWithDetails extends Project {
  roleContext?: string | null;
  tasks: Task[];
  workRecords: WorkRecord[];
}

export function useStudentProjects() {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;

  // 1. Fetch project assignments for this student
  const {
    data: projectAssignments = [],
    isLoading: isAssignmentsLoading,
  } = useQuery({
    queryKey: ['student', 'project-assignments', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return [];
      return assignmentsApi.listAssignments(orgId, {
        personId: user.id,
        targetType: 'project',
      });
    },
    enabled: Boolean(orgId && user?.id),
  });

  // 2. Fetch projects and their tasks
  const {
    data: studentProjects = [],
    isLoading: isProjectsLoading,
    isError: isProjectsError,
  } = useQuery({
    queryKey: ['student', 'projects', orgId, projectAssignments],
    queryFn: async () => {
      if (!orgId || !projectAssignments.length) return [];
      const detailed = await Promise.all(
        projectAssignments.map(async (assignment) => {
          try {
            const project = await projectsApi.getProjectById(orgId, assignment.targetId);
            const tasks = await projectsApi.listProjectTasks(orgId, project.id).catch(() => [] as Task[]);
            const workRecords = await workApi.listWorkRecords(orgId, {
              personId: user!.id,
              targetType: 'project',
              targetId: project.id,
            }).catch(() => [] as WorkRecord[]);

            return {
              ...project,
              roleContext: assignment.roleContext,
              tasks,
              workRecords,
            } as StudentProjectWithDetails;
          } catch {
            return null;
          }
        })
      );
      return detailed.filter((p): p is StudentProjectWithDetails => p !== null);
    },
    enabled: Boolean(orgId && projectAssignments.length > 0),
  });

  return {
    projects: studentProjects,
    isLoading: isAssignmentsLoading || isProjectsLoading,
    isError: isProjectsError,
  };
}
