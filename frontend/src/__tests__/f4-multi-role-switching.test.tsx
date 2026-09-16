import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedDashboardView } from '../features/dashboard/unified-dashboard-view';
import * as roleHook from '../roles/role.context';
import * as authHook from '../auth/use-auth';
import * as employeeDashHook from '../features/employee/hooks/use-employee-dashboard';
import * as devDashHook from '../features/developer/hooks/use-developer-dashboard';
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

describe('F4 Multi-Role Switching & Unified Dashboard (Sections 4, 46, 47)', () => {
  let currentRoleState: any = 'all';
  const mockSwitchRole = vi.fn((newRole: any) => {
    currentRoleState = newRole;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    currentRoleState = 'all';

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-multi', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@devoc.internal' },
      activeOrganization: { organizationId: 'org-1', organizationName: 'DeVoc Official' },
      currentOrganization: { organizationId: 'org-1', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);

    // Mock sub-dashboard hooks with full return shape
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

    vi.spyOn(devDashHook, 'useDeveloperDashboard').mockReturnValue({
      projects: [],
      tasks: [],
      activeSprintTasks: [],
      blockedTasks: [],
      workRecords: [],
      assignments: [],
      evidenceList: [],
      totalHoursLogged: '0.0',
      isLoading: false,
    } as any);

    vi.spyOn(pmDashHook, 'usePMDashboard').mockReturnValue({
      projects: [],
      tasks: [],
      blockedTasks: [],
      inReviewTasks: [],
      pendingApprovals: [],
      upcomingMeetings: [],
      assignments: [],
      isLoading: false,
    } as any);
  });

  it('renders all active roles on the unified dashboard when currentRole is "all"', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      activeRoles: [
        {
          category: 'employee',
          name: 'Employee',
          roleTitle: 'Senior Software Engineer',
          organizationId: 'org-1',
          description: 'Manage personal work, tasks, attendance, timesheets, and leave.',
          isPrimary: true,
        },
        {
          category: 'developer',
          name: 'Developer',
          roleTitle: 'Full-Stack Developer',
          organizationId: 'org-1',
          description: 'Focus on technical deliverables, sprint tasks, and work evidence.',
          isPrimary: false,
        },
        {
          category: 'project_manager',
          name: 'Project Manager',
          roleTitle: 'Technical Project Manager',
          organizationId: 'org-1',
          description: 'Lead projects, govern tasks, oversee team capacity, and monitor delivery.',
          isPrimary: false,
        },
      ],
      currentRole: 'all',
      isMultiRole: true,
      switchRole: mockSwitchRole,
      getRoleDetails: vi.fn(),
      isLoading: false,
    } as any);

    renderWithClient(<UnifiedDashboardView />);

    expect(screen.getByText('Active Role Workspaces')).toBeInTheDocument();
    expect(screen.getAllByText('Employee').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Developer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Project Manager').length).toBeGreaterThan(0);
  });

  it('switches to Employee workspace and displays ContextBanner', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      activeRoles: [
        {
          category: 'employee',
          name: 'Employee',
          roleTitle: 'Senior Software Engineer',
          organizationId: 'org-1',
          description: 'Manage personal work, tasks, attendance, timesheets, and leave.',
          isPrimary: true,
        },
        {
          category: 'developer',
          name: 'Developer',
          roleTitle: 'Full-Stack Developer',
          organizationId: 'org-1',
          description: 'Focus on technical deliverables, sprint tasks, and work evidence.',
          isPrimary: false,
        },
      ],
      currentRole: 'employee',
      isMultiRole: true,
      switchRole: mockSwitchRole,
      getRoleDetails: vi.fn(),
      isLoading: false,
    } as any);

    renderWithClient(<UnifiedDashboardView />);

    expect(screen.getByText(/Filtered to/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Employee Workspace/i).length).toBe(2);
    expect(screen.getByText('Return to Unified')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Return to Unified'));
    expect(mockSwitchRole).toHaveBeenCalledWith('all');
  });

  it('switches to Developer workspace and displays ContextBanner', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      activeRoles: [
        {
          category: 'employee',
          name: 'Employee',
          roleTitle: 'Senior Software Engineer',
          organizationId: 'org-1',
          description: 'Manage personal work, tasks, attendance, timesheets, and leave.',
          isPrimary: true,
        },
        {
          category: 'developer',
          name: 'Developer',
          roleTitle: 'Full-Stack Developer',
          organizationId: 'org-1',
          description: 'Focus on technical deliverables, sprint tasks, and work evidence.',
          isPrimary: false,
        },
      ],
      currentRole: 'developer',
      isMultiRole: true,
      switchRole: mockSwitchRole,
      getRoleDetails: vi.fn(),
      isLoading: false,
    } as any);

    renderWithClient(<UnifiedDashboardView />);

    expect(screen.getByText(/Filtered to/i)).toBeInTheDocument();
    expect(screen.getByText(/Developer Workspace/i)).toBeInTheDocument();
    expect(screen.getByText('Developer Command Dashboard')).toBeInTheDocument();
  });

  it('switches to Project Manager workspace and displays ContextBanner', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      activeRoles: [
        {
          category: 'project_manager',
          name: 'Project Manager',
          roleTitle: 'Technical Project Manager',
          organizationId: 'org-1',
          description: 'Lead projects, govern tasks, oversee team capacity, and monitor delivery.',
          isPrimary: false,
        },
      ],
      currentRole: 'project_manager',
      isMultiRole: false,
      switchRole: mockSwitchRole,
      getRoleDetails: vi.fn(),
      isLoading: false,
    } as any);

    renderWithClient(<UnifiedDashboardView />);

    expect(screen.getByText(/Filtered to/i)).toBeInTheDocument();
    expect(screen.getByText(/Project Manager Workspace/i)).toBeInTheDocument();
    expect(screen.getByText('Project Manager Cockpit')).toBeInTheDocument();
  });
});
