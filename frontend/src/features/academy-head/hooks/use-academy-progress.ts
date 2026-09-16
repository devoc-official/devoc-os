'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningProgram, LearningEnrollment, LearningReview } from '../../../api/learning.api';

export function useAcademyProgress() {
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

  const totalEnrollments = enrollments.length;
  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const completedCount = enrollments.filter((e) => e.status === 'completed').length;
  const stalledCount = enrollments.filter((e) => e.status === 'paused').length;

  const completionRate = totalEnrollments > 0
    ? Math.round((completedCount / totalEnrollments) * 100)
    : 0;

  const completedReviews = reviews;
  const pendingReviewsCount = activeCount > reviews.length ? activeCount - reviews.length : 0;

  return {
    programs,
    enrollments,
    totalEnrollments,
    activeCount,
    completedCount,
    stalledCount,
    completionRate,
    completedReviews,
    pendingReviewsCount,
    isLoading: isProgramsLoading || isEnrollmentsLoading || isReviewsLoading,
  };
}
