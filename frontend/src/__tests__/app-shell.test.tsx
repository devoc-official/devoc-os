import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '../layouts/app-shell';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';

function renderShell(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <AppShell>{children}</AppShell>
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AppShell Layout & Navigation Container', () => {
  it('renders skip to main content link for accessibility', () => {
    renderShell(<div>Main Workspace</div>);

    const skipLink = screen.getByText(/Skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders sidebar brand and main navigation links', () => {
    renderShell(<div>Main Workspace</div>);

    expect(screen.getAllByText('DeVoc OS').length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: /Main Navigation/i })).toBeInTheDocument();
  });

  it('renders command palette search button with keyboard shortcut indicator', () => {
    renderShell(<div>Main Workspace</div>);

    expect(screen.getByText('Search...')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('renders child content inside main tag', () => {
    renderShell(<div data-testid="test-content">Dashboard Content</div>);

    const content = screen.getByTestId('test-content');
    expect(content).toBeInTheDocument();
    expect(content.closest('main')).toHaveAttribute('id', 'main-content');
  });
});
