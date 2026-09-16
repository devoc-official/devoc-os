import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminUsersView } from '../features/admin/views/admin-users-view';
import { AdminOrganizationView } from '../features/admin/views/admin-organization-view';
import * as adminUsersHook from '../features/admin/hooks/use-admin-users';
import * as adminOrgHook from '../features/admin/hooks/use-admin-organization';
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

describe('admin-permission-boundaries.test.tsx (Permission Boundaries & Error Handling)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-restricted', email: 'restricted@devoc.internal' },
      currentOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      activeOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  it('gracefully handles 403 Forbidden error on membership invitation', async () => {
    const inviteMock = vi.fn().mockRejectedValue(new Error('Forbidden: Insufficient membership:manage capability'));

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

    const emailInput = screen.getByPlaceholderText('colleague@example.com');
    fireEvent.change(emailInput, { target: { value: 'forbidden@devoc.internal' } });

    const submitBtn = screen.getByRole('button', { name: /send invitation/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Forbidden: Insufficient membership:manage capability')).toBeInTheDocument();
    });
  });

  it('gracefully handles 409 Conflict on duplicate organization profile or slug update', async () => {
    const updateProfileMock = vi.fn().mockRejectedValue(new Error('Conflict: Organization slug or name already exists in tenant scope'));

    vi.spyOn(adminOrgHook, 'useAdminOrganization').mockReturnValue({
      organization: { id: 'org-test', name: 'DeVoc Existing', slug: 'devoc-existing' } as any,
      settings: { timezone: 'UTC' } as any,
      branches: [],
      isLoading: false,
      updateProfile: updateProfileMock,
      isUpdatingProfile: false,
      updateSettings: vi.fn(),
      isUpdatingSettings: false,
    } as any);

    renderWithClient(<AdminOrganizationView />);

    const editBtn = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);

    const saveBtn = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Conflict: Organization slug or name already exists in tenant scope')).toBeInTheDocument();
    });
  });
});
