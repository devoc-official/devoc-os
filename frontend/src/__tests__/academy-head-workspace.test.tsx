import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AcademyHeadDashboardView } from '../features/academy-head/views/academy-head-dashboard-view';
import { AcademyStudentsView } from '../features/academy-head/views/academy-students-view';
import { AcademyProgramsView } from '../features/academy-head/views/academy-programs-view';
import { AcademyProgressView } from '../features/academy-head/views/academy-progress-view';
import { AcademyMentorsView } from '../features/academy-head/views/academy-mentors-view';
import { AcademyReviewsView } from '../features/academy-head/views/academy-reviews-view';
import { AcademyAssessmentsView } from '../features/academy-head/views/academy-assessments-view';
import { AcademyPlacementView } from '../features/academy-head/views/academy-placement-view';

import * as ahDashHook from '../features/academy-head/hooks/use-academy-head-dashboard';
import * as ahStudentsHook from '../features/academy-head/hooks/use-academy-students';
import * as ahProgramsHook from '../features/academy-head/hooks/use-academy-programs';
import * as ahProgressHook from '../features/academy-head/hooks/use-academy-progress';
import * as ahMentorsHook from '../features/academy-head/hooks/use-academy-mentors';
import * as ahReviewsHook from '../features/academy-head/hooks/use-academy-reviews';
import * as ahPlacementHook from '../features/academy-head/hooks/use-academy-placement';
import * as authHook from '../auth/use-auth';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('F5 Academy Head Experience Views (AGENTS.md Sections 4, 26)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'usr-ah', firstName: 'Richard', lastName: 'Feynman', email: 'feynman@devoc.internal' },
      currentOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      activeOrganization: { organizationId: 'org-test', organizationName: 'DeVoc Official' },
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  it('renders AcademyHeadDashboardView with operational attention items and curriculum metrics', () => {
    vi.spyOn(ahDashHook, 'useAcademyHeadDashboard').mockReturnValue({
      programs: [
        { id: 'prog-1', name: 'Cloud Native Architect', code: 'CNA-01', status: 'active', description: 'Self-paced architecture' },
      ] as any,
      enrollments: [{ id: 'en-1', status: 'active' }] as any,
      activeStudents: [{ id: 'en-1', status: 'active', learningProgramId: 'prog-1' }] as any,
      completedStudents: [],
      pausedStudents: [],
      reviews: [],
      pendingReviewsCount: 2,
      completedReviews: [],
      mentorAssignments: [{ id: 'asg-1' }] as any,
      studentsWithoutMentor: [],
      blockedTasks: [],
      attentionItems: [
        {
          id: 'uncovered-students',
          title: 'Students Without Assigned Mentor',
          description: 'Weekly review cadence requires mentor assignment',
          severity: 'warning',
          actionHref: '/mentors',
          actionLabel: 'Assign Mentors',
        },
      ],
      people: [],
      isLoading: false,
    });

    renderWithClient(<AcademyHeadDashboardView />);
    expect(screen.getByText(/Academy Head Command Center/i)).toBeInTheDocument();
    expect(screen.getByText(/Students Without Assigned Mentor/i)).toBeInTheDocument();
    expect(screen.getByText('Cloud Native Architect')).toBeInTheDocument();
  });

  it('renders AcademyStudentsView with operational roster and mentor pairing status', () => {
    vi.spyOn(ahStudentsHook, 'useAcademyStudents').mockReturnValue({
      studentRows: [
        {
          student: { id: 's-1', firstName: 'Linus', lastName: 'Torvalds', email: 'linus@devoc.internal' } as any,
          enrollment: { id: 'en-1', learningProgramId: 'prog-1', status: 'active' } as any,
          program: { id: 'prog-1', name: 'Systems Engineering' } as any,
          mentorName: 'Ken Thompson',
          status: 'active',
          totalReviews: 4,
          lastReviewDate: '2026-09-01T00:00:00Z',
          attentionTag: 'normal',
        },
      ],
      programs: [{ id: 'prog-1', name: 'Systems Engineering' }] as any,
      isLoading: false,
    });

    renderWithClient(<AcademyStudentsView />);
    expect(screen.getByText(/Academy Student Directory & Operations/i)).toBeInTheDocument();
    expect(screen.getByText('Linus Torvalds')).toBeInTheDocument();
    expect(screen.getByText('Ken Thompson')).toBeInTheDocument();
  });

  it('renders AcademyProgramsView with enrolled student counts and completion states', () => {
    vi.spyOn(ahProgramsHook, 'useAcademyPrograms').mockReturnValue({
      programs: [{ id: 'prog-1', name: 'Frontend Engineering', code: 'FE-01' }] as any,
      programStats: [
        {
          program: { id: 'prog-1', name: 'Frontend Engineering', code: 'FE-01', status: 'active', description: 'React & Next.js' } as any,
          totalEnrolled: 15,
          activeCount: 12,
          completedCount: 2,
          pausedCount: 1,
        },
      ],
      isLoading: false,
    });

    renderWithClient(<AcademyProgramsView />);
    expect(screen.getByText(/Academy Programs & Curricula/i)).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineering')).toBeInTheDocument();
    expect(screen.getByText('15 students')).toBeInTheDocument();
  });

  it('renders AcademyProgressView with velocity metrics and cohort breakdown', () => {
    vi.spyOn(ahProgressHook, 'useAcademyProgress').mockReturnValue({
      programs: [{ id: 'prog-1', name: 'Full-Stack Bootcamp', code: 'FS-01' }] as any,
      enrollments: [{ id: 'en-1', learningProgramId: 'prog-1', status: 'completed' }] as any,
      totalEnrollments: 20,
      activeCount: 15,
      completedCount: 5,
      stalledCount: 0,
      completionRate: 25,
      completedReviews: [{ id: 'rev-1' }] as any,
      pendingReviewsCount: 3,
      isLoading: false,
    });

    renderWithClient(<AcademyProgressView />);
    expect(screen.getByText(/Student Progression & Velocity/i)).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('renders AcademyMentorsView with assigned students count and workload health', () => {
    vi.spyOn(ahMentorsHook, 'useAcademyMentors').mockReturnValue({
      mentorWorkloads: [
        {
          mentor: { id: 'm-1', firstName: 'Donald', lastName: 'Knuth', email: 'knuth@devoc.internal' } as any,
          activeAssignments: [],
          assignedStudentIds: ['s-1', 's-2'],
          totalCapacityHours: 15,
          completedReviewsCount: 8,
          pendingReviewsCount: 1,
        },
      ],
      isLoading: false,
    });

    renderWithClient(<AcademyMentorsView />);
    expect(screen.getByText(/Mentor Allocation & Capacity Roster/i)).toBeInTheDocument();
    expect(screen.getByText('Donald Knuth')).toBeInTheDocument();
    expect(screen.getByText('2 students')).toBeInTheDocument();
  });

  it('renders AcademyPlacementView with Section 26 Deferred Capability Notice and verified graduates', () => {
    vi.spyOn(ahPlacementHook, 'useAcademyPlacement').mockReturnValue({
      completedCandidates: [
        {
          student: { id: 's-1', firstName: 'Katherine', lastName: 'Johnson', email: 'katherine@devoc.internal' } as any,
          program: { id: 'prog-1', name: 'Orbital Mechanics & Software' } as any,
          enrollmentStatus: 'completed',
          isCourseCompleted: true,
          completedAt: '2026-08-15T00:00:00Z',
        },
      ],
      totalCompletedGraduates: 1,
      isLoading: false,
    });

    renderWithClient(<AcademyPlacementView />);
    expect(screen.getByText(/Placement Readiness & Verified Graduates/i)).toBeInTheDocument();
    expect(screen.getByText(/Architectural Notice: Section 26 Placement Capability/i)).toBeInTheDocument();
    expect(screen.getByText('Katherine Johnson')).toBeInTheDocument();
    expect(screen.getByText('Course Completed')).toBeInTheDocument();
  });
});
