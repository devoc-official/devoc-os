import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminMasterDataView } from '../features/admin/views/admin-master-data-view';
import * as adminMasterDataHook from '../features/admin/hooks/use-admin-master-data';
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

describe('admin-master-data.test.tsx (M12 Master Data Administration)', () => {
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

  it('renders configurable master data tabs and displays work categories', () => {
    vi.spyOn(adminMasterDataHook, 'useAdminMasterData').mockReturnValue({
      workCategories: [
        { id: 'wc-1', name: 'Strategic Planning', code: 'STRAT', description: 'Foundational strategy', isActive: true },
      ] as any,
      meetingTypes: [
        { id: 'mt-1', name: 'Daily Standup', code: 'STANDUP', description: 'Quick team check-in', isActive: true },
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

    expect(screen.getByText('Configurable Master Data')).toBeInTheDocument();
    expect(screen.getByText('Strategic Planning')).toBeInTheDocument();

    // Switch to Meeting Types
    const meetingTab = screen.getByRole('tab', { name: /meeting types/i });
    fireEvent.click(meetingTab);

    expect(screen.getByText('Daily Standup')).toBeInTheDocument();
  });

  it('handles create work category dialog submission', () => {
    const createWorkCategoryMock = vi.fn().mockResolvedValue({});
    vi.spyOn(adminMasterDataHook, 'useAdminMasterData').mockReturnValue({
      workCategories: [],
      meetingTypes: [],
      evaluationTemplates: [],
      financeCategories: [],
      skills: [],
      isLoading: false,
      createWorkCategory: createWorkCategoryMock,
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

    const newBtn = screen.getByRole('button', { name: /add entry/i });
    fireEvent.click(newBtn);

    expect(screen.getByText(/Create Master Data Entry/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Code Review');
    fireEvent.change(nameInput, { target: { value: 'Customer Discovery' } });

    const codeInput = screen.getByPlaceholderText('e.g. REV_CODE');
    fireEvent.change(codeInput, { target: { value: 'CUST_DISC' } });

    const saveBtn = screen.getByRole('button', { name: /create entry/i });
    fireEvent.click(saveBtn);

    expect(createWorkCategoryMock).toHaveBeenCalledWith({
      name: 'Customer Discovery',
      code: 'CUST_DISC',
      description: '',
    });
  });
});
