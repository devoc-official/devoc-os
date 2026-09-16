import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboardView } from '../features/admin/views/admin-dashboard-view';
import * as adminDashHook from '../features/admin/hooks/use-admin-dashboard';
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

describe('admin-dashboard.test.tsx (M12 Administrative Command Center)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-admin', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@devoc.internal' },
      currentOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      activeOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  it('renders loading skeleton when administrative data is loading', () => {
    vi.spyOn(adminDashHook, 'useAdminDashboard').mockReturnValue({
      organization: undefined,
      settings: undefined,
      members: [],
      activeMembers: [],
      pendingOrInvitedMembers: [],
      suspendedMembers: [],
      branches: [],
      businessUnits: [],
      departments: [],
      teams: [],
      people: [],
      roles: [],
      features: [],
      enabledFeatures: [],
      recentAuditLogs: [],
      attentionItems: [],
      isLoading: true,
    } as any);

    const { container } = renderWithClient(<AdminDashboardView />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders organization overview, access metrics, and real attention items', () => {
    vi.spyOn(adminDashHook, 'useAdminDashboard').mockReturnValue({
      organization: { id: 'org-test', name: 'DeVoc Enterprise', slug: 'devoc-enterprise', status: 'active' } as any,
      settings: { timezone: 'Europe/London', currency: 'GBP' } as any,
      members: [
        { userId: 'usr-1', email: 'admin@devoc.internal', fullName: 'System Admin', role: 'org_admin', status: 'active' },
        { userId: 'usr-2', email: 'unlinked@devoc.internal', fullName: 'Unlinked Identity', role: 'member', status: 'active' },
      ] as any,
      activeMembers: [{ userId: 'usr-1' }, { userId: 'usr-2' }] as any,
      pendingOrInvitedMembers: [],
      suspendedMembers: [],
      branches: [{ id: 'br-1', name: 'London HQ', code: 'LON', status: 'active' }] as any,
      businessUnits: [{ id: 'bu-1', name: 'Academy', code: 'ACAD', status: 'active' }] as any,
      departments: [{ id: 'd-1', name: 'Mentorship', code: 'MENT' }] as any,
      teams: [{ id: 't-1', name: 'Web Core', code: 'WEB' }] as any,
      people: [{ id: 'p-1', firstName: 'Alan', lastName: 'Turing' }] as any,
      roles: [{ id: 'r-1', name: 'Administrator', code: 'ROLE-ADMIN' }] as any,
      features: [
        { featureKey: 'workforce.timesheets', isEnabled: true },
        { featureKey: 'learning.curriculum', isEnabled: false },
      ] as any,
      enabledFeatures: [{ featureKey: 'workforce.timesheets', isEnabled: true }] as any,
      recentAuditLogs: [
        {
          id: 'log-1',
          action: 'MEMBER_INVITED',
          entityType: 'membership',
          entityId: 'mem-1',
          actorId: 'usr-admin',
          createdAt: new Date().toISOString(),
        },
      ] as any,
      attentionItems: [
        {
          id: 'att-unlinked-users',
          category: 'access',
          title: '1 Unlinked User Identity Account',
          description: 'Active login accounts exist without an associated operational Person profile.',
          severity: 'warning',
          actionHref: '/admin/users',
          actionLabel: 'Link Person',
        },
      ],
      isLoading: false,
    } as any);

    renderWithClient(<AdminDashboardView />);

    // Header
    expect(screen.getByText('System Administration')).toBeInTheDocument();
    expect(screen.getByText('DeVoc Enterprise')).toBeInTheDocument();

    // Metric counts
    expect(screen.getByText('1 Unlinked User Identity Account')).toBeInTheDocument();
    expect(screen.getByText('MEMBER_INVITED')).toBeInTheDocument();
  });

  it('renders quick action links to settings, audit, and administrative domains', () => {
    vi.spyOn(adminDashHook, 'useAdminDashboard').mockReturnValue({
      organization: { id: 'org-test', name: 'DeVoc Enterprise' } as any,
      settings: { timezone: 'UTC' } as any,
      members: [],
      activeMembers: [],
      pendingOrInvitedMembers: [],
      suspendedMembers: [],
      branches: [],
      businessUnits: [],
      departments: [],
      teams: [],
      people: [],
      roles: [],
      features: [],
      enabledFeatures: [],
      recentAuditLogs: [],
      attentionItems: [],
      isLoading: false,
    } as any);

    renderWithClient(<AdminDashboardView />);

    expect(screen.getByRole('link', { name: /audit stream/i })).toHaveAttribute('href', '/admin/audit');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/admin/settings');
  });
});
