'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { useMentorStudents } from './use-mentor-students';
import { learningApi } from '../../../api/learning.api';
import { StudentSuggestion } from '../../student/types/student.types';

export function useMentorFeedback() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const { students } = useMentorStudents();

  const {
    data: suggestions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['mentor', 'feedback-suggestions', orgId, students.map((s) => s.enrollmentId)],
    queryFn: async (): Promise<(StudentSuggestion & { studentName: string; enrollmentId: string })[]> => {
      if (!orgId) return [];

      const allSuggestions: (StudentSuggestion & { studentName: string; enrollmentId: string })[] = [];

      for (const student of students) {
        if (!student.enrollmentId) continue;
        const reviews = await learningApi.listReviews(orgId, student.enrollmentId).catch(() => []);
        reviews.forEach((rev) => {
          const revSuggestions = (rev.metadata as any)?.suggestions;
          if (Array.isArray(revSuggestions)) {
            revSuggestions.forEach((text: string, idx: number) => {
              allSuggestions.push({
                id: `sug-${rev.id}-${idx}`,
                text,
                status: 'open',
                sourceType: 'mentor',
                sourceId: rev.id,
                reviewerName: student.studentName,
                requiredAction: 'Address feedback in next development milestone',
                studentName: student.studentName,
                enrollmentId: student.enrollmentId,
                createdAt: rev.reviewedAt,
              });
            });
          }
        });
      }

      return allSuggestions;
    },
    enabled: Boolean(orgId && students.length > 0),
  });

  return {
    suggestions,
    openCount: suggestions.filter((s) => s.status === 'open').length,
    completedCount: suggestions.filter((s) => s.status === 'completed' || s.status === 'accepted').length,
    isLoading,
    refetch,
  };
}
