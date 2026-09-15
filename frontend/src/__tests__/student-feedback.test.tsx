import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentFeedbackView } from '../features/student/views/student-feedback-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderFeedback() {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <RoleProvider>
          <StudentFeedbackView />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Student Experience — Feedback & Action Items', () => {
  it('renders feedback header and filter tabs', async () => {
    renderFeedback();

    expect(await screen.findByText('Feedback & Action Items')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });
});
