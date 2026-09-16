import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AdminDashboardView } from '../features/admin/views/admin-dashboard-view';
import { AdminOrganizationView } from '../features/admin/views/admin-organization-view';
import { AdminUsersView } from '../features/admin/views/admin-users-view';
import { AdminPeopleView } from '../features/admin/views/admin-people-view';
import { AdminStructureView } from '../features/admin/views/admin-structure-view';
import { AdminRolesView } from '../features/admin/views/admin-roles-view';
import { AdminMasterDataView } from '../features/admin/views/admin-master-data-view';
import { AdminFeaturesView } from '../features/admin/views/admin-features-view';
import { AdminSettingsView } from '../features/admin/views/admin-settings-view';
import { AdminAuditView } from '../features/admin/views/admin-audit-view';

import * as adminDashHook from '../features/admin/hooks/use-admin-dashboard';
import * as adminOrgHook from '../features/admin/hooks/use-admin-organization';
import * as adminUsersHook from '../features/admin/hooks/use-admin-users';
import * as adminPeopleHook from '../features/admin/hooks/use-admin-people';
import * as adminStructureHook from '../features/admin/hooks/use-admin-structure';
import * as adminRolesHook from '../features/admin/hooks/use-admin-roles';
import * as adminMasterDataHook from '../features/admin/hooks/use-admin-master-data';
import * as adminFeaturesHook from '../features/admin/hooks/use-admin-features';
import * as adminSettingsHook from '../features/admin/hooks/use-admin-settings';
import * as adminAuditHook from '../features/admin/hooks/use-admin-audit';
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

