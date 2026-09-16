'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { projectsApi, Project, Task, TaskStatus, TaskPriority, TaskDependency } from '../../../api/projects.api';
import { workApi, WorkRecord } from '../../../api/work.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { peopleApi, Person } from '../../../api/people.api';

export function usePMCockpit(projectId: string) {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const queryClient = useQueryClient();

  // 1. Project details
  const {
    data: project = null,
    isLoading: isProjectLoading,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ['pm', 'project', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      return await projectsApi.getProjectById(orgId, projectId);
    },
    enabled: Boolean(orgId && projectId),
  });

  // 2. Project tasks
  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['pm', 'project-tasks', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return [];
      return await projectsApi.listProjectTasks(orgId, projectId);
    },
    enabled: Boolean(orgId && projectId),
  });

  // 3. Project assignments (from M3)
  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ['pm', 'project-assignments', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return [];
      return await assignmentsApi.listAssignments(orgId, { targetType: 'project', targetId: projectId });
    },
    enabled: Boolean(orgId && projectId),
  });

  // 4. Project work contributions (from M5)
  const {
    data: workRecords = [],
    isLoading: isWorkLoading,
    refetch: refetchWork,
  } = useQuery({
    queryKey: ['pm', 'project-work', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return [];
      return await workApi.listWorkRecords(orgId, { targetType: 'project', targetId: projectId });
    },
    enabled: Boolean(orgId && projectId),
  });

  // 5. People in organization (for assignment lookup)
  const { data: people = [] } = useQuery({
    queryKey: ['pm', 'org-people', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await peopleApi.listPeople(orgId);
    },
    enabled: Boolean(orgId),
  });

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      taskType: any;
      priority: TaskPriority;
      description?: string;
      dueAt?: string;
    }) => {
      if (!orgId || !projectId) throw new Error('Missing project context');
      return await projectsApi.createTask(orgId, {
        projectId,
        title: payload.title,
        taskType: payload.taskType,
        priority: payload.priority,
        description: payload.description,
        dueAt: payload.dueAt,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'project-tasks', orgId, projectId] });
    },
  });

  // Task status transition
  const transitionTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      if (!orgId) throw new Error('Missing tenant context');
      return await projectsApi.transitionTaskStatus(orgId, taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'project-tasks', orgId, projectId] });
    },
  });

  // Dependency operations
  const getDependencies = async (taskId: string): Promise<TaskDependency[]> => {
    if (!orgId) return [];
    return await projectsApi.getTaskDependencies(orgId, taskId).catch(() => []);
  };

  const addDependency = async (taskId: string, dependsOnTaskId: string) => {
    if (!orgId) return;
    await projectsApi.addDependency(orgId, taskId, dependsOnTaskId);
    queryClient.invalidateQueries({ queryKey: ['pm', 'project-tasks', orgId, projectId] });
  };

  const removeDependency = async (taskId: string, dependencyId: string) => {
    if (!orgId) return;
    await projectsApi.removeDependency(orgId, taskId, dependencyId);
    queryClient.invalidateQueries({ queryKey: ['pm', 'project-tasks', orgId, projectId] });
  };

  // Assignment creation mutation
  const assignPersonMutation = useMutation({
    mutationFn: async (payload: {
      personId: string;
      roleContext: string;
      capacityValue: number;
      capacityUnit: string;
    }) => {
      if (!orgId || !projectId) throw new Error('Missing context');
      return await assignmentsApi.createAssignment(orgId, {
        personId: payload.personId,
        targetType: 'project',
        targetId: projectId,
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
      queryClient.invalidateQueries({ queryKey: ['pm', 'project-assignments', orgId, projectId] });
    },
  });

  const completedTasksCount = tasks.filter((t) => t.status === 'done').length;
  const blockedTasksCount = tasks.filter((t) => t.status === 'blocked').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return {
    project,
    tasks,
    assignments,
    workRecords,
    people,
    completedTasksCount,
    blockedTasksCount,
    progressPercent,
    isLoading: isProjectLoading || isTasksLoading || isAssignmentsLoading || isWorkLoading,
    createTask: createTaskMutation.mutateAsync,
    transitionTaskStatus: (taskId: string, status: TaskStatus) =>
      transitionTaskStatusMutation.mutateAsync({ taskId, status }),
    getDependencies,
    addDependency,
    removeDependency,
    assignPerson: assignPersonMutation.mutateAsync,
    refetch: () => {
      refetchProject();
      refetchTasks();
      refetchAssignments();
      refetchWork();
    },
  };
}
