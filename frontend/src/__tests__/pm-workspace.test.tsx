import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { PMDashboardView } from '../features/pm/views/pm-dashboard-view';
import { PMProjectsView } from '../features/pm/views/pm-projects-view';
import { PMCockpitView } from '../features/pm/views/pm-cockpit-view';
import { PMTasksView } from '../features/pm/views/pm-tasks-view';
import { PMTeamView } from '../features/pm/views/pm-team-view';
import { PMRisksView } from '../features/pm/views/pm-risks-view';

import * as pmDashHook from '../features/pm/hooks/use-pm-dashboard';
import * as pmProjectsHook from '../features/pm/hooks/use-pm-projects';
import * as pmCockpitHook from '../features/pm/hooks/use-pm-cockpit';
import * as pmTasksHook from '../features/pm/hooks/use-pm-tasks';
import * as pmTeamHook from '../features/pm/hooks/use-pm-team';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          {ui}
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('F4 Project Manager Workspace Experience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('PM Dashboard', () => {
    it('renders project portfolio management dashboard with metrics, projects, and attention items', () => {
      const mockProjects = [
        {
          id: 'proj-pm-1',
          organizationId: 'org-test',
          name: 'Enterprise Tenancy Migration',
          code: 'TENANT',
          projectType: 'internal_tool',
          status: 'development',
          priority: 'critical',
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        } as any,
      ];

      const mockBlockedTasks = [
        {
          id: 'task-blocked-1',
          organizationId: 'org-test',
          projectId: 'proj-pm-1',
          taskKey: 'TNT-09',
          title: 'Fix deadlock during concurrent migration',
          taskType: 'bug',
          priority: 'critical',
          status: 'blocked',
          createdAt: '2026-09-14T00:00:00Z',
          updatedAt: '2026-09-15T00:00:00Z',
        } as any,
      ];

      vi.spyOn(pmDashHook, 'usePMDashboard').mockReturnValue({
        projects: mockProjects,
        tasks: mockBlockedTasks,
        blockedTasks: mockBlockedTasks,
        inReviewTasks: [],
        pendingApprovals: [],
        upcomingMeetings: [],
        assignments: [],
        isLoading: false,
      });

      renderWithProviders(<PMDashboardView />);

      expect(screen.getByText('Project Manager Cockpit')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Tenancy Migration')).toBeInTheDocument();
      expect(screen.getByText(/Tasks Requiring Attention/i)).toBeInTheDocument();
      expect(screen.getByText('Fix deadlock during concurrent migration')).toBeInTheDocument();
    });
  });

  describe('PM Projects Directory (/pm/projects)', () => {
    it('renders managed projects list with lifecycle, priority, and progress indicators', () => {
      vi.spyOn(pmProjectsHook, 'usePMProjects').mockReturnValue({
        projects: [
          {
            id: 'proj-1',
            organizationId: 'org-test',
            name: 'Academy Learning Portal',
            code: 'ACAD-PORTAL',
            projectType: 'saas_product',
            status: 'development',
            priority: 'high',
            createdAt: '2026-06-01T00:00:00Z',
            updatedAt: '2026-09-10T00:00:00Z',
          } as any,
        ],
        projectTasksMap: new Map([
          ['proj-1', [{ id: 't1', status: 'done' }, { id: 't2', status: 'todo' }] as any],
        ]),
        isLoading: false,
      } as any);

      renderWithProviders(<PMProjectsView />);

      expect(screen.getByText('Project Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Academy Learning Portal')).toBeInTheDocument();
      expect(screen.getByText('ACAD-PORTAL')).toBeInTheDocument();
    });
  });

  describe('PM Project Cockpit (/pm/projects/[projectId])', () => {
    it('renders deep cockpit with progressive disclosure tabs and handles deferred risks', () => {
      vi.spyOn(pmCockpitHook, 'usePMCockpit').mockReturnValue({
        project: {
          id: 'proj-cockpit',
          organizationId: 'org-test',
          name: 'DeVoc Business OS Core',
          code: 'DEV-OS',
          projectType: 'saas_product',
          status: 'development',
          priority: 'critical',
          description: 'Core multi-tenant operating system',
          createdAt: '2026-07-01T00:00:00Z',
          updatedAt: '2026-09-15T00:00:00Z',
        } as any,
        tasks: [
          {
            id: 'task-c1',
            organizationId: 'org-test',
            projectId: 'proj-cockpit',
            taskKey: 'OS-1',
            title: 'Verify multi-tenant search path isolation',
            taskType: 'feature',
            priority: 'critical',
            status: 'in_progress',
            createdAt: '2026-09-10T00:00:00Z',
            updatedAt: '2026-09-15T00:00:00Z',
          } as any,
        ],
        assignments: [
          {
            id: 'asg-c1',
            organizationId: 'org-test',
            personId: 'person-1',
            targetType: 'project',
            targetId: 'proj-cockpit',
            roleContext: 'Lead Architect',
            status: 'active',
            capacityValue: 35,
            capacityUnit: 'hours_per_week',
            startAt: '2026-08-01T00:00:00Z',
            createdAt: '2026-08-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          } as any,
        ],
        people: [
          {
            id: 'person-1',
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'sarah@devoc.internal',
            status: 'active',
          } as any,
        ],
        workRecords: [],
        workCategories: [],
        isLoading: false,
        createTask: vi.fn().mockResolvedValue({} as any),
        transitionTaskStatus: vi.fn().mockResolvedValue({} as any),
        createAssignment: vi.fn().mockResolvedValue({} as any),
        getTaskDependencies: vi.fn().mockResolvedValue([]),
        addDependency: vi.fn().mockResolvedValue({} as any),
        removeDependency: vi.fn().mockResolvedValue({} as any),
      } as any);

      renderWithProviders(<PMCockpitView projectId="proj-cockpit" />);

      expect(screen.getByText('DeVoc Business OS Core')).toBeInTheDocument();
      expect(screen.getByText(/Tasks & Deliverables/i)).toBeInTheDocument();
      expect(screen.getByText(/Team & Responsibility/i)).toBeInTheDocument();
      expect(screen.getByText(/Team Work Contributions/i)).toBeInTheDocument();
      expect(screen.getByText(/Risks & Blockers/i)).toBeInTheDocument();

      // Inspect Project Risks tab (Section 38 compliance verification)
      fireEvent.click(screen.getByText(/Risks & Blockers/i));
      expect(screen.getByText('Risk Management Governance Note')).toBeInTheDocument();
      expect(screen.getByText(/Section 38/i)).toBeInTheDocument();
    });
  });

  describe('PM Tasks Governance (/pm/tasks)', () => {
    it('renders task portfolio management and opens task creation dialog', () => {
      vi.spyOn(pmTasksHook, 'usePMTasks').mockReturnValue({
        tasks: [
          {
            id: 'task-pm-99',
            organizationId: 'org-test',
            projectId: 'proj-1',
            taskKey: 'ENG-99',
            title: 'Audit append-only historical database constraints',
            taskType: 'task',
            priority: 'critical',
            status: 'todo',
            createdAt: '2026-09-15T00:00:00Z',
            updatedAt: '2026-09-16T00:00:00Z',
          } as any,
        ],
        projects: [
          {
            id: 'proj-1',
            name: 'DeVoc Platform',
            code: 'DEV',
          } as any,
        ],
        isLoading: false,
        createTask: vi.fn().mockResolvedValue({} as any),
        transitionStatus: vi.fn().mockResolvedValue({} as any),
        getDependencies: vi.fn().mockResolvedValue([]),
        addDependency: vi.fn().mockResolvedValue({} as any),
        removeDependency: vi.fn().mockResolvedValue({} as any),
      } as any);

      renderWithProviders(<PMTasksView />);

      expect(screen.getByText('Task Governance')).toBeInTheDocument();
      expect(screen.getByText('Audit append-only historical database constraints')).toBeInTheDocument();
      expect(screen.getByText('Create Task')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Create Task'));
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
    });
  });

  describe('PM Team Capacity (/pm/team)', () => {
    it('answers "Who is responsible for what?" with M3 assignments and project allocations', () => {
      vi.spyOn(pmTeamHook, 'usePMTeam').mockReturnValue({
        teamMembers: [
          {
            person: {
              id: 'pers-1',
              firstName: 'Alex',
              lastName: 'Rivera',
              email: 'alex@devoc.internal',
              status: 'active',
            } as any,
            assignments: [
              {
                id: 'asg-1',
                organizationId: 'org-test',
                personId: 'pers-1',
                targetType: 'project',
                targetId: 'proj-1',
                roleContext: 'Tech Lead & PM',
                status: 'active',
                capacityValue: 40,
                capacityUnit: 'hours_per_week',
              } as any,
            ],
            assignedProjects: [
              {
                id: 'proj-1',
                name: 'Core Platform',
                code: 'CORE',
              } as any,
            ],
            activeTasks: [],
            totalCapacityHours: 40,
          },
        ],
        projects: [
          {
            id: 'proj-1',
            name: 'Core Platform',
            code: 'CORE',
          } as any,
        ],
        assignments: [],
        isLoading: false,
      } as any);

      renderWithProviders(<PMTeamView />);

      expect(screen.getByText('Team Responsibility & Capacity')).toBeInTheDocument();
      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      expect(screen.getByText('Tech Lead & PM')).toBeInTheDocument();
      expect(screen.getByText('40h/wk')).toBeInTheDocument();
    });
  });

  describe('PM Risks Handling (/pm/risks)', () => {
    it('displays authoritative deferred notice without fabricating fake risk records (Section 38)', () => {
      renderWithProviders(<PMRisksView />);

      expect(screen.getByText('Project Delivery Risks')).toBeInTheDocument();
      expect(screen.getByText('Risk Engine Status — Deferred Capability')).toBeInTheDocument();
      expect(screen.getByText(/Section 38/i)).toBeInTheDocument();
    });
  });
});
