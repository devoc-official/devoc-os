import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminStructureView } from '../features/admin/views/admin-structure-view';
import * as adminStructureHook from '../features/admin/hooks/use-admin-structure';
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

describe('admin-structure.test.tsx (M1 & M12 Business Structure Administration)', () => {
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

  it('proves Branch is separated from Business Unit in tabs and models', () => {
    vi.spyOn(adminStructureHook, 'useAdminStructure').mockReturnValue({
      branches: [{ id: 'br-lon', name: 'London Campus', code: 'LON', location: 'London', status: 'active' }] as any,
      businessUnits: [{ id: 'bu-acad', name: 'DeVoc Academy', code: 'ACAD', status: 'active' }] as any,
      departments: [{ id: 'dept-eng', name: 'Software Eng', code: 'ENG', businessUnitId: 'bu-acad' }] as any,
      teams: [{ id: 'team-react', name: 'Frontend Guild', code: 'FE', businessUnitId: 'bu-acad', departmentId: 'dept-eng' }] as any,
      people: [],
      peopleMap: new Map(),
      buMap: new Map([['bu-acad', 'DeVoc Academy']]),
      deptMap: new Map([['dept-eng', 'Software Eng']]),
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

    // Default tab is Business Units
    expect(screen.getByText('DeVoc Academy')).toBeInTheDocument();

    // Switch to Branches tab
    const branchTab = screen.getByRole('tab', { name: /branches/i });
    fireEvent.click(branchTab);

    expect(screen.getByText('London Campus')).toBeInTheDocument();
  });

  it('handles Business Unit creation flow', () => {
    const createBuMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminStructureHook, 'useAdminStructure').mockReturnValue({
      branches: [],
      businessUnits: [],
      departments: [],
      teams: [],
      people: [{ id: 'p-head', firstName: 'Alan', lastName: 'Turing' }] as any,
      peopleMap: new Map([['p-head', 'Alan Turing']]),
      buMap: new Map(),
      deptMap: new Map(),
      isLoading: false,
      createBranch: vi.fn(),
      updateBranch: vi.fn(),
      createBusinessUnit: createBuMock,
      updateBusinessUnit: vi.fn(),
      createDepartment: vi.fn(),
      updateDepartment: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });

    renderWithClient(<AdminStructureView />);

    const newBuBtn = screen.getByRole('button', { name: /add business unit/i });
    fireEvent.click(newBuBtn);

    expect(screen.getByRole('heading', { name: /create business unit/i })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Software Engineering');
    fireEvent.change(nameInput, { target: { value: 'Global Research' } });

    const codeInput = screen.getByPlaceholderText('e.g. ENG');
    fireEvent.change(codeInput, { target: { value: 'BU-RES' } });

    const saveBtn = screen.getByRole('button', { name: /create business unit/i });
    fireEvent.click(saveBtn);

    expect(createBuMock).toHaveBeenCalledWith({
      name: 'Global Research',
      code: 'BU-RES',
      headPersonId: null,
      status: 'active',
    });
  });
});
