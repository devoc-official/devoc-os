import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentActivitiesView } from '../features/student/views/student-activities-view';
import { StudentActivityDetailView } from '../features/student/views/student-activity-detail-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderActivities() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentActivitiesView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — Curriculum Activities & Detail', () => {
  it('renders activities header, search input, and filter controls', async () => {
    renderActivities();

    expect(await screen.findByText('Curriculum Activities')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search activities by title/i)).toBeInTheDocument();
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('current')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('renders activity detail empty state when activity is not found', async () => {
    render(
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <RoleProvider>
            <StudentActivityDetailView activityId="non-existent-id" />
          </RoleProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Activity Not Found')).toBeInTheDocument();
    expect(screen.getByText('Back to Activities')).toBeInTheDocument();
  });
});
