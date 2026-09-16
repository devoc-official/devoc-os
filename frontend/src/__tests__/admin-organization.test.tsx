import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminOrganizationView } from '../features/admin/views/admin-organization-view';
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

describe('admin-organization.test.tsx (M1 & M12 Organization Administration)', () => {
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

  it('renders loading state cleanly', () => {
    vi.spyOn(adminOrgHook, 'useAdminOrganization').mockReturnValue({
      organization: undefined,
      settings: undefined,
      branches: [],
      isLoading: true,
      updateProfile: vi.fn(),
      isUpdatingProfile: false,
      updateSettings: vi.fn(),
      isUpdatingSettings: false,
    } as any);

    const { container } = renderWithClient(<AdminOrganizationView />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders organization metadata, operational defaults, and branches', () => {
    vi.spyOn(adminOrgHook, 'useAdminOrganization').mockReturnValue({
      organization: {
        id: 'org-test',
        name: 'DeVoc Official Platform',
        slug: 'devoc-official',
        status: 'active',
        domain: 'devoc.internal',
        createdAt: '2026-01-01T00:00:00.000Z',
      } as any,
      settings: {
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      } as any,
      branches: [
        { id: 'br-1', name: 'London Central', code: 'LON-C', location: 'London, UK', status: 'active' },
        { id: 'br-2', name: 'Berlin Lab', code: 'BER-L', location: 'Berlin, DE', status: 'active' },
      ] as any,
      isLoading: false,
      updateProfile: vi.fn(),
      isUpdatingProfile: false,
      updateSettings: vi.fn(),
      isUpdatingSettings: false,
    } as any);

    renderWithClient(<AdminOrganizationView />);

    expect(screen.getByText(/Organization Profile & Architecture/i)).toBeInTheDocument();
    expect(screen.getByText('DeVoc Official Platform')).toBeInTheDocument();
    expect(screen.getByText(/Slug: devoc-official/i)).toBeInTheDocument();
    expect(screen.getByText('devoc.internal')).toBeInTheDocument();
    expect(screen.getByText('London Central')).toBeInTheDocument();
    expect(screen.getByText('Berlin Lab')).toBeInTheDocument();
  });

  it('opens edit profile modal and submits update', async () => {
    const updateProfileMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminOrgHook, 'useAdminOrganization').mockReturnValue({
      organization: {
        id: 'org-test',
        name: 'Old Name',
        slug: 'old-name',
        status: 'active',
      } as any,
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

    expect(screen.getByText('Edit Organization Profile')).toBeInTheDocument();

    const input = screen.getByDisplayValue('Old Name');
    fireEvent.change(input, { target: { value: 'New Name Enterprise' } });

    const saveBtn = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveBtn);

    expect(updateProfileMock).toHaveBeenCalledWith({ name: 'New Name Enterprise' });
  });
});
