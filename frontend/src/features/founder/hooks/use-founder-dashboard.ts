'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { peopleApi } from '../../../api/people.api';
import { organizationApi } from '../../../api/organization.api';
import { projectsApi } from '../../../api/projects.api';
import { workApi } from '../../../api/work.api';
import { learningApi } from '../../../api/learning.api';
import { financeApi } from '../../../api/finance.api';
import { recruitmentApi } from '../../../api/recruitment.api';
import { workforceTimeApi } from '../../../api/workforce-time.api';

export function useFounderDashboard() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  // People & Roles
  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['founder', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['founder', 'roles', orgId],
    queryFn: () => peopleApi.listRoles(orgId),
    enabled: Boolean(orgId),
  });

  // Organization Structure
  const { data: businessUnits = [] } = useQuery({
    queryKey: ['founder', 'business-units', orgId],
    queryFn: () => organizationApi.listBusinessUnits(orgId),
    enabled: Boolean(orgId),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['founder', 'departments', orgId],
    queryFn: () => organizationApi.listDepartments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['founder', 'teams', orgId],
    queryFn: () => organizationApi.listTeams(orgId),
    enabled: Boolean(orgId),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['founder', 'branches', orgId],
    queryFn: () => organizationApi.listBranches(orgId),
    enabled: Boolean(orgId),
  });

  // Projects & Tasks
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['founder', 'projects', orgId],
    queryFn: () => projectsApi.listProjects(orgId),
    enabled: Boolean(orgId),
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['founder', 'tasks', orgId],
    queryFn: () => projectsApi.listTasks(orgId),
    enabled: Boolean(orgId),
  });

  // Work Contributions
  const { data: workRecords = [], isLoading: isWorkLoading } = useQuery({
    queryKey: ['founder', 'work', orgId],
    queryFn: () => workApi.listWorkRecords(orgId),
    enabled: Boolean(orgId),
  });

  // Learning & Academy
  const { data: programs = [] } = useQuery({
    queryKey: ['founder', 'programs', orgId],
    queryFn: () => learningApi.listPrograms(orgId),
    enabled: Boolean(orgId),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['founder', 'enrollments', orgId],
    queryFn: () => learningApi.listEnrollments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['founder', 'reviews', orgId],
    queryFn: () => learningApi.listReviews(orgId),
    enabled: Boolean(orgId),
  });

  // Finance
  const { data: obligations = [] } = useQuery({
    queryKey: ['founder', 'obligations', orgId],
    queryFn: () => financeApi.listObligations(orgId),
    enabled: Boolean(orgId),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['founder', 'transactions', orgId],
    queryFn: () => financeApi.listTransactions(orgId),
    enabled: Boolean(orgId),
  });

  // Recruitment
  const { data: positions = [] } = useQuery({
    queryKey: ['founder', 'positions', orgId],
    queryFn: () => recruitmentApi.listPositions(orgId),
    enabled: Boolean(orgId),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['founder', 'applications', orgId],
    queryFn: () => recruitmentApi.listApplications(orgId),
    enabled: Boolean(orgId),
  });

  // Workforce
  const { data: timesheets = [] } = useQuery({
    queryKey: ['founder', 'timesheets', orgId],
    queryFn: () => workforceTimeApi.listTimesheets(orgId),
    enabled: Boolean(orgId),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['founder', 'leave-requests', orgId],
    queryFn: () => workforceTimeApi.listLeaveRequests(orgId),
    enabled: Boolean(orgId),
  });

  // Derived Executive Calculations
  const activePeople = people.filter((p) => p.status === 'active');
  const activeProjects = projects.filter((p) => p.status !== 'archived');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const pendingTimesheets = timesheets.filter((t) => t.status === 'submitted');
  const pendingLeaveRequests = leaveRequests.filter((l) => l.status === 'submitted');
  const pendingWorkApprovals = workRecords.filter((w) => w.status === 'submitted');
  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const openPositions = positions.filter((p) => p.status === 'open');

  const totalRevenueInflow = transactions
    .filter((tx) => tx.direction === 'inflow' && tx.state === 'Posted')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const outstandingReceivables = obligations
    .filter((ob) => ob.direction === 'receivable' && ob.state !== 'Paid' && ob.state !== 'Cancelled')
    .reduce((sum, ob) => sum + Number(ob.balanceAmount || 0), 0);

  const overdueObligations = obligations.filter((ob) => ob.state === 'Overdue');

  const totalContributionMinutes = workRecords.reduce(
    (sum, w) => sum + Number(w.durationMinutes || 0),
    0
  );
  const totalContributionHours = (totalContributionMinutes / 60).toFixed(1);

  // High-signal executive attention items
  const attentionItems: Array<{
    id: string;
    category: 'project' | 'finance' | 'workforce' | 'academy' | 'recruitment';
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    actionHref: string;
    actionLabel: string;
  }> = [];

  for (const t of blockedTasks) {
    attentionItems.push({
      id: `task-${t.id}`,
      category: 'project',
      title: `Blocked Task: ${t.title}`,
      description: `Task key ${t.taskKey} is marked as blocked and hindering sprint completion.`,
      severity: 'critical',
      actionHref: `/projects`,
      actionLabel: 'Inspect Project',
    });
  }

  for (const ob of overdueObligations) {
    attentionItems.push({
      id: `ob-${ob.id}`,
      category: 'finance',
      title: `Overdue Obligation: ${ob.title}`,
      description: `Balance of ₹${ob.balanceAmount.toLocaleString()} is past its scheduled due date.`,
      severity: 'critical',
      actionHref: `/finance`,
      actionLabel: 'Review Finance',
    });
  }

  if (pendingTimesheets.length > 0) {
    attentionItems.push({
      id: 'pending-timesheets',
      category: 'workforce',
      title: `${pendingTimesheets.length} Timesheets Awaiting Approval`,
      description: `Staff weekly timesheets have been submitted and require management verification.`,
      severity: 'warning',
      actionHref: `/workforce`,
      actionLabel: 'Inspect Timesheets',
    });
  }

  if (pendingLeaveRequests.length > 0) {
    attentionItems.push({
      id: 'pending-leave',
      category: 'workforce',
      title: `${pendingLeaveRequests.length} Leave Requests Pending`,
      description: `Employees have submitted scheduled time-off requests.`,
      severity: 'info',
      actionHref: `/workforce`,
      actionLabel: 'Review Requests',
    });
  }

  if (openPositions.length > 0) {
    attentionItems.push({
      id: 'open-positions',
      category: 'recruitment',
      title: `${openPositions.length} Open Requisitions Active`,
      description: `${applications.length} candidate applications in pipeline across active positions.`,
      severity: 'info',
      actionHref: `/recruitment`,
      actionLabel: 'View Pipeline',
    });
  }

  const isLoading =
    isPeopleLoading ||
    isRolesLoading ||
    isProjectsLoading ||
    isTasksLoading ||
    isWorkLoading;

  return {
    people,
    activePeople,
    roles,
    businessUnits,
    departments,
    teams,
    branches,
    projects,
    activeProjects,
    tasks,
    blockedTasks,
    workRecords,
    pendingWorkApprovals,
    totalContributionHours,
    programs,
    enrollments,
    activeEnrollments,
    reviews,
    obligations,
    outstandingReceivables,
    overdueObligations,
    totalRevenueInflow,
    positions,
    openPositions,
    applications,
    timesheets,
    pendingTimesheets,
    leaveRequests,
    pendingLeaveRequests,
    attentionItems,
    isLoading,
  };
}
