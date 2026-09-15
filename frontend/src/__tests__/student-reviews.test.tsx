import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentReviewsView } from '../features/student/views/student-reviews-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderReviews() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentReviewsView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — Learning Reviews & Evaluations', () => {
  it('renders reviews page header and action items badge link', async () => {
    renderReviews();

    expect(await screen.findByText('Learning Reviews & Evaluations')).toBeInTheDocument();
    expect(screen.getByText(/Open Action Items/i)).toBeInTheDocument();
  });

  it('renders either review timeline or no reviews record state', async () => {
    renderReviews();

    const hasReviewsTimeline = screen.queryByText(/All Milestone & Cadence Reviews/i);
    const hasEmptyState = screen.queryByText(/No Review Records Yet/i);

    expect(hasReviewsTimeline || hasEmptyState).toBeTruthy();
  });
});
