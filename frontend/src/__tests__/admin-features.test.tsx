import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminFeaturesView } from '../features/admin/views/admin-features-view';
import * as adminFeaturesHook from '../features/admin/hooks/use-admin-features';
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

describe('admin-features.test.tsx (M12 Feature Configuration)', () => {
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

  it('renders features table and handles override configuration dialog', () => {
    const setOverrideMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminFeaturesHook, 'useAdminFeatures').mockReturnValue({
      features: [
        {
          featureKey: 'workforce.timesheets',
          description: 'Weekly timesheets',
          isEnabled: true,
          source: 'organization_override',
          configValue: { autoApproveThreshold: 40 },
        },
      ] as any,
      isLoading: false,
      error: null,
      setFeatureOverride: setOverrideMock,
      isSettingOverride: false,
      deleteFeatureOverride: vi.fn(),
      isDeletingOverride: false,
    });

    renderWithClient(<AdminFeaturesView />);

    expect(screen.getByText('Feature Configuration & Toggles')).toBeInTheDocument();
    expect(screen.getByText('workforce.timesheets')).toBeInTheDocument();
    expect(screen.getByText('organization_override')).toBeInTheDocument();

    const configureBtn = screen.getByRole('button', { name: /configure/i });
    fireEvent.click(configureBtn);

    expect(screen.getByText('Configure Feature Override')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /save feature override/i });
    fireEvent.click(submitBtn);

    expect(setOverrideMock).toHaveBeenCalledWith({
      featureKey: 'workforce.timesheets',
      isEnabled: true,
      config: { autoApproveThreshold: 40 },
      description: 'Weekly timesheets',
    });
  });

  it('prompts confirmation when resetting feature override to system default', () => {
    const deleteOverrideMock = vi.fn().mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    vi.spyOn(adminFeaturesHook, 'useAdminFeatures').mockReturnValue({
      features: [
        {
          featureKey: 'learning.mentorship',
          description: 'Mentorship allocation',
          isEnabled: true,
          source: 'organization_override',
        },
      ] as any,
      isLoading: false,
      error: null,
      setFeatureOverride: vi.fn(),
      isSettingOverride: false,
      deleteFeatureOverride: deleteOverrideMock,
      isDeletingOverride: false,
    });

    renderWithClient(<AdminFeaturesView />);

    const resetBtn = screen.getByTitle('Reset override to platform default');
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteOverrideMock).toHaveBeenCalledWith('learning.mentorship');
  });
});
