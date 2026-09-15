import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentProgressView } from '../features/student/views/student-progress-view';
import { StudentAchievementsView } from '../features/student/views/student-achievements-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderProgress() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentProgressView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function renderAchievements() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentAchievementsView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — Personal Progress Analytics & Verified Achievements', () => {
  it('renders progress metrics, milestones verified, and activity breakdown', async () => {
    renderProgress();

    expect(await screen.findByText('Learning Progress & Metrics')).toBeInTheDocument();
    expect(screen.getByText('Curriculum Completion')).toBeInTheDocument();
    expect(screen.getByText('Milestones Verified')).toBeInTheDocument();
    expect(screen.getByText('Assessments Certified')).toBeInTheDocument();
    expect(screen.getByText('Review Cadence')).toBeInTheDocument();
    expect(screen.getByText('Activity Distribution by Type')).toBeInTheDocument();
  });

  it('renders achievements header, philosophy disclaimer, and outcomes list', async () => {
    renderAchievements();

    expect(await screen.findByText('Verified Achievements & Outcomes')).toBeInTheDocument();
    expect(
      screen.getByText(/genuine academic and engineering milestones/i)
    ).toBeInTheDocument();
  });
});
