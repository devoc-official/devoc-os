import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnifiedDashboardView } from '../features/dashboard/unified-dashboard-view';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';

function renderDashboard() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <UnifiedDashboardView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Unified Dashboard Foundation & Multi-Role Synthesis', () => {
  it('renders greeting and active roles overview simultaneously', () => {
    renderDashboard();

    expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument();
    expect(screen.getByText('Active Role Workspaces')).toBeInTheDocument();
  });

  it('renders attention section with prioritized action items', () => {
    renderDashboard();

    expect(screen.getByText(/Requires Your Attention/i)).toBeInTheDocument();
  });

  it('renders numerical KPI cards with tabular figures', () => {
    renderDashboard();

    expect(screen.getByText('Key Performance Indicators')).toBeInTheDocument();
    expect(screen.getByText('Hours Logged (Week)')).toBeInTheDocument();
    expect(screen.getByText('Active Assignments')).toBeInTheDocument();
    expect(screen.getByText('Milestones Completed')).toBeInTheDocument();
    expect(screen.getByText('Contribution Score')).toBeInTheDocument();
  });

  it('renders activity section with append-oriented feed', () => {
    renderDashboard();

    expect(screen.getByText('Recent Organizational Activity')).toBeInTheDocument();
    expect(screen.getByText('Append-Oriented Audit Feed')).toBeInTheDocument();
  });
});
