import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentProjectsView } from '../features/student/views/student-projects-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderProjects() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentProjectsView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — My Projects & Engineering Deliverables', () => {
  it('renders projects header and assigned projects count badge', async () => {
    renderProjects();

    expect(await screen.findByText('My Projects & Tasks')).toBeInTheDocument();
    expect(screen.getByText(/Assigned Projects/i)).toBeInTheDocument();
  });

  it('renders project list or empty state cleanly', async () => {
    renderProjects();

    const hasProjects = screen.queryByText(/tasks done/i);
    const hasEmptyState = screen.queryByText(/No Projects Assigned Yet/i);

    expect(hasProjects || hasEmptyState).toBeTruthy();
  });
});
