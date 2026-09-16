import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminPeopleView } from '../features/admin/views/admin-people-view';
import * as adminPeopleHook from '../features/admin/hooks/use-admin-people';
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

describe('admin-people.test.tsx (M2 & M12 People Administration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-admin', email: 'admin@devoc.internal' },
      currentOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      activeOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  it('renders personnel records and employment details', () => {
    vi.spyOn(adminPeopleHook, 'useAdminPeople').mockReturnValue({
      people: [
        { id: 'p-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@devoc.internal', status: 'active', userId: 'usr-grace' },
        { id: 'p-2', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@devoc.internal', status: 'active', userId: null },
      ] as any,
      employments: [
        { id: 'emp-1', personId: 'p-1', jobTitle: 'Chief Admiral', employmentType: 'full_time', status: 'active' },
      ] as any,
      employmentMap: new Map([
        ['p-1', { id: 'emp-1', personId: 'p-1', jobTitle: 'Chief Admiral', employmentType: 'full_time', status: 'active' }],
      ]) as any,
      roles: [{ id: 'r-1', name: 'Software Engineer', code: 'ROLE-DEV' }] as any,
      businessUnits: [{ id: 'bu-1', name: 'Platform Core' }] as any,
      buMap: new Map([['bu-1', 'Platform Core']]),
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

    expect(screen.getByText('People & Operational Identities')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Chief Admiral')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('handles contextual role assignment dialog flow', () => {
    const assignRoleMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminPeopleHook, 'useAdminPeople').mockReturnValue({
      people: [
        { id: 'p-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@devoc.internal', status: 'active', userId: 'usr-grace' },
      ] as any,
      employments: [],
      employmentMap: new Map(),
      roles: [
        { id: 'r-lead', name: 'Tech Lead', code: 'ROLE-LEAD' },
      ] as any,
      businessUnits: [{ id: 'bu-1', name: 'Platform Core' }] as any,
      buMap: new Map([['bu-1', 'Platform Core']]),
      departments: [],
      deptMap: new Map(),
      teams: [],
      teamMap: new Map(),
      members: [],
      isLoading: false,
      assignRole: assignRoleMock,
      isAssigningRole: false,
      endRole: vi.fn(),
      isEndingRole: false,
      linkUser: vi.fn(),
      isLinkingUser: false,
      unlinkUser: vi.fn(),
      isUnlinkingUser: false,
    });

    renderWithClient(<AdminPeopleView />);

    const assignBtn = screen.getByRole('button', { name: /assign role/i });
    fireEvent.click(assignBtn);

    expect(screen.getByText(/Assign Contextual Role/i)).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /assign role/i });
    fireEvent.click(submitBtn);

    expect(assignRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: 'p-1',
        roleId: 'r-lead',
      })
    );
  });
});
