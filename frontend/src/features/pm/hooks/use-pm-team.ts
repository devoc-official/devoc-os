'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { peopleApi, Person } from '../../../api/people.api';
import { projectsApi, Project, Task } from '../../../api/projects.api';

export interface TeamMemberResponsibility {
  person: Person;
  assignments: Assignment[];
  assignedProjects: Project[];
  activeTasks: Task[];
  totalCapacityHours: number;
}

export function usePMTeam() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;

  // 1. People
  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['pm', 'team-people', orgId],
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

  // 2. M3 Assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['pm', 'team-assignments', orgId],
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

  // 3. Projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['pm', 'team-projects', orgId],
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

  // 4. Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['pm', 'team-tasks', orgId],
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

  const projectMap = new Map<string, Project>();
  projects.forEach((p) => projectMap.set(p.id, p));

  // Build unified team member view
  const teamMembers: TeamMemberResponsibility[] = people.map((p) => {
    const personAssignments = assignments.filter((a) => a.personId === p.id);
    const assignedProjectIds = new Set(
      personAssignments.filter((a) => a.targetType === 'project').map((a) => a.targetId)
    );
    const assignedProjects = projects.filter((proj) => assignedProjectIds.has(proj.id));
    const personTasks = tasks.filter((t) => t.createdByPersonId === p.id);
    const totalCapacity = personAssignments.reduce((acc, a) => acc + (a.capacityValue || 0), 0);

    return {
      person: p,
      assignments: personAssignments,
      assignedProjects,
      activeTasks: personTasks,
      totalCapacityHours: totalCapacity,
    };
  });

  return {
    teamMembers,
    projects,
    assignments,
    isLoading: isPeopleLoading || isAssignmentsLoading || isProjectsLoading || isTasksLoading,
  };
}
