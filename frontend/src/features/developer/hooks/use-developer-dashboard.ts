'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Task, Project } from '../../../api/projects.api';
import { workApi, WorkRecord, WorkEvidence } from '../../../api/work.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';

export function useDeveloperDashboard() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;

  // 1. Projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['developer', 'projects', orgId],
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

  // 2. Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['developer', 'tasks', orgId],
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

  // 3. Work Records
  const { data: workRecords = [], isLoading: isWorkLoading } = useQuery({
    queryKey: ['developer', 'work', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workApi.listWorkRecords(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 4. M3 Assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['developer', 'assignments', orgId, personId],
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

  // Collect evidence from work records
  const evidenceList: { evidence: WorkEvidence; workTitle: string }[] = [];
  workRecords.forEach((w) => {
    const metaEv = (w.metadata as any)?.evidence;
    if (metaEv && Array.isArray(metaEv)) {
      metaEv.forEach((e: any) => {
        evidenceList.push({
          evidence: {
            id: e.id || `${w.id}-ev`,
            workId: w.id,
            title: e.title || 'Evidence Link',
            evidenceUrl: e.url,
            createdAt: w.createdAt,
          },
          workTitle: w.title,
        });
      });
    }
  });

  const activeSprintTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'review');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const totalMinutesLogged = workRecords.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);

  return {
    projects,
    tasks,
    activeSprintTasks,
    blockedTasks,
    workRecords,
    assignments,
    evidenceList,
    totalHoursLogged: (totalMinutesLogged / 60).toFixed(1),
    isLoading: isProjectsLoading || isTasksLoading || isWorkLoading || isAssignmentsLoading,
  };
}
