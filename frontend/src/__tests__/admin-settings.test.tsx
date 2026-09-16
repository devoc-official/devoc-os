import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminSettingsView } from '../features/admin/views/admin-settings-view';
import * as adminSettingsHook from '../features/admin/hooks/use-admin-settings';
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

describe('admin-settings.test.tsx (M12 Operational Settings)', () => {
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

  it('renders operational settings with currency, timezone, and defaults', () => {
    vi.spyOn(adminSettingsHook, 'useAdminSettings').mockReturnValue({
      settings: {
        organizationId: 'org-test',
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      },
      branches: [{ id: 'br-1', name: 'Primary Campus' }] as any,
      businessUnits: [{ id: 'bu-1', name: 'Core BU' }] as any,
      isLoading: false,
      error: null,
      updateSettings: vi.fn(),
      isUpdating: false,
    });

    renderWithClient(<AdminSettingsView />);

    expect(screen.getByText('Operational Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UTC (Coordinated Universal Time)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('USD ($ - US Dollar)')).toBeInTheDocument();
  });

  it('submits updated settings to backend API', () => {
    const updateSettingsMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminSettingsHook, 'useAdminSettings').mockReturnValue({
      settings: {
        organizationId: 'org-test',
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      },
      branches: [],
      businessUnits: [],
      isLoading: false,
      error: null,
      updateSettings: updateSettingsMock,
      isUpdating: false,
    });

    renderWithClient(<AdminSettingsView />);

    const saveBtn = screen.getByRole('button', { name: /save operational settings/i });
    fireEvent.click(saveBtn);

    expect(updateSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      })
    );
  });
});
