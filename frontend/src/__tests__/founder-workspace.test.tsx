import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FounderDashboardView } from '../features/founder/views/founder-dashboard-view';
import { FounderOrganizationView } from '../features/founder/views/founder-organization-view';
import { FounderPeopleView } from '../features/founder/views/founder-people-view';
import { FounderAcademyView } from '../features/founder/views/founder-academy-view';
import { FounderFinanceView } from '../features/founder/views/founder-finance-view';
import { FounderWorkforceView } from '../features/founder/views/founder-workforce-view';
import { FounderRecruitmentView } from '../features/founder/views/founder-recruitment-view';
import { FounderAdminView } from '../features/founder/views/founder-admin-view';

import * as founderDashHook from '../features/founder/hooks/use-founder-dashboard';
import * as founderOrgHook from '../features/founder/hooks/use-founder-organization';
import * as founderPeopleHook from '../features/founder/hooks/use-founder-people';
import * as founderAcademyHook from '../features/founder/hooks/use-founder-academy';
import * as founderFinanceHook from '../features/founder/hooks/use-founder-finance';
import * as founderRecruitmentHook from '../features/founder/hooks/use-founder-recruitment';
import * as founderAdminHook from '../features/founder/hooks/use-founder-admin';
import * as authHook from '../auth/use-auth';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('F5 Founder Experience Views (AGENTS.md Sections 4, 5, 20)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-founder', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@devoc.internal' },
      currentOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      activeOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  it('renders FounderDashboardView with executive KPI cards and operational attention signals', () => {
    vi.spyOn(founderDashHook, 'useFounderDashboard').mockReturnValue({
      activePeople: [{ id: 'p-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@devoc.internal' }] as any,
      roles: [],
      businessUnits: [{ id: 'bu-1', name: 'Software Development' }] as any,
      activeProjects: [{ id: 'prj-1', name: 'Core OS' }] as any,
      blockedTasks: [],
      pendingWorkApprovals: [],
      totalContributionHours: '120.0',
      activeEnrollments: [{ id: 'en-1' }] as any,
      programs: [{ id: 'prog-1' }] as any,
      openPositions: [{ id: 'pos-1' }] as any,
      applications: [],
      totalRevenueInflow: 50000,
      outstandingReceivables: 12000,
      pendingTimesheets: [],
      attentionItems: [
        {
          id: 'test-att',
          title: 'Uncollected Invoices',
          description: '3 invoices past due date',
          severity: 'warning',
          actionHref: '/finance',
          actionLabel: 'Reconcile',
          category: 'finance',
        },
      ],
      isLoading: false,
    } as any);

    renderWithClient(<FounderDashboardView />);
    expect(screen.getByText(/Founder Executive Command Center/i)).toBeInTheDocument();
    expect(screen.getByText(/Uncollected Invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/across 1 BUs/i)).toBeInTheDocument();
  });

  it('renders FounderOrganizationView with branches and configurable business units', () => {
    vi.spyOn(founderOrgHook, 'useFounderOrganization').mockReturnValue({
      branches: [
        { id: 'br-1', organizationId: 'org-test', name: 'London HQ', code: 'LON-HQ', address: 'London, UK', status: 'active' },
      ] as any,
      businessUnits: [
        { id: 'bu-1', organizationId: 'org-test', name: 'Engineering', code: 'ENG', status: 'active' },
      ] as any,
      departments: [],
      teams: [],
      isLoading: false,
    } as any);

    renderWithClient(<FounderOrganizationView />);
    expect(screen.getByText(/Organizational Architecture/i)).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    const branchesTab = screen.getByRole('tab', { name: /branches/i });
    fireEvent.click(branchesTab);
    expect(screen.getByText('London HQ')).toBeInTheDocument();
  });

  it('renders FounderPeopleView with executive filters and cross-role directory', () => {
    vi.spyOn(founderPeopleHook, 'useFounderPeople').mockReturnValue({
      people: [
        { id: 'p-1', firstName: 'Alan', lastName: 'Turing', email: 'alan@devoc.internal', status: 'active' },
      ] as any,
      roles: [],
      employments: [
        { id: 'emp-1', personId: 'p-1', jobTitle: 'Principal Cryptanalyst', employmentType: 'full_time', status: 'active' },
      ] as any,
      assignments: [],
      businessUnits: [],
      buMap: new Map(),
      workRecords: [],
      isLoading: false,
    });

    renderWithClient(<FounderPeopleView />);
    expect(screen.getByText(/Executive Talent & People Directory/i)).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.getByText('Principal Cryptanalyst')).toBeInTheDocument();
  });

  it('renders FounderAcademyView with tuition economics and fee obligations', () => {
    vi.spyOn(founderAcademyHook, 'useFounderAcademy').mockReturnValue({
      programs: [{ id: 'prog-1', name: 'Full-Stack Bootcamp', code: 'FS-2026', status: 'active' }] as any,
      enrollments: [{ id: 'en-1', status: 'active', personId: 'p-1', learningProgramId: 'prog-1' }] as any,
      activeStudents: [{ id: 'en-1', status: 'active' }] as any,
      completedStudents: [],
      pausedStudents: [],
      mentors: [{ id: 'p-1', firstName: 'Margaret', lastName: 'Hamilton' }] as any,
      mentorAssignments: [],
      peopleMap: new Map([['p-1', 'Ada Student']]),
      programMap: new Map([['prog-1', 'Full-Stack Bootcamp']]),
      obligations: [
        { id: 'ob-1', title: 'Bootcamp Tuition Fee', currency: 'USD', netAmount: 5000, balanceAmount: 1500, state: 'PartiallyPaid' },
      ] as any,
      totalFeeGross: 5000,
      totalFeeCollected: 3500,
      totalFeeOutstanding: 1500,
      isLoading: false,
    } as any);

    renderWithClient(<FounderAcademyView />);
    expect(screen.getByText(/Academy Operations & Economics/i)).toBeInTheDocument();
    expect(screen.getByText(/Ada Student/i)).toBeInTheDocument();
    expect(screen.getByText(/Full-Stack Bootcamp/i)).toBeInTheDocument();
    expect(screen.getByText(/3,500/i)).toBeInTheDocument();
  });

  it('renders FounderFinanceView with cash flow, obligations, and budgets', () => {
    vi.spyOn(founderFinanceHook, 'useFounderFinance').mockReturnValue({
      categories: [],
      obligations: [
        { id: 'ob-12345678', title: 'Q3 Cloud Infrastructure', direction: 'payable', currency: 'USD', netAmount: 12000, balanceAmount: 0, state: 'Paid' },
      ] as any,
      transactions: [],
      budgets: [
        { id: 'bdg-1', periodName: '2026 Q3', budgetAmount: 150000, periodStart: '2026-07-01', periodEnd: '2026-09-30' },
      ] as any,
      businessUnits: [],
      buMap: new Map(),
      totalInflow: 85000,
      totalOutflow: 30000,
      netCashFlow: 55000,
      totalReceivables: 25000,
      outstandingReceivables: 8000,
      totalPayables: 12000,
      outstandingPayables: 0,
      overdueObligations: [],
      totalBudgeted: 150000,
      isLoading: false,
    });

    renderWithClient(<FounderFinanceView />);
    expect(screen.getByText(/Executive Finance & Operational Health/i)).toBeInTheDocument();
    expect(screen.getByText(/\$55,000/i)).toBeInTheDocument();
    expect(screen.getByText(/Q3 Cloud Infrastructure/i)).toBeInTheDocument();
  });

  it('renders FounderWorkforceView with talent capacity load monitoring and overload detection', () => {
    vi.spyOn(founderPeopleHook, 'useFounderPeople').mockReturnValue({
      people: [
        { id: 'p-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@devoc.internal' },
      ] as any,
      roles: [],
      employments: [],
      assignments: [
        {
          id: 'asg-1',
          personId: 'p-1',
          targetType: 'project',
          targetId: 'prj-1',
          roleContext: 'Lead Architect',
          capacityValue: 45,
          capacityUnit: 'hours_per_week',
          status: 'active',
          startAt: '2026-08-01T00:00:00Z',
        } as any,
      ],
      businessUnits: [{ id: 'bu-1', name: 'Systems' }] as any,
      buMap: new Map([['bu-1', 'Systems']]),
      workRecords: [],
      isLoading: false,
    });

    renderWithClient(<FounderWorkforceView />);
    expect(screen.getByText(/Workforce & Talent Allocation/i)).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText(/Capacity Allocation Warning/i)).toBeInTheDocument();
  });

  it('renders FounderRecruitmentView with open requisitions and candidate applications', () => {
    vi.spyOn(founderRecruitmentHook, 'useFounderRecruitment').mockReturnValue({
      positions: [
        { id: 'pos-1', code: 'ENG-SR', title: 'Senior Distributed Systems Engineer', employmentType: 'full_time', openingsCount: 2, status: 'open' },
      ] as any,
      openPositions: [{ id: 'pos-1' }] as any,
      candidates: [],
      stages: [],
      applications: [],
      activeApplications: [],
      hiredApplications: [],
      isLoading: false,
    });

    renderWithClient(<FounderRecruitmentView />);
    expect(screen.getByText(/Talent Acquisition & Recruitment Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText('Senior Distributed Systems Engineer')).toBeInTheDocument();
  });

  it('renders FounderAdminView with tenant configuration, members, and audit log', () => {
    vi.spyOn(founderAdminHook, 'useFounderAdmin').mockReturnValue({
      settings: {
        organizationId: 'org-test-12345',
        defaultCurrency: 'USD',
        timeZone: 'UTC',
      } as any,
      members: [
        { userId: 'usr-1', fullName: 'Ada Lovelace', email: 'ada@devoc.internal', role: 'org_admin', status: 'active', joinedAt: '2026-01-01T00:00:00Z' },
      ] as any,
      features: [
        { featureKey: 'beta_learning_engine', isEnabled: true, description: 'Self-paced learning journey' },
      ] as any,
      auditLogs: [],
      isLoading: false,
    });

    renderWithClient(<FounderAdminView />);
    expect(screen.getByText(/Tenant Administration & Security Governance/i)).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });
});
