import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentLearningView } from '../features/student/views/student-learning-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderStudentLearning() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentLearningView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — My Learning Overview', () => {
  it('renders My Learning page title and curriculum description', async () => {
    renderStudentLearning();

    expect(await screen.findByText('My Learning')).toBeInTheDocument();
    expect(
      screen.getByText(/Enrolled academy programs, personalized curriculum roadmap/i)
    ).toBeInTheDocument();
  });

  it('renders enrollment summary or empty enrollment state cleanly', async () => {
    renderStudentLearning();

    // Either active program banner or empty state
    const hasActiveProgram = screen.queryByText(/Active Enrollment|Personalized Learning/i);
    const hasEmptyState = screen.queryByText(/No Active Learning Program/i);

    expect(hasActiveProgram || hasEmptyState).toBeTruthy();
  });
});
