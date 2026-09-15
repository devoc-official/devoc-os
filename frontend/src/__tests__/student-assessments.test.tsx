import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentAssessmentsView } from '../features/student/views/student-assessments-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderAssessments() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentAssessmentsView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — Curriculum Assessments & Certification', () => {
  it('renders assessments title and certification subtitle', async () => {
    renderAssessments();

    expect(await screen.findByText('Curriculum Assessments')).toBeInTheDocument();
    expect(
      screen.getByText(/Authoritative knowledge checks, practical architectural evaluations/i)
    ).toBeInTheDocument();
  });

  it('renders either assessment cards or clean scheduled empty state', async () => {
    renderAssessments();

    const hasAssessments = screen.queryByText(/Max Score:/i);
    const hasEmptyState = screen.queryByText(/No Assessments Scheduled/i);

    expect(hasAssessments || hasEmptyState).toBeTruthy();
  });
});
