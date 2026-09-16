import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { DeveloperDashboardView } from '../features/developer/views/developer-dashboard-view';
import { DeveloperWorkspaceView } from '../features/developer/views/developer-workspace-view';
import { DeveloperAssignmentsView } from '../features/developer/views/developer-assignments-view';
import { DeveloperEvidenceView } from '../features/developer/views/developer-evidence-view';

import * as devDashHook from '../features/developer/hooks/use-developer-dashboard';
import * as devWorkspaceHook from '../features/developer/hooks/use-developer-workspace';
import * as devAssignmentsHook from '../features/developer/hooks/use-developer-assignments';
import * as devEvidenceHook from '../features/developer/hooks/use-developer-evidence';

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

describe('F4 Developer Workspace Experience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Developer Dashboard', () => {
    it('renders developer command center with sprint tasks, deliverables, and projects', () => {
      const mockProjects = [
        {
          id: 'proj-1',
          organizationId: 'org-test',
          name: 'DeVoc Engine Core',
          code: 'DEV-CORE',
          projectType: 'saas_product',
          status: 'development',
          priority: 'critical',
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        } as any,
      ];

      const mockTasks = [
        {
          id: 'task-10',
          organizationId: 'org-test',
          projectId: 'proj-1',
          taskKey: 'DEV-10',
          title: 'Fix optimistic UI state update in task table',
          taskType: 'feature',
          priority: 'high',
          status: 'in_progress',
          createdAt: '2026-09-15T00:00:00Z',
          updatedAt: '2026-09-16T00:00:00Z',
        } as any,
      ];

      vi.spyOn(devDashHook, 'useDeveloperDashboard').mockReturnValue({
        projects: mockProjects,
        tasks: mockTasks,
        activeSprintTasks: mockTasks,
        blockedTasks: [],
        workRecords: [],
        assignments: [],
        evidenceList: [
          {
            evidence: {
              id: 'ev-1',
              workId: 'work-1',
              title: 'PR #142: Task Table Optimistic Transitions',
              evidenceUrl: 'https://github.com/devoc-official/devoc-os/pull/142',
              createdAt: '2026-09-15T15:00:00Z',
            },
            workTitle: 'Task Table Improvements',
          },
        ],
        totalHoursLogged: '32.5',
        isLoading: false,
      });

      renderWithProviders(<DeveloperDashboardView />);

      expect(screen.getByText('Developer Command Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Active Sprint Tasks/i)).toBeInTheDocument();
      expect(screen.getByText('Fix optimistic UI state update in task table')).toBeInTheDocument();
      expect(screen.getByText('Recent Evidence')).toBeInTheDocument();
      expect(screen.getByText('PR #142: Task Table Optimistic Transitions')).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });
  });

  describe('My Development Operational Workspace (/developer)', () => {
    it('renders engineering command center metrics, tasks, and project responsibilities', () => {
      const mockProjects = [
        {
          id: 'proj-1',
          organizationId: 'org-test',
          name: 'DeVoc Backend Runtime',
          code: 'BACKEND',
          status: 'development',
          priority: 'high',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-09-15T00:00:00Z',
        } as any,
      ];

      const mockTasks = [
        {
          id: 'task-101',
          organizationId: 'org-test',
          projectId: 'proj-1',
          taskKey: 'BCK-101',
          title: 'Verify multi-tenant PostgreSQL search paths',
          taskType: 'task',
          priority: 'critical',
          status: 'todo',
          createdAt: '2026-09-14T00:00:00Z',
          updatedAt: '2026-09-16T00:00:00Z',
        } as any,
      ];

      vi.spyOn(devWorkspaceHook, 'useDeveloperWorkspace').mockReturnValue({
        projects: mockProjects,
        tasks: mockTasks,
        allTasks: mockTasks,
        assignments: [
          {
            id: 'asg-1',
            organizationId: 'org-test',
            personId: 'dev-1',
            targetType: 'project',
            targetId: 'proj-1',
            roleContext: 'Core Backend Architect',
            status: 'active',
            capacityValue: 30,
            capacityUnit: 'hours_per_week',
            createdAt: '2026-08-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          } as any,
        ],
        workRecords: [],
        isLoading: false,
        transitionTaskStatus: vi.fn().mockResolvedValue({} as any),
      } as any);

      renderWithProviders(<DeveloperWorkspaceView />);

      expect(screen.getByText('Engineering Command Center')).toBeInTheDocument();
      expect(screen.getByText(/Sprint Backlog/i)).toBeInTheDocument();
      expect(screen.getByText('Verify multi-tenant PostgreSQL search paths')).toBeInTheDocument();
      expect(screen.getByText('Core Backend Architect')).toBeInTheDocument();
      expect(screen.getByText('DeVoc Backend Runtime')).toBeInTheDocument();
    });
  });

  describe('Developer Assignments (/developer/assignments)', () => {
    it('answers "Where am I officially responsible?" with capacity and context', () => {
      vi.spyOn(devAssignmentsHook, 'useDeveloperAssignments').mockReturnValue({
        assignments: [
          {
            id: 'asg-77',
            organizationId: 'org-test',
            personId: 'dev-1',
            targetType: 'project',
            targetId: 'proj-1',
            roleContext: 'Lead Systems Engineer',
            status: 'active',
            capacityValue: 25,
            capacityUnit: 'hours_per_week',
            startDate: '2026-09-01',
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          } as any,
        ],
        projects: [
          {
            id: 'proj-1',
            name: 'DeVoc Cloud Infrastructure',
            code: 'INFRA',
          } as any,
        ],
        isLoading: false,
      } as any);

      renderWithProviders(<DeveloperAssignmentsView />);

      expect(screen.getByText('Official Assignments')).toBeInTheDocument();
      expect(screen.getByText('Lead Systems Engineer')).toBeInTheDocument();
      expect(screen.getByText('DeVoc Cloud Infrastructure')).toBeInTheDocument();
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });
  });

  describe('Developer Evidence (/developer/evidence)', () => {
    it('renders deliverable evidence ledger with PR, commit, and artifact links', () => {
      vi.spyOn(devEvidenceHook, 'useDeveloperEvidence').mockReturnValue({
        evidenceItems: [
          {
            id: 'ev-pr-1',
            title: 'PR #108: Multi-role unified dashboard',
            evidenceUrl: 'https://github.com/devoc-official/devoc-os/pull/108',
            workId: 'work-1',
            workTitle: 'Unified Dashboard Implementation',
            createdAt: '2026-09-15T18:00:00Z',
          },
        ],
        workRecords: [],
        isLoading: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<DeveloperEvidenceView />);

      expect(screen.getByText('Evidence Ledger')).toBeInTheDocument();
      expect(screen.getByText('PR #108: Multi-role unified dashboard')).toBeInTheDocument();
      expect(screen.getByText('Unified Dashboard Implementation')).toBeInTheDocument();
    });
  });
});
