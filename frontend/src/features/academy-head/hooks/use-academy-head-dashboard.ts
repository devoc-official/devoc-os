'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningProgram, LearningEnrollment, LearningReview } from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { projectsApi, Task } from '../../../api/projects.api';

export function useAcademyHeadDashboard() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: programs = [], isLoading: isProgramsLoading } = useQuery({
    queryKey: ['ah', 'programs', orgId],
    queryFn: () => learningApi.listPrograms(orgId),
    enabled: Boolean(orgId),
  });

  const { data: enrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['ah', 'enrollments', orgId],
    queryFn: () => learningApi.listEnrollments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: reviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['ah', 'reviews', orgId],
    queryFn: () => learningApi.listReviews(orgId),
    enabled: Boolean(orgId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['ah', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['ah', 'assignments', orgId],
    queryFn: () => assignmentsApi.listAssignments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['ah', 'tasks', orgId],
    queryFn: () => projectsApi.listTasks(orgId),
    enabled: Boolean(orgId),
  });

  // Calculations
  const activeStudents = enrollments.filter((e) => e.status === 'active');
  const completedStudents = enrollments.filter((e) => e.status === 'completed');
  const pausedStudents = enrollments.filter((e) => e.status === 'paused');

  // Reviews recorded
  const completedReviews = reviews;
  const pendingReviewsCount = activeStudents.filter((e) => !reviews.some((r) => r.enrollmentId === e.id)).length;

  // Mentors: active mentor assignments
  const mentorAssignments = assignments.filter(
    (a) =>
      a.status === 'active' &&
      (a.roleContext?.toLowerCase().includes('mentor') || a.assignmentType === 'mentor')
  );

  // Active student IDs assigned to mentors
  const assignedStudentIds = new Set(
    mentorAssignments.filter((a) => a.targetType === 'student').map((a) => a.targetId)
  );

  const studentsWithoutMentor = activeStudents.filter((e) => !assignedStudentIds.has(e.personId));

  // Blocked student tasks
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');

  // Attention Items
  const attentionItems: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    actionHref: string;
    actionLabel: string;
  }> = [];

  if (studentsWithoutMentor.length > 0) {
    attentionItems.push({
      id: 'uncovered-students',
      title: `${studentsWithoutMentor.length} Students Without Assigned Mentor`,
      description: 'Active enrollments require an assigned mentor for weekly review cadences.',
      severity: 'warning',
      actionHref: '/mentors',
      actionLabel: 'Assign Mentors',
    });
  }

  if (pendingReviewsCount > 0) {
    attentionItems.push({
      id: 'pending-reviews',
      title: `${pendingReviewsCount} Milestone Reviews Needed`,
      description: 'Active enrollments awaiting first milestone evaluation.',
      severity: 'info',
      actionHref: '/reviews',
      actionLabel: 'Inspect Reviews',
    });
  }

  if (blockedTasks.length > 0) {
    attentionItems.push({
      id: 'blocked-projects',
      title: `${blockedTasks.length} Student Project Tasks Blocked`,
      description: 'Technical blockers reported by students in project deliverables.',
      severity: 'critical',
      actionHref: '/projects',
      actionLabel: 'Resolve Blockers',
    });
  }

  const isLoading =
    isProgramsLoading ||
    isEnrollmentsLoading ||
    isReviewsLoading ||
    isAssignmentsLoading;

  return {
    programs,
    enrollments,
    activeStudents,
    completedStudents,
    pausedStudents,
    reviews,
    pendingReviewsCount,
    completedReviews,
    mentorAssignments,
    studentsWithoutMentor,
    blockedTasks,
    attentionItems,
    people,
    isLoading,
  };
}
