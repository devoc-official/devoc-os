import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';
import { ReviewerWorkspaceView } from '../features/reviewer/views/reviewer-workspace-view';
import * as reviewWorkspaceHook from '../features/reviewer/hooks/use-review-workspace';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Critical Reviewer Acceptance Test (F3 Master Criterion)', () => {
  it('verifies the review workspace presents current milestone, previous review, previous suggestions, current evidence, and review form together in one screen', async () => {
    // Mock workspace context with all 5 critical elements
    const mockWorkspace = {
      student: {
        id: 'student-123',
        organizationId: 'org-test',
        firstName: 'Alice',
        lastName: 'Developer',
        email: 'alice@devoc.internal',
        status: 'active' as const,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      enrollment: {
        id: 'enr-123',
        organizationId: 'org-test',
        personId: 'student-123',
        learningProgramId: 'prog-1',
        status: 'active' as const,
        enrolledAt: '2026-09-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      program: {
        id: 'prog-1',
        organizationId: 'org-test',
        name: 'Full-Stack Software Engineering Track',
        code: 'PROG-FSSE',
        status: 'active' as const,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      milestones: [
        {
          id: 'ms-1',
          organizationId: 'org-test',
          enrollmentId: 'enr-123',
          title: 'Core TypeScript & Foundations',
          sequence: 1,
          status: 'completed' as const,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'ms-2',
          organizationId: 'org-test',
          enrollmentId: 'enr-123',
          title: 'Modular Monolith Architecture',
          sequence: 2,
          status: 'active' as const,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      currentMilestone: {
        id: 'ms-2',
        organizationId: 'org-test',
        enrollmentId: 'enr-123',
        title: 'Modular Monolith Architecture',
        sequence: 2,
        status: 'active' as const,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      currentActivity: {
        id: 'act-1',
        organizationId: 'org-test',
        enrollmentMilestoneId: 'ms-2',
        title: 'Implement Domain Boundaries & Outbox Pattern',
        description: 'Ensure modules communicate via transactional outbox without circular dependencies.',
        activityType: 'project',
        sequence: 1,
        status: 'active' as const,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      previousReview: {
        id: 'rev-prev-1',
        organizationId: 'org-test',
        enrollmentId: 'enr-123',
        reviewerPersonId: 'reviewer-999',
        reviewType: 'weekly',
        reviewedAt: '2026-09-08T10:00:00Z',
        summary: 'Solid progress on TypeScript interfaces; needs improved error handling.',
        feedback: 'Decouple controller validation from database queries.',
        progressValue: 50,
        metadata: {
          decision: 'continue',
          suggestions: ['Use centralized HTTP error envelope in all controllers'],
        },
        createdAt: '2026-09-08T10:00:00Z',
        updatedAt: '2026-09-08T10:00:00Z',
      },
      previousSuggestions: [
        {
          id: 'sug-1',
          text: 'Use centralized HTTP error envelope in all controllers',
          status: 'open' as const,
          sourceType: 'review' as const,
          sourceId: 'rev-prev-1',
          reviewerName: 'Previous Reviewer',
          requiredAction: 'Verify implementation in current review',
          evidence: 'Error envelope applied to /api/v1/work routes',
          createdAt: '2026-09-08T10:00:00Z',
        },
      ],
      reviewChanges: [
        {
          id: 'rc-1',
          organizationId: 'org-test',
          reviewId: 'rev-prev-1',
          changeType: 'complete_milestone',
          targetType: 'milestone',
          targetId: 'ms-1',
          reason: 'Passed foundations evaluation',
          createdAt: '2026-09-08T10:00:00Z',
        },
      ],
      currentEvidence: {
        projects: [
          {
            id: 'proj-1',
            organizationId: 'org-test',
            name: 'DeVoc Monolith Platform Core',
            code: 'PROJ-CORE',
            projectType: 'internal_tool',
            status: 'in_progress' as const,
            progress: 45,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
        tasks: [],
        workRecords: [],
      },
      assessments: [
        {
          id: 'ass-1',
          organizationId: 'org-test',
          enrollmentId: 'enr-123',
          title: 'Modular Architecture Assessment',
          maxScore: 100,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      attempts: [],
    };

    vi.spyOn(reviewWorkspaceHook, 'useReviewWorkspace').mockReturnValue({
      reviewerPerson: {
        id: 'rev-1',
        organizationId: 'org-test',
        firstName: 'Bob',
        lastName: 'Reviewer',
        email: 'bob@devoc.internal',
        status: 'active',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      workspace: mockWorkspace,
      isLoading: false,
      submitReview: vi.fn().mockResolvedValue({} as any),
      isSubmitting: false,
      refetch: vi.fn(),
    });

    const testClient = createTestQueryClient();
    render(
      <QueryClientProvider client={testClient}>
        <AuthProvider>
          <RoleProvider>
            <ReviewerWorkspaceView enrollmentId="enr-123" />
          </RoleProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    // 1. Current milestone & Journey present
    expect(screen.getAllByText('Modular Monolith Architecture').length).toBeGreaterThan(0);
    expect(screen.getByText('Authoritative Learning Journey')).toBeInTheDocument();

    // 2. Previous review present
    expect(
      screen.getByText('Solid progress on TypeScript interfaces; needs improved error handling.')
    ).toBeInTheDocument();

    // 3. Previous suggestions present
    expect(
      screen.getByText('Use centralized HTTP error envelope in all controllers')
    ).toBeInTheDocument();

    // 4. Current work / evidence present
    expect(
      screen.getByText('Implement Domain Boundaries & Outbox Pattern')
    ).toBeInTheDocument();
    expect(screen.getByText('DeVoc Monolith Platform Core')).toBeInTheDocument();
    expect(screen.getByText('Current Work & Submission Evidence')).toBeInTheDocument();

    // 5. Review Form with progression decision present
    expect(
      screen.getByText('Submit Learning Review & Progression Guidance')
    ).toBeInTheDocument();
    expect(screen.getByText('Progression Decision')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Final Review/i })).toBeInTheDocument();
  });
});
