'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { workApi, WorkRecord } from '../../../api/work.api';
import { projectsApi, Task, Project } from '../../../api/projects.api';
import { workforceTimeApi, AttendanceRecord, Timesheet, LeaveBalance } from '../../../api/workforce-time.api';
import { meetingsApi, Meeting } from '../../../api/meetings.api';
import { evaluationApi, Evaluation } from '../../../api/evaluation.api';

export function useEmployeeDashboard() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;

  // 1. Work records (recent contributions)
  const { data: workRecords = [], isLoading: isWorkLoading } = useQuery({
    queryKey: ['employee', 'work', orgId, personId],
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

  // 2. Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['employee', 'tasks', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await projectsApi.listTasks(orgId, { createdByPersonId: personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 3. Projects
  const { data: projects = [] } = useQuery({
    queryKey: ['employee', 'projects', orgId],
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

  // 4. Attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: attendanceRecords = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['employee', 'attendance', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listAttendance(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 5. Timesheets
  const { data: timesheets = [] } = useQuery({
    queryKey: ['employee', 'timesheets', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listTimesheets(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 6. Leave balances
  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['employee', 'leave-balances', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listLeaveBalances(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 7. Upcoming Meetings
  const { data: meetings = [] } = useQuery({
    queryKey: ['employee', 'meetings', orgId],
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

  // 8. Evaluations
  const { data: evaluations = [] } = useQuery({
    queryKey: ['employee', 'evaluations', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await evaluationApi.listEvaluations(orgId, { subjectId: personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const todayAttendance = attendanceRecords.find((a) => a.attendanceDate === todayStr) || null;
  const currentTimesheet = timesheets.find((t) => t.status === 'draft' || t.status === 'submitted') || timesheets[0] || null;
  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled');
  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');

  return {
    workRecords,
    tasks,
    openTasks,
    blockedTasks,
    projects,
    attendanceRecords,
    todayAttendance,
    timesheets,
    currentTimesheet,
    leaveBalances,
    upcomingMeetings,
    evaluations,
    isLoading: isWorkLoading || isTasksLoading || isAttendanceLoading,
  };
}
