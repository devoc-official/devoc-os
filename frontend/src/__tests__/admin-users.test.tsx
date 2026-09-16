import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminUsersView } from '../features/admin/views/admin-users-view';
import * as adminUsersHook from '../features/admin/hooks/use-admin-users';
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

describe('admin-users.test.tsx (M12 Membership & Access Administration)', () => {
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

  it('renders user table with identity accounts and linked person separation', () => {
    vi.spyOn(adminUsersHook, 'useAdminUsers').mockReturnValue({
      members: [
        {
          userId: 'usr-1',
          email: 'linus@devoc.internal',
          fullName: 'Linus Torvalds',
          role: 'org_admin',
          status: 'active',
          linkedPerson: { id: 'p-1', firstName: 'Linus', lastName: 'Torvalds' },
        },
        {
          userId: 'usr-2',
          email: 'unlinked@devoc.internal',
          fullName: 'Unlinked Auth User',
          role: 'member',
          status: 'active',
          linkedPerson: null,
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

    expect(screen.getByText('Users & Access Administration')).toBeInTheDocument();
    expect(screen.getByText('linus@devoc.internal')).toBeInTheDocument();
    expect(screen.getAllByText('Linus Torvalds').length).toBe(2);
    expect(screen.getByText('Unlinked Auth User')).toBeInTheDocument();
  });

  it('handles invite member dialog flow', () => {
    const inviteMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminUsersHook, 'useAdminUsers').mockReturnValue({
      members: [],
      people: [],
      isLoading: false,
      inviteMember: inviteMock,
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

    const inviteBtn = screen.getByRole('button', { name: /invite user/i });
    fireEvent.click(inviteBtn);

    expect(screen.getByText('Invite Organization Member')).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText('colleague@example.com');
    fireEvent.change(emailInput, { target: { value: 'newmember@devoc.internal' } });

    const submitBtn = screen.getByRole('button', { name: /send invitation/i });
    fireEvent.click(submitBtn);

    expect(inviteMock).toHaveBeenCalledWith({ email: 'newmember@devoc.internal', role: 'org_member' });
  });

  it('allows unlinking a linked person with confirmation safety', () => {
    const unlinkMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminUsersHook, 'useAdminUsers').mockReturnValue({
      members: [
        {
          userId: 'usr-1',
          email: 'linus@devoc.internal',
          fullName: 'Linus Torvalds',
          role: 'org_admin',
          status: 'active',
          linkedPerson: { id: 'p-1', firstName: 'Linus', lastName: 'Torvalds' },
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
      unlinkUser: unlinkMock,
      isUnlinkingUser: false,
    });

    renderWithClient(<AdminUsersView />);

    const unlinkBtn = screen.getByTitle('Unlink from Person profile');
    fireEvent.click(unlinkBtn);

    expect(unlinkMock).toHaveBeenCalledWith('p-1');
  });
});
