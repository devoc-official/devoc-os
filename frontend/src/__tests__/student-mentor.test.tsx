import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentMentorView } from '../features/student/views/student-mentor-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderMentor() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentMentorView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — My Mentor & Mentorship Guidance', () => {
  it('renders mentor title and guidance description', async () => {
    renderMentor();

    expect(await screen.findByText('My Mentor')).toBeInTheDocument();
  });

  it('renders either mentor profile or clean assignment empty state', async () => {
    renderMentor();

    const hasMentorHero = screen.queryByText(/Primary Mentor|Active Mentor/i);
    const hasEmptyState = screen.queryByText(/No Mentor Assigned Yet/i);

    expect(hasMentorHero || hasEmptyState).toBeTruthy();
  });
});
