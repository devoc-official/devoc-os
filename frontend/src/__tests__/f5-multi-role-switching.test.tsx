import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedDashboardView } from '../features/dashboard/unified-dashboard-view';
import * as roleHook from '../roles/role.context';
import * as authHook from '../auth/use-auth';
import * as founderDashHook from '../features/founder/hooks/use-founder-dashboard';
import * as ahDashHook from '../features/academy-head/hooks/use-academy-head-dashboard';
import * as employeeDashHook from '../features/employee/hooks/use-employee-dashboard';
import * as pmDashHook from '../features/pm/hooks/use-pm-dashboard';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithClient(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>
  );
}

describe('F5 Multi-Role Switching: Founder and Academy Head Personas', () => {
  let currentRoleState: any = 'all';
  const mockSwitchRole = vi.fn((newRole: any) => {
    currentRoleState = newRole;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    currentRoleState = 'all';

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-exec', firstName: 'Executive', lastName: 'Leader', email: 'exec@devoc.internal' },
      activeOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      currentOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);

    vi.spyOn(founderDashHook, 'useFounderDashboard').mockReturnValue({
      activePeople: [],
      roles: [],
      businessUnits: [],
      activeProjects: [],
      blockedTasks: [],
      pendingWorkApprovals: [],
      totalContributionHours: '0',
      activeEnrollments: [],
      programs: [],
      openPositions: [],
      applications: [],
      totalRevenueInflow: 0,
      outstandingReceivables: 0,
      pendingTimesheets: [],
      attentionItems: [],
      isLoading: false,
    } as any);

    vi.spyOn(ahDashHook, 'useAcademyHeadDashboard').mockReturnValue({
      programs: [],
      enrollments: [],
      activeStudents: [],
      completedStudents: [],
      pausedStudents: [],
      reviews: [],
      pendingReviewsCount: 0,
      completedReviews: [],
      mentorAssignments: [],
      studentsWithoutMentor: [],
      blockedTasks: [],
      attentionItems: [],
      people: [],
      isLoading: false,
    });

    vi.spyOn(employeeDashHook, 'useEmployeeDashboard').mockReturnValue({
      workRecords: [],
      tasks: [],
      openTasks: [],
      blockedTasks: [],
      projects: [],
      attendanceRecords: [],
      todayAttendance: null,
      timesheets: [],
      currentTimesheet: null as any,
      leaveBalances: [],
      upcomingMeetings: [],
      evaluations: [],
      isLoading: false,
    } as any);

    vi.spyOn(pmDashHook, 'usePMDashboard').mockReturnValue({
      projects: [],
      allTasks: [],
      blockedTasks: [],
      teamMembers: [],
      pendingWorkReviews: [],
      upcomingMeetings: [],
      attentionItems: [],
      isLoading: false,
    } as any);
  });

  it('renders Founder Executive Command Center when currentRole is founder', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      currentRole: 'founder',
      activeRoles: [
        { category: 'founder', name: 'Founder', code: 'FOUNDER', description: 'Executive oversight' },
        { category: 'academy_head', name: 'Academy Head', code: 'AH', description: 'Curriculum lead' },
      ],
      switchRole: mockSwitchRole,
      isMultiRole: true,
      isLoading: false,
      getRoleDetails: vi.fn(),
    });

    renderWithClient(<UnifiedDashboardView />);
    expect(screen.getByText(/Founder Executive Command Center/i)).toBeInTheDocument();
  });

  it('renders Academy Head Command Center when currentRole is academy_head', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      currentRole: 'academy_head',
      activeRoles: [
        { category: 'founder', name: 'Founder', code: 'FOUNDER', description: 'Executive oversight' },
        { category: 'academy_head', name: 'Academy Head', code: 'AH', description: 'Curriculum lead' },
      ],
      switchRole: mockSwitchRole,
      isMultiRole: true,
      isLoading: false,
      getRoleDetails: vi.fn(),
    });

    renderWithClient(<UnifiedDashboardView />);
    expect(screen.getByText(/Academy Head Command Center/i)).toBeInTheDocument();
  });

  it('resets to unified workspace when onResetToUnified is invoked', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      currentRole: 'founder',
      activeRoles: [
        { category: 'founder', name: 'Founder', code: 'FOUNDER', description: 'Executive oversight' },
      ],
      switchRole: mockSwitchRole,
      isMultiRole: false,
      isLoading: false,
      getRoleDetails: vi.fn(),
    });

    renderWithClient(<UnifiedDashboardView />);
    const resetButton = screen.getByRole('button', { name: /return to unified/i });
    fireEvent.click(resetButton);

    expect(mockSwitchRole).toHaveBeenCalledWith('all');
  });
});
