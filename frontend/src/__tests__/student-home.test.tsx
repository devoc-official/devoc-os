import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentHomeView } from '../features/student/views/student-home-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderStudentHome() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentHomeView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — Home & Learning State Overview', () => {
  it('renders student welcome greeting and active journey banner', async () => {
    renderStudentHome();

    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Journey/i)).toBeInTheDocument();
  });

  it('renders roadmap progression and action buttons', async () => {
    renderStudentHome();

    expect(await screen.findByRole('button', { name: /Roadmap/i })).toBeInTheDocument();
    expect(screen.getByText(/No milestones defined for this learning journey yet|Roadmap Progression/i)).toBeInTheDocument();
  });

  it('renders curriculum pace and milestone progress metrics', async () => {
    renderStudentHome();

    expect(await screen.findByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('Curriculum pace')).toBeInTheDocument();
    expect(screen.getByText('Approved deliverables')).toBeInTheDocument();
    expect(screen.getByText('Completed items')).toBeInTheDocument();
    expect(screen.getByText('Mentor syncs')).toBeInTheDocument();
  });

  it('renders needs your attention and upcoming items sections', async () => {
    renderStudentHome();

    expect(await screen.findByText('Needs Your Attention')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Milestones & Reviews')).toBeInTheDocument();
  });
});
