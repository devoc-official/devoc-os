import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { MentorDashboardView } from '../features/mentor/views/mentor-dashboard-view';
import { MentorStudentsView } from '../features/mentor/views/mentor-students-view';
import { MentorProgressView } from '../features/mentor/views/mentor-progress-view';
import { MentorReviewsView } from '../features/mentor/views/mentor-reviews-view';
import { MentorFeedbackView } from '../features/mentor/views/mentor-feedback-view';
import { MentorMeetingsView } from '../features/mentor/views/mentor-meetings-view';
import { MentorAssignmentsView } from '../features/mentor/views/mentor-assignments-view';

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

describe('Mentor Experience Views (F3)', () => {
  it('renders MentorDashboardView with operational metrics and triage container', async () => {
    renderWithProviders(<MentorDashboardView />);

    expect(await screen.findByText('Mentor Workspace')).toBeInTheDocument();
    expect(screen.getByText('Assigned Mentees')).toBeInTheDocument();
    expect(screen.getByText('Reviews Completed')).toBeInTheDocument();
    expect(screen.getByText('Reviews Due / Attention')).toBeInTheDocument();
    expect(screen.getByText('Open Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Assigned Mentees Overview')).toBeInTheDocument();
  });

  it('renders MentorStudentsView with filter and search inputs', async () => {
    renderWithProviders(<MentorStudentsView />);

    expect(await screen.findByText('My Students')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by student name, email, milestone/i)).toBeInTheDocument();
    expect(screen.getByText(/Status:/i)).toBeInTheDocument();
  });

  it('renders MentorProgressView with cohort progression metrics', async () => {
    renderWithProviders(<MentorProgressView />);

    expect(await screen.findByText('Learning Progress Overview')).toBeInTheDocument();
    expect(screen.getByText('Average Mentee Progress')).toBeInTheDocument();
    expect(screen.getByText('Progressing Mentees')).toBeInTheDocument();
    expect(screen.getByText('Mentee Progression Velocity')).toBeInTheDocument();
  });

  it('renders MentorReviewsView with review archive header', async () => {
    renderWithProviders(<MentorReviewsView />);

    expect(await screen.findByText('Mentor Reviews & Syncs')).toBeInTheDocument();
    expect(screen.getByText('Review History Archive')).toBeInTheDocument();
  });

  it('renders MentorFeedbackView with suggestion counts', async () => {
    renderWithProviders(<MentorFeedbackView />);

    expect(await screen.findByText('Mentee Suggestions & Follow-Up Tracker')).toBeInTheDocument();
    expect(screen.getByText('Open Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Resolved / Completed Suggestions')).toBeInTheDocument();
  });

  it('renders MentorMeetingsView with upcoming and past session cards', async () => {
    renderWithProviders(<MentorMeetingsView />);

    expect(await screen.findByText('Mentor Sessions & Sync Meetings')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Upcoming Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Past Completed Sessions/i })).toBeInTheDocument();
  });

  it('renders MentorAssignmentsView with M3 assignment metadata', async () => {
    renderWithProviders(<MentorAssignmentsView />);

    expect(await screen.findByText('Mentor Assignments & Capacity')).toBeInTheDocument();
    expect(screen.getByText('Active Mentor Assignments')).toBeInTheDocument();
  });
});
