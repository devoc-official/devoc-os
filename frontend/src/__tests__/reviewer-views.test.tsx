import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { ReviewerDashboardView } from '../features/reviewer/views/reviewer-dashboard-view';
import { ReviewerQueueView } from '../features/reviewer/views/reviewer-queue-view';
import { ReviewerStudentsView } from '../features/reviewer/views/reviewer-students-view';
import { ReviewerAssessmentsView } from '../features/reviewer/views/reviewer-assessments-view';
import { ReviewerFeedbackView } from '../features/reviewer/views/reviewer-feedback-view';
import { ReviewerHistoryView } from '../features/reviewer/views/reviewer-history-view';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithProviders(component: React.ReactNode) {
  const testClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testClient}>
      <AuthProvider>
        <RoleProvider>{component}</RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Reviewer Experience Views (F3)', () => {
  it('renders ReviewerDashboardView with prioritized review queue and metrics', async () => {
    renderWithProviders(<ReviewerDashboardView />);

    expect(await screen.findByText('Reviewer Workspace')).toBeInTheDocument();
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Urgent / Overdue')).toBeInTheDocument();
    expect(screen.getByText('Reviews Completed')).toBeInTheDocument();
    expect(screen.getByText('Active Candidates')).toBeInTheDocument();
    expect(screen.getByText('Prioritized Review Queue')).toBeInTheDocument();
  });

  it('renders ReviewerQueueView with search and urgency filters', async () => {
    renderWithProviders(<ReviewerQueueView />);

    expect(await screen.findByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by student, email, milestone/i)).toBeInTheDocument();
    expect(screen.getByText(/Urgency:/i)).toBeInTheDocument();
  });

  it('renders ReviewerStudentsView with directory table', async () => {
    renderWithProviders(<ReviewerStudentsView />);

    expect(await screen.findByText('Reviewee Students')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by student, email, milestone/i)).toBeInTheDocument();
  });

  it('renders ReviewerAssessmentsView with submission monitoring table', async () => {
    renderWithProviders(<ReviewerAssessmentsView />);

    expect(await screen.findByText('Assessments Overview')).toBeInTheDocument();
    expect(screen.getByText('Milestone Assessment Submissions')).toBeInTheDocument();
  });

  it('renders ReviewerFeedbackView with continuity ledger', async () => {
    renderWithProviders(<ReviewerFeedbackView />);

    expect(await screen.findByText('Feedback & Suggestion Continuity Ledger')).toBeInTheDocument();
  });

  it('renders ReviewerHistoryView with decision filters and archive', async () => {
    renderWithProviders(<ReviewerHistoryView />);

    expect(await screen.findByText('Review History Archive')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by student or review summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Decision:/i)).toBeInTheDocument();
  });
});
