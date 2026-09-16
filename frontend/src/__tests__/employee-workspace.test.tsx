import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { EmployeeDashboardView } from '../features/employee/views/employee-dashboard-view';
import { EmployeeWorkView } from '../features/employee/views/employee-work-view';
import { EmployeeTasksView } from '../features/employee/views/employee-tasks-view';
import { EmployeeAttendanceView } from '../features/employee/views/employee-attendance-view';
import { EmployeeTimesheetsView } from '../features/employee/views/employee-timesheets-view';
import { EmployeeLeaveView } from '../features/employee/views/employee-leave-view';
import { EmployeeEvaluationsView } from '../features/employee/views/employee-evaluations-view';

import * as employeeDashHook from '../features/employee/hooks/use-employee-dashboard';
import * as employeeWorkHook from '../features/employee/hooks/use-employee-work';
import * as employeeTasksHook from '../features/employee/hooks/use-employee-tasks';
import * as employeeAttendanceHook from '../features/employee/hooks/use-employee-attendance';
import * as employeeTimesheetsHook from '../features/employee/hooks/use-employee-timesheets';
import * as employeeLeaveHook from '../features/employee/hooks/use-employee-leave';
import { evaluationApi } from '../api/evaluation.api';

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

describe('F4 Employee Workspace Experience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Employee Dashboard', () => {
    it('renders employee dashboard with work, tasks, attendance, and leave summaries', () => {
      const mockTasks = [
        {
          id: 'task-1',
          organizationId: 'org-test',
          projectId: 'proj-1',
          taskKey: 'DEV-101',
          title: 'Fix tenant resolution middleware',
          taskType: 'bug',
          priority: 'high',
          status: 'in_progress',
          createdAt: '2026-09-10T00:00:00Z',
          updatedAt: '2026-09-15T00:00:00Z',
        } as any,
      ];

      vi.spyOn(employeeDashHook, 'useEmployeeDashboard').mockReturnValue({
        workRecords: [
          {
            id: 'work-1',
            organizationId: 'org-test',
            personId: 'emp-1',
            categoryId: 'cat-dev',
            projectId: 'proj-1',
            title: 'Implemented OAuth Flow',
            description: 'Refactored auth client',
            durationMinutes: 120,
            status: 'submitted',
            createdAt: '2026-09-15T10:00:00Z',
            updatedAt: '2026-09-15T12:00:00Z',
          } as any,
        ],
        tasks: mockTasks,
        openTasks: mockTasks,
        blockedTasks: [],
        todayAttendance: {
          id: 'att-1',
          organizationId: 'org-test',
          personId: 'emp-1',
          date: '2026-09-16',
          status: 'present',
          checkIn: '2026-09-16T09:00:00Z',
          totalMinutes: 240,
          createdAt: '2026-09-16T09:00:00Z',
          updatedAt: '2026-09-16T09:00:00Z',
        } as any,
        currentTimesheet: null as any,
        timesheets: [],
        attendanceRecords: [],
        projects: [],
        leaveBalances: [
          {
            id: 'bal-1',
            organizationId: 'org-test',
            personId: 'emp-1',
            leaveTypeId: 'type-annual',
            year: 2026,
            allocatedDays: 20,
            usedDays: 5,
            pendingDays: 2,
            availableDays: 13,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          } as any,
        ],
        upcomingMeetings: [],
        evaluations: [],
        isLoading: false,
      } as any);

      renderWithProviders(<EmployeeDashboardView />);

      expect(screen.getByText('Employee Workspace')).toBeInTheDocument();
      expect(screen.getByText('Recent Contributions')).toBeInTheDocument();
      expect(screen.getByText('Implemented OAuth Flow')).toBeInTheDocument();
      expect(screen.getByText('My Assigned Tasks')).toBeInTheDocument();
      expect(screen.getByText('Fix tenant resolution middleware')).toBeInTheDocument();
      expect(screen.getByText("Today's Attendance")).toBeInTheDocument();
      expect(screen.getByText('Leave Balance')).toBeInTheDocument();
      expect(screen.getByText('13 days')).toBeInTheDocument();
    });
  });

  describe('Employee Work Ledger', () => {
    it('renders work ledger, lists records, and triggers work modal', () => {
      const mockCreateWork = vi.fn().mockResolvedValue({});
      const mockSubmitWork = vi.fn().mockResolvedValue({});

      vi.spyOn(employeeWorkHook, 'useEmployeeWork').mockReturnValue({
        workRecords: [
          {
            id: 'work-1',
            organizationId: 'org-test',
            personId: 'emp-1',
            categoryId: 'cat-1',
            projectId: 'proj-1',
            title: 'Drafted Backend API spec',
            description: 'API design draft',
            durationMinutes: 90,
            status: 'draft',
            createdAt: '2026-09-15T08:00:00Z',
            updatedAt: '2026-09-15T09:30:00Z',
          } as any,
        ],
        categories: [{ id: 'cat-1', name: 'Software Development', slug: 'dev' } as any],
        projects: [{ id: 'proj-1', name: 'DeVoc OS Platform', code: 'DEVOC' } as any],
        isLoading: false,
        createWork: mockCreateWork,
        submitWork: mockSubmitWork,
      } as any);

      renderWithProviders(<EmployeeWorkView />);

      expect(screen.getByText('My Work')).toBeInTheDocument();
      expect(screen.getByText('Drafted Backend API spec')).toBeInTheDocument();
      expect(screen.getByText('Log Contribution')).toBeInTheDocument();

      // Open Log Contribution modal
      fireEvent.click(screen.getByText('Log Contribution'));
      expect(screen.getByText('Log Work Contribution')).toBeInTheDocument();
    });
  });

  describe('Employee Tasks', () => {
    it('renders tasks view and allows inspecting task details', () => {
      const mockTransition = vi.fn().mockResolvedValue({});

      vi.spyOn(employeeTasksHook, 'useEmployeeTasks').mockReturnValue({
        tasks: [
          {
            id: 'task-42',
            organizationId: 'org-test',
            projectId: 'proj-1',
            taskKey: 'DEV-42',
            title: 'Implement Tenant Isolation Query Check',
            description: 'Ensure all db queries filter by organization_id',
            taskType: 'task',
            priority: 'critical',
            status: 'todo',
            createdAt: '2026-09-12T00:00:00Z',
            updatedAt: '2026-09-15T00:00:00Z',
          } as any,
        ],
        projects: [{ id: 'proj-1', name: 'DeVoc Platform', code: 'DEV' } as any],
        isLoading: false,
        transitionStatus: mockTransition,
        loadDependencies: vi.fn().mockResolvedValue([]),
      } as any);

      renderWithProviders(<EmployeeTasksView />);

      expect(screen.getByText('My Tasks')).toBeInTheDocument();
      expect(screen.getByText('Implement Tenant Isolation Query Check')).toBeInTheDocument();
      expect(screen.getByText('DEV-42')).toBeInTheDocument();
    });
  });

  describe('Attendance and Timesheets', () => {
    it('renders attendance summary and triggers check-in', async () => {
      const mockCheckIn = vi.fn().mockResolvedValue({});
      const mockCheckOut = vi.fn().mockResolvedValue({});

      vi.spyOn(employeeAttendanceHook, 'useEmployeeAttendance').mockReturnValue({
        attendanceRecords: [],
        todayRecord: null,
        isLoading: false,
        checkIn: mockCheckIn,
        checkOut: mockCheckOut,
      } as any);

      renderWithProviders(<EmployeeAttendanceView />);

      expect(screen.getByText('Attendance Tracking')).toBeInTheDocument();
      expect(screen.getByText('Clock In')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clock In'));
      await waitFor(() => {
        expect(mockCheckIn).toHaveBeenCalled();
      });
    });

    it('renders weekly timesheets and supports submission', async () => {
      const mockSubmitTimesheet = vi.fn().mockResolvedValue({});

      vi.spyOn(employeeTimesheetsHook, 'useEmployeeTimesheets').mockReturnValue({
        timesheets: [],
        currentTimesheet: {
          id: 'ts-1',
          organizationId: 'org-test',
          personId: 'emp-1',
          periodStart: '2026-09-14',
          periodEnd: '2026-09-20',
          totalMinutes: 2400,
          regularMinutes: 2400,
          overtimeMinutes: 0,
          status: 'draft',
          entries: [
            {
              id: 'ent-1',
              timesheetId: 'ts-1',
              date: '2026-09-14',
              durationMinutes: 480,
              entryType: 'regular',
              description: 'Frontend implementation',
            },
          ],
          createdAt: '2026-09-14T00:00:00Z',
          updatedAt: '2026-09-16T00:00:00Z',
        } as any,
        isLoading: false,
        submitTimesheet: mockSubmitTimesheet,
      } as any);

      renderWithProviders(<EmployeeTimesheetsView />);

      expect(screen.getByText('Weekly Timesheets')).toBeInTheDocument();
      expect(screen.getByText('Regular Hours')).toBeInTheDocument();
      expect(screen.getByText('Submit Weekly Timesheet')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Submit Weekly Timesheet'));
      await waitFor(() => {
        expect(mockSubmitTimesheet).toHaveBeenCalledWith('ts-1');
      });
    });
  });

  describe('Leave Management and Evaluations', () => {
    it('renders leave balances and displays leave request history', () => {
      vi.spyOn(employeeLeaveHook, 'useEmployeeLeave').mockReturnValue({
        balances: [
          {
            id: 'bal-1',
            organizationId: 'org-test',
            personId: 'emp-1',
            leaveTypeId: 'type-1',
            year: 2026,
            allocatedDays: 24,
            usedDays: 4,
            pendingDays: 0,
            availableDays: 20,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          } as any,
        ],
        leaveTypes: [
          {
            id: 'type-1',
            organizationId: 'org-test',
            name: 'Annual Vacation',
            code: 'ANNUAL',
            daysPerYear: 24,
            isPaid: true,
            requiresApproval: true,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          } as any,
        ],
        requests: [
          {
            id: 'req-1',
            organizationId: 'org-test',
            personId: 'emp-1',
            leaveTypeId: 'type-1',
            startDate: '2026-10-01',
            endDate: '2026-10-05',
            requestedDays: 3,
            status: 'approved',
            reason: 'Family event',
            createdAt: '2026-09-10T00:00:00Z',
            updatedAt: '2026-09-12T00:00:00Z',
          } as any,
        ],
        isLoading: false,
        requestLeave: vi.fn().mockResolvedValue({}),
      } as any);

      renderWithProviders(<EmployeeLeaveView />);

      expect(screen.getByText('Leave Management')).toBeInTheDocument();
      expect(screen.getAllByText('Annual Vacation').length).toBeGreaterThan(0);
      expect(screen.getByText('Family event')).toBeInTheDocument();
      expect(screen.getByText('Request Leave')).toBeInTheDocument();
    });

    it('renders evaluations and feedback', async () => {
      vi.spyOn(evaluationApi, 'listEvaluations').mockResolvedValue([
        {
          id: 'eval-1',
          organizationId: 'org-test',
          evaluateeId: 'emp-1',
          evaluatorId: 'lead-1',
          evaluationType: 'employee_performance',
          status: 'completed',
          periodStart: '2026-06-01',
          periodEnd: '2026-08-31',
          qualitativeSummary: 'Strong execution on architecture foundations and reliability.',
          criteriaScores: { code_quality: 4.8, ownership: 5.0 },
          recommendations: 'Continue mentoring junior engineers.',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-02T00:00:00Z',
        } as any,
      ]);

      renderWithProviders(<EmployeeEvaluationsView />);

      expect(screen.getByText('Performance Reviews & Evaluations')).toBeInTheDocument();
    });
  });
});
