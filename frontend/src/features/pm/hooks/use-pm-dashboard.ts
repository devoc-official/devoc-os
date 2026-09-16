'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Project, Task } from '../../../api/projects.api';
import { workApi, WorkRecord } from '../../../api/work.api';
import { meetingsApi, Meeting } from '../../../api/meetings.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';

export function usePMDashboard() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;

  // 1. Managed Projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['pm', 'projects', orgId],
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

  // 2. All Tasks across managed projects
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['pm', 'all-tasks', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await projectsApi.listTasks(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 3. Team Work records needing review
  const { data: workRecords = [], isLoading: isWorkLoading } = useQuery({
    queryKey: ['pm', 'work-records', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workApi.listWorkRecords(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 4. Meetings
  const { data: meetings = [], isLoading: isMeetingsLoading } = useQuery({
    queryKey: ['pm', 'meetings', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await meetingsApi.listMeetings(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 5. Assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['pm', 'assignments', orgId],
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

  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const inReviewTasks = tasks.filter((t) => t.status === 'review');
  const pendingApprovals = workRecords.filter((w) => w.status === 'submitted');
  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled');

  return {
    projects,
    tasks,
    blockedTasks,
    inReviewTasks,
    pendingApprovals,
    upcomingMeetings,
    assignments,
    isLoading: isProjectsLoading || isTasksLoading || isWorkLoading || isMeetingsLoading || isAssignmentsLoading,
  };
}
