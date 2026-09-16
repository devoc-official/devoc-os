import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminRolesView } from '../features/admin/views/admin-roles-view';
import * as adminRolesHook from '../features/admin/hooks/use-admin-roles';
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

describe('admin-roles.test.tsx (M2 & M12 Roles & Permissions)', () => {
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

  it('renders roles and platform capability matrix', () => {
    vi.spyOn(adminRolesHook, 'useAdminRoles').mockReturnValue({
      roles: [
        { id: 'r-admin', name: 'Platform Admin', code: 'ROLE-ADMIN', description: 'Root tenant administration' },
        { id: 'r-dev', name: 'Software Engineer', code: 'ROLE-DEV', description: 'Engineering team member' },
      ] as any,
      capabilities: [
        { code: 'platform:admin', name: 'Platform Administrator', description: 'Tenant super-admin capabilities', scope: 'organization', module: 'admin' },
        { code: 'structure:manage', name: 'Structure Manager', description: 'Manage business units and branches', scope: 'organization', module: 'organization' },
      ],
      members: [],
      isLoading: false,
    });

    renderWithClient(<AdminRolesView />);

    expect(screen.getByText('Roles & Capability Governance')).toBeInTheDocument();
    expect(screen.getByText('Effective Authorization Principle (AGENTS.md Section 6)')).toBeInTheDocument();
    expect(screen.getByText('Platform Admin')).toBeInTheDocument();
    expect(screen.getByText('ROLE-ADMIN')).toBeInTheDocument();
    expect(screen.getByText('platform:admin')).toBeInTheDocument();
    expect(screen.getByText('structure:manage')).toBeInTheDocument();
  });
});
