import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentRoadmapView } from '../features/student/views/student-roadmap-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderStudentRoadmap() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentRoadmapView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — Personalized Learning Roadmap', () => {
  it('renders roadmap header and personalized plan badge', async () => {
    renderStudentRoadmap();

    expect(await screen.findByText('Personalized Learning Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Personalized Plan')).toBeInTheDocument();
  });

  it('renders roadmap explanation banner and authoritative legend', async () => {
    renderStudentRoadmap();

    expect(await screen.findByText(/authoritative personalized journey/i)).toBeInTheDocument();
    expect(screen.getByText(/Done/i)).toBeInTheDocument();
    expect(screen.getByText(/Current/i)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming/i)).toBeInTheDocument();
  });
});