describe('F6 Admin & Operations Experience (M12 Platform Administration)', () => {
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

  it('renders AdminDashboardView with executive administrative metrics and attention items', () => {
    vi.spyOn(adminDashHook, 'useAdminDashboard').mockReturnValue({
      organization: { id: 'org-test', name: 'DeVoc Official', slug: 'devoc-official', status: 'active' } as any,
      settings: { timezone: 'UTC', currency: 'USD' } as any,
      members: [
        { userId: 'usr-1', email: 'test@devoc.internal', fullName: 'Test User', role: 'org_admin', status: 'active' },
      ] as any,
      activeMembers: [{ userId: 'usr-1' }] as any,
      pendingOrInvitedMembers: [],
      suspendedMembers: [],
      orgAdmins: [{ userId: 'usr-1' }] as any,
      unlinkedMembers: [
        { userId: 'usr-unlinked', email: 'unlinked@devoc.internal', fullName: 'Unlinked Member', linkedPerson: null },
      ] as any,
      branches: [{ id: 'br-1', name: 'London HQ', code: 'LON-01', status: 'active' }] as any,
      businessUnits: [{ id: 'bu-1', name: 'Core Engine', code: 'CORE', status: 'active' }] as any,
      activeBusinessUnits: [{ id: 'bu-1' }] as any,
      departments: [],
      teams: [],
      people: [{ id: 'p-1', firstName: 'Ada', lastName: 'Lovelace' }] as any,
      roles: [{ id: 'r-1', name: 'Administrator', code: 'ROLE-ADMIN' }] as any,
      features: [{ featureKey: 'learning.mentorship', isEnabled: true }] as any,
      enabledFeatures: [{ featureKey: 'learning.mentorship', isEnabled: true }] as any,
      recentAuditLogs: [
        {
          id: 'log-1',
          action: 'ORGANIZATION_PROFILE_UPDATED',
          entityType: 'organization',
          entityId: 'org-test',
          actorId: 'usr-admin',
          createdAt: new Date().toISOString(),
        },
      ] as any,
      attentionItems: [
        {
          id: 'att-unlinked',
          category: 'access',
          title: '1 Unlinked User Identity Account',
          description: 'Active login accounts exist without an associated operational Person profile.',
          severity: 'warning',
          actionHref: '/admin/users',
          actionLabel: 'Link Person',
        },
      ],
      isLoading: false,
    });

    renderWithClient(<AdminDashboardView />);
    expect(screen.getByText(/System Administration/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Unlinked User Identity Account/i)).toBeInTheDocument();
    expect(screen.getByText('ORGANIZATION_PROFILE_UPDATED')).toBeInTheDocument();
  });

  it('renders AdminOrganizationView with organization metadata and branch structure', () => {
    vi.spyOn(adminOrgHook, 'useAdminOrganization').mockReturnValue({
      organization: { id: 'org-test', name: 'DeVoc Enterprise', slug: 'devoc-enterprise', status: 'active', domain: 'devoc.internal' } as any,
      settings: { timezone: 'UTC', locale: 'en-US', currency: 'USD', dateFormat: 'YYYY-MM-DD', timeFormat: '24h' } as any,
      branches: [{ id: 'br-1', name: 'London Campus', code: 'LON', location: 'London, UK', status: 'active' }] as any,
      isLoading: false,
      error: null,
      updateProfile: vi.fn(),
      isUpdatingProfile: false,
      updateSettings: vi.fn(),
      isUpdatingSettings: false,
    });

    renderWithClient(<AdminOrganizationView />);
    expect(screen.getByText(/Organization Profile & Architecture/i)).toBeInTheDocument();
    expect(screen.getByText('DeVoc Enterprise')).toBeInTheDocument();
    expect(screen.getByText('London Campus')).toBeInTheDocument();
  });

  it('renders AdminUsersView with membership management and invite modal', () => {
    vi.spyOn(adminUsersHook, 'useAdminUsers').mockReturnValue({
      members: [
        {
          userId: 'usr-1',
          email: 'admin@devoc.internal',
          fullName: 'Grace Hopper',
          role: 'org_admin',
          status: 'active',
          linkedPerson: { id: 'p-1', firstName: 'Grace', lastName: 'Hopper' },
        },
      ] as any,
      people: [],
      isLoading: false,
      inviteMember: vi.fn(),
      isInviting: false,
      updateMemberRole: vi.fn(),
      isUpdatingRole: false,
      updateMemberStatus: vi.fn(),
      isUpdatingStatus: false,
      linkUser: vi.fn(),
      isLinkingUser: false,
      unlinkUser: vi.fn(),
      isUnlinkingUser: false,
    });

    renderWithClient(<AdminUsersView />);
    expect(screen.getByText(/Users & Access Administration/i)).toBeInTheDocument();
    expect(screen.getByText('admin@devoc.internal')).toBeInTheDocument();
    expect(screen.getByText('Organization Admin')).toBeInTheDocument();
  });

  it('renders AdminPeopleView with personnel records and contextual role assignments', () => {
    vi.spyOn(adminPeopleHook, 'useAdminPeople').mockReturnValue({
      people: [
        { id: 'p-1', firstName: 'Alan', lastName: 'Turing', email: 'alan@devoc.internal', status: 'active', userId: 'usr-alan' },
      ] as any,
      employments: [
        { id: 'emp-1', personId: 'p-1', jobTitle: 'Chief Scientist', employmentType: 'full_time', status: 'active' },
      ] as any,
      employmentMap: new Map([
        ['p-1', { id: 'emp-1', personId: 'p-1', jobTitle: 'Chief Scientist', employmentType: 'full_time', status: 'active' }],
      ]) as any,
      roles: [{ id: 'r-1', name: 'Lead Architect', code: 'ROLE-ARCHITECT' }] as any,
      businessUnits: [{ id: 'bu-1', name: 'Research' }] as any,
      buMap: new Map([['bu-1', 'Research']]),
      departments: [],
      deptMap: new Map(),
      teams: [],
      teamMap: new Map(),
      members: [],
      isLoading: false,
      assignRole: vi.fn(),
      isAssigningRole: false,
      endRole: vi.fn(),
      isEndingRole: false,
      linkUser: vi.fn(),
      isLinkingUser: false,
      unlinkUser: vi.fn(),
      isUnlinkingUser: false,
    });

    renderWithClient(<AdminPeopleView />);
    expect(screen.getByText(/People & Operational Identities/i)).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.getByText('Chief Scientist')).toBeInTheDocument();
  });

  it('renders AdminStructureView with tab switching across business units, branches, and teams', () => {
    vi.spyOn(adminStructureHook, 'useAdminStructure').mockReturnValue({
      branches: [{ id: 'br-1', name: 'Berlin Lab', code: 'BER-01', status: 'active' }] as any,
      businessUnits: [{ id: 'bu-1', name: 'Core Platform', code: 'CORE', status: 'active' }] as any,
      departments: [{ id: 'dept-1', name: 'Infrastructure', code: 'INFRA', businessUnitId: 'bu-1' }] as any,
      teams: [{ id: 't-1', name: 'Database Pod', code: 'POD-DB', businessUnitId: 'bu-1' }] as any,
      people: [],
      peopleMap: new Map(),
      buMap: new Map([['bu-1', 'Core Platform']]),
      deptMap: new Map([['dept-1', 'Infrastructure']]),
      isLoading: false,
      createBranch: vi.fn(),
      updateBranch: vi.fn(),
      createBusinessUnit: vi.fn(),
      updateBusinessUnit: vi.fn(),
      createDepartment: vi.fn(),
      updateDepartment: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });

    renderWithClient(<AdminStructureView />);
    expect(screen.getByText(/Business Structure Administration/i)).toBeInTheDocument();
    expect(screen.getByText('Core Platform')).toBeInTheDocument();

    const branchesTab = screen.getByRole('tab', { name: /branches/i });
    fireEvent.click(branchesTab);
    expect(screen.getByText('Berlin Lab')).toBeInTheDocument();
  });

  it('renders AdminRolesView with system role directory and capability matrix', () => {
    vi.spyOn(adminRolesHook, 'useAdminRoles').mockReturnValue({
      roles: [
        { id: 'r-admin', name: 'Administrator', code: 'ROLE-ADMIN', description: 'Full tenant administration' },
        { id: 'r-dev', name: 'Developer', code: 'ROLE-DEVELOPER', description: 'Core software engineering' },
      ] as any,
      capabilities: [
        { code: 'platform:admin', name: 'Platform Administrator', description: 'System-wide platform root', scope: 'organization', module: 'admin' },
        { code: 'structure:manage', name: 'Structure Manager', description: 'Manage Business Units and teams', scope: 'organization', module: 'organization' },
      ],
      members: [],
      isLoading: false,
    });

    renderWithClient(<AdminRolesView />);
    expect(screen.getByText(/Roles & Capability Governance/i)).toBeInTheDocument();
    expect(screen.getByText('ROLE-ADMIN')).toBeInTheDocument();
    expect(screen.getByText('platform:admin')).toBeInTheDocument();
  });

  it('renders AdminMasterDataView with work categories, meeting types, and evaluation templates', () => {
    vi.spyOn(adminMasterDataHook, 'useAdminMasterData').mockReturnValue({
      workCategories: [
        { id: 'wc-1', name: 'Architecture Review', code: 'ARCH_REV', description: 'RFC evaluation', isActive: true },
      ] as any,
      meetingTypes: [
        { id: 'mt-1', name: 'Sprint Retrospective', code: 'SPRINT_RETRO', description: 'End of sprint sync', isActive: true },
      ] as any,
      evaluationTemplates: [],
      financeCategories: [],
      skills: [],
      isLoading: false,
      createWorkCategory: vi.fn(),
      updateWorkCategory: vi.fn(),
      retireWorkCategory: vi.fn(),
      createMeetingType: vi.fn(),
      updateMeetingType: vi.fn(),
      retireMeetingType: vi.fn(),
      createEvaluationTemplate: vi.fn(),
      updateEvaluationTemplate: vi.fn(),
      createFinanceCategory: vi.fn(),
      updateFinanceCategory: vi.fn(),
      retireFinanceCategory: vi.fn(),
      createSkill: vi.fn(),
      updateSkill: vi.fn(),
    });

    renderWithClient(<AdminMasterDataView />);
    expect(screen.getByText(/Configurable Master Data/i)).toBeInTheDocument();
    expect(screen.getByText('Architecture Review')).toBeInTheDocument();

    const meetingTab = screen.getByRole('tab', { name: /meeting types/i });
    fireEvent.click(meetingTab);
    expect(screen.getByText('Sprint Retrospective')).toBeInTheDocument();
  });

  it('renders AdminFeaturesView with server-enforced feature flags and override controls', () => {
    vi.spyOn(adminFeaturesHook, 'useAdminFeatures').mockReturnValue({
      features: [
        {
          featureKey: 'workforce.timesheets',
          description: 'Weekly timesheet submission and managerial approvals',
          isEnabled: true,
          source: 'organization_override',
        },
      ] as any,
      isLoading: false,
      error: null,
      setFeatureOverride: vi.fn(),
      isSettingOverride: false,
      deleteFeatureOverride: vi.fn(),
      isDeletingOverride: false,
    });

    renderWithClient(<AdminFeaturesView />);
    expect(screen.getByText(/Feature Configuration & Toggles/i)).toBeInTheDocument();
    expect(screen.getByText('workforce.timesheets')).toBeInTheDocument();
    expect(screen.getByText('organization_override')).toBeInTheDocument();
  });

  it('renders AdminSettingsView with operational localization and currency options', () => {
    vi.spyOn(adminSettingsHook, 'useAdminSettings').mockReturnValue({
      settings: {
        organizationId: 'org-test',
        timezone: 'Europe/London',
        locale: 'en-GB',
        currency: 'GBP',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
      },
      branches: [],
      businessUnits: [],
      isLoading: false,
      error: null,
      updateSettings: vi.fn(),
      isUpdating: false,
    });

    renderWithClient(<AdminSettingsView />);
    expect(screen.getByRole('heading', { name: /Operational Settings/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Europe/London (GMT/BST)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('GBP (£ - British Pound)')).toBeInTheDocument();
  });

  it('renders AdminAuditView with immutable audit trail and query filters', () => {
    vi.spyOn(adminAuditHook, 'useAdminAudit').mockReturnValue({
      logs: [
        {
          id: 'log-sec-1',
          action: 'MEMBER_STATUS_UPDATED',
          entityType: 'membership',
          entityId: 'mem-1',
          actorId: 'usr-admin',
          createdAt: new Date().toISOString(),
          beforeState: { status: 'active' },
          afterState: { status: 'suspended' },
        },
      ] as any,
      filters: { limit: 50, offset: 0 },
      selectedLog: null,
      setSelectedLog: vi.fn(),
      isLoading: false,
      updateFilters: vi.fn(),
      resetFilters: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithClient(<AdminAuditView />);
    expect(screen.getByText(/Audit & Governance Trail/i)).toBeInTheDocument();
    expect(screen.getByText('MEMBER_STATUS_UPDATED')).toBeInTheDocument();
    expect(screen.getByText('membership')).toBeInTheDocument();
  });
});
