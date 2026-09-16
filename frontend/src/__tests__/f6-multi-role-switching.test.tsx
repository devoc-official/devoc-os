import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '../layouts/app-shell';
import { UnifiedDashboardView } from '../features/dashboard/unified-dashboard-view';
import * as roleContext from '../roles/role.context';
import * as authHook from '../auth/use-auth';
import * as adminDashHook from '../features/admin/hooks/use-admin-dashboard';
import * as founderDashHook from '../features/founder/hooks/use-founder-dashboard';
import { resolveRolesFromBackend } from '../roles/role-resolver';
import { ROLE_NAVIGATION_REGISTRY } from '../navigation/navigation.registry';

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

describe('F6 Multi-Role Switching & Admin Persona Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-admin-founder', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@devoc.internal' },
      currentOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      activeOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);

    vi.spyOn(adminDashHook, 'useAdminDashboard').mockReturnValue({
      organization: { id: 'org-test', name: 'DeVoc Official' } as any,
      settings: { timezone: 'UTC' } as any,
      members: [],
      activeMembers: [],
      pendingOrInvitedMembers: [],
      suspendedMembers: [],
      orgAdmins: [],
      unlinkedMembers: [],
      branches: [],
      businessUnits: [],
      activeBusinessUnits: [],
      departments: [],
      teams: [],
      people: [],
      roles: [],
      features: [],
      enabledFeatures: [],
      recentAuditLogs: [],
      attentionItems: [],
      isLoading: false,
    });

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
  });

  it('correctly resolves Admin role from PersonRole and organization membership', () => {
    // 1. From PersonRole code containing ADMIN
    const rolesFromPerson = resolveRolesFromBackend([
      {
        id: 'pr-1',
        organizationId: 'org-test',
        personId: 'p-1',
        roleId: 'r-admin',
        roleCode: 'ROLE-ADMIN',
        status: 'active',
        startDate: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    expect(rolesFromPerson.some((r) => r.category === 'admin')).toBe(true);

    // 2. From OrganizationMembership org_admin role
    const rolesFromMembership = resolveRolesFromBackend([], {
      membershipId: 'mem-1',
      organizationId: 'org-test',
      organizationName: 'DeVoc',
      organizationSlug: 'devoc',
      role: 'org_admin',
      status: 'active',
    });
    expect(rolesFromMembership.some((r) => r.category === 'admin')).toBe(true);
  });

  it('renders exact Section 3 primary navigation items when switched to Admin persona', () => {
    const adminNav = ROLE_NAVIGATION_REGISTRY.admin;
    expect(adminNav).toBeDefined();

    const items = adminNav.sections.flatMap((s) => s.items);
    const labels = items.map((i) => i.label);

    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Organization');
    expect(labels).toContain('Users & Access');
    expect(labels).toContain('People');
    expect(labels).toContain('Business Structure');
    expect(labels).toContain('Roles & Permissions');
    expect(labels).toContain('Master Data');
    expect(labels).toContain('Feature Configuration');
    expect(labels).toContain('Operational Settings');
    expect(labels).toContain('Audit');

    // Verify exact routes
    expect(items.find((i) => i.label === 'Dashboard')?.href).toBe('/admin');
    expect(items.find((i) => i.label === 'Organization')?.href).toBe('/admin/organization');
    expect(items.find((i) => i.label === 'Users & Access')?.href).toBe('/admin/users');
    expect(items.find((i) => i.label === 'Business Structure')?.href).toBe('/admin/structure');
    expect(items.find((i) => i.label === 'Master Data')?.href).toBe('/admin/master-data');
    expect(items.find((i) => i.label === 'Feature Configuration')?.href).toBe('/admin/features');
    expect(items.find((i) => i.label === 'Operational Settings')?.href).toBe('/admin/settings');
    expect(items.find((i) => i.label === 'Audit')?.href).toBe('/admin/audit');
  });

  it('renders AdminDashboardView when role switcher selects admin persona', () => {
    vi.spyOn(roleContext, 'useRole').mockReturnValue({
      currentRole: 'admin',
      activeRoles: [
        { category: 'admin', name: 'Administrator', code: 'ROLE-ADMIN', description: 'Admin' },
        { category: 'founder', name: 'Founder', code: 'ROLE-FOUNDER', description: 'Founder' },
      ],
      switchRole: vi.fn(),
      getRoleDetails: vi.fn(),
      isMultiRole: true,
      isLoading: false,
    });

    renderWithClient(<UnifiedDashboardView />);
    expect(screen.getByText(/System Administration/i)).toBeInTheDocument();
    expect(screen.getByText(/Administrative Modules/i)).toBeInTheDocument();
  });
});
