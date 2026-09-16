'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningReview } from '../../../api/learning.api';
import { useMentorStudents } from './use-mentor-students';

export function useMentorReviews(enrollmentId?: string) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const queryClient = useQueryClient();
  const { mentorPerson, students } = useMentorStudents();

  // Query reviews for specific enrollment or all mentees
  const {
    data: reviews = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['mentor', 'reviews', orgId, enrollmentId, mentorPerson?.id],
    queryFn: async (): Promise<(LearningReview & { studentName?: string; programName?: string })[]> => {
      if (!orgId) return [];

      if (enrollmentId) {
        const list = await learningApi.listReviews(orgId, enrollmentId).catch(() => []);
        return list;
      }

      // Collect reviews across all assigned students
      const allReviews: (LearningReview & { studentName?: string; programName?: string })[] = [];
      for (const student of students) {
        if (!student.enrollmentId) continue;
        const revs = await learningApi.listReviews(orgId, student.enrollmentId).catch(() => []);
        revs.forEach((r) => {
          allReviews.push({
            ...r,
            studentName: student.studentName,
            programName: student.programName,
          });
        });
      }

      return allReviews.sort(
        (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
      );
    },
    enabled: Boolean(orgId),
  });

  const createReviewMutation = useMutation({
    mutationFn: async (payload: {
      enrollmentId: string;
      summary: string;
      feedback?: string;
      progressValue?: number;
      metadata?: Record<string, any>;
    }) => {
      if (!orgId || !mentorPerson) throw new Error('Mentor context not available');
      return learningApi.createReview(orgId, payload.enrollmentId, {
        reviewerPersonId: mentorPerson.id,
        reviewType: 'mentor_sync',
        summary: payload.summary,
        feedback: payload.feedback,
        progressValue: payload.progressValue,
        metadata: payload.metadata,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['mentor', 'students-data'] });
    },
  });

  return {
    reviews,
    isLoading,
    createReview: createReviewMutation.mutateAsync,
    isCreating: createReviewMutation.isPending,
    refetch,
  };
}
