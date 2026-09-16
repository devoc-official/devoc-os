import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuditView } from '../features/admin/views/admin-audit-view';
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

describe('admin-audit.test.tsx (M10 & M12 Audit & Governance Workspace)', () => {
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

  it('renders immutable audit logs and verifies absence of edit/delete controls', () => {
    vi.spyOn(adminAuditHook, 'useAdminAudit').mockReturnValue({
      logs: [
        {
          id: 'log-101',
          action: 'FEATURE_OVERRIDE_SET',
          entityType: 'feature_configuration',
          entityId: 'workforce.timesheets',
          actorId: 'usr-admin',
          createdAt: '2026-09-16T10:00:00.000Z',
          beforeState: { isEnabled: false },
          afterState: { isEnabled: true },
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

    expect(screen.getByText('Audit & Governance Trail')).toBeInTheDocument();
    expect(screen.getByText('Append-Only (M10/M12)')).toBeInTheDocument();
    expect(screen.getByText('FEATURE_OVERRIDE_SET')).toBeInTheDocument();
    expect(screen.getByText('feature_configuration')).toBeInTheDocument();

    // Verify audit records are strictly read-only: no edit or delete buttons exist
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('opens audit detail modal to inspect before/after state transition', () => {
    const setSelectedLogMock = vi.fn();
    const testLog = {
      id: 'log-101',
      action: 'ORGANIZATION_PROFILE_UPDATED',
      entityType: 'organization',
      entityId: 'org-test',
      actorId: 'usr-admin',
      createdAt: '2026-09-16T10:00:00.000Z',
      beforeState: { name: 'Old DeVoc' },
      afterState: { name: 'New DeVoc' },
    };

    vi.spyOn(adminAuditHook, 'useAdminAudit').mockReturnValue({
      logs: [testLog] as any,
      filters: { limit: 50, offset: 0 },
      selectedLog: testLog as any,
      setSelectedLog: setSelectedLogMock,
      isLoading: false,
      updateFilters: vi.fn(),
      resetFilters: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithClient(<AdminAuditView />);

    expect(screen.getByText(/Audit Record:/i)).toBeInTheDocument();
    expect(screen.getByText(/"Old DeVoc"/i)).toBeInTheDocument();
    expect(screen.getByText(/"New DeVoc"/i)).toBeInTheDocument();
  });
});
