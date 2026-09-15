'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, Assessment, AssessmentAttempt } from '../../../api/learning.api';

export function useAssessments(enrollmentId?: string) {
  const queryClient = useQueryClient();
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;

  // 1. Fetch assessments for enrollment
  const {
    data: assessments = [],
    isLoading: isAssessmentsLoading,
    isError: isAssessmentsError,
    refetch: refetchAssessments,
  } = useQuery({
    queryKey: ['student', 'assessments', orgId, enrollmentId],
    queryFn: async () => {
      if (!orgId || !enrollmentId) return [];
      return learningApi.listAssessments(orgId, enrollmentId);
    },
    enabled: Boolean(orgId && enrollmentId),
  });

  // 2. Fetch attempts for all assessments
  const {
    data: allAttempts = [],
    isLoading: isAttemptsLoading,
    refetch: refetchAttempts,
  } = useQuery({
    queryKey: ['student', 'attempts', orgId, assessments],
    queryFn: async () => {
      if (!orgId || !assessments.length) return [];
      const attemptLists = await Promise.all(
        assessments.map((a) =>
          learningApi.listAttempts(orgId, a.id).catch(() => [] as AssessmentAttempt[])
        )
      );
      return attemptLists.flat();
    },
    enabled: Boolean(orgId && assessments.length > 0),
  });

  // 3. Submit attempt mutation
  const submitAttemptMutation = useMutation({
    mutationFn: async ({
      assessmentId,
      metadata,
    }: {
      assessmentId: string;
      metadata?: Record<string, any>;
    }) => {
      if (!orgId || !user?.id) throw new Error('Missing auth or org context');
      return learningApi.submitAttempt(orgId, assessmentId, {
        personId: user.id,
        metadata,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'attempts'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'assessments'] });
    },
  });

  return {
    assessments,
    attempts: allAttempts,
    isLoading: isAssessmentsLoading || isAttemptsLoading,
    isError: isAssessmentsError,
    submitAttempt: submitAttemptMutation.mutateAsync,
    isSubmittingAttempt: submitAttemptMutation.isPending,
    refetchAll: async () => {
      await Promise.all([refetchAssessments(), refetchAttempts()]);
    },
  };
}
