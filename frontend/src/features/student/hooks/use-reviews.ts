'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningReview, ReviewChange } from '../../../api/learning.api';
import { evaluationApi, Evaluation } from '../../../api/evaluation.api';
import { StudentSuggestion, SuggestionStatus } from '../types/student.types';

export function useReviews(enrollmentId?: string) {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;

  // 1. Fetch Learning Reviews
  const {
    data: reviews = [],
    isLoading: isReviewsLoading,
    isError: isReviewsError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['student', 'reviews', orgId, enrollmentId],
    queryFn: async () => {
      if (!orgId || !enrollmentId) return [];
      return learningApi.listReviews(orgId, enrollmentId);
    },
    enabled: Boolean(orgId && enrollmentId),
  });

  // 2. Fetch Evaluation Feedback (M8) where student is subject
  const {
    data: evaluations = [],
    isLoading: isEvaluationsLoading,
  } = useQuery({
    queryKey: ['student', 'evaluations', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return [];
      return evaluationApi.listEvaluations(orgId, { subjectId: user.id });
    },
    enabled: Boolean(orgId && user?.id),
  });

  // 3. Synthesize first-class suggestions from reviews and evaluations
  const suggestions = useQuery({
    queryKey: ['student', 'suggestions', reviews, evaluations],
    queryFn: () => {
      const list: StudentSuggestion[] = [];

      // From Learning Reviews
      reviews.forEach((review) => {
        // If review has explicit structured suggestions in metadata
        if (Array.isArray(review.metadata?.suggestions)) {
          review.metadata.suggestions.forEach((s: any, idx: number) => {
            list.push({
              id: s.id || `${review.id}-sug-${idx}`,
              text: s.text || s.title || 'Actionable suggestion from review',
              status: (s.status as SuggestionStatus) || 'open',
              sourceType: 'review',
              sourceId: review.id,
              reviewerName: review.metadata?.reviewerName || 'Mentor / Reviewer',
              relatedActivityId: s.relatedActivityId || null,
              relatedActivityTitle: s.relatedActivityTitle || null,
              requiredAction: s.requiredAction || s.action || 'Review deliverable and address comments',
              evidence: s.evidence || null,
              createdAt: s.createdAt || review.reviewedAt,
            });
          });
        } else if (review.feedback) {
          // If no structured array but feedback string exists, construct a suggestion item
          list.push({
            id: `${review.id}-fb`,
            text: review.feedback,
            status: review.progressValue && review.progressValue >= 100 ? 'completed' : 'open',
            sourceType: 'review',
            sourceId: review.id,
            reviewerName: review.metadata?.reviewerName || 'Mentor / Reviewer',
            requiredAction: review.summary || 'Incorporate reviewer feedback into ongoing work',
            evidence: null,
            createdAt: review.reviewedAt,
          });
        }
      });

      // From M8 Evaluation feedback
      evaluations.forEach((evalItem) => {
        if (evalItem.summaryFeedback) {
          list.push({
            id: `${evalItem.id}-eval-fb`,
            text: evalItem.summaryFeedback,
            status: evalItem.state === 'completed' ? 'completed' : 'open',
            sourceType: 'evaluation',
            sourceId: evalItem.id,
            reviewerName: 'Academy Evaluation Panel',
            requiredAction: 'Review evaluation rubric assessment',
            evidence: null,
            createdAt: evalItem.completedAt || evalItem.createdAt,
          });
        }
        if (Array.isArray(evalItem.feedback)) {
          evalItem.feedback.forEach((fb, idx) => {
            list.push({
              id: fb.id || `${evalItem.id}-item-${idx}`,
              text: fb.payload?.comment || fb.payload?.notes || fb.payload?.summary || 'Qualitative feedback item',
              status: 'open',
              sourceType: 'evaluation',
              sourceId: evalItem.id,
              reviewerName: 'Academy Evaluation Panel',
              requiredAction: fb.payload?.actionRequired || 'Address feedback points',
              evidence: fb.payload?.evidenceUrl || null,
              createdAt: fb.createdAt,
            });
          });
        }
      });

      return list;
    },
    enabled: true,
  }).data || [];

  return {
    reviews,
    evaluations,
    suggestions,
    isLoading: isReviewsLoading || isEvaluationsLoading,
    isError: isReviewsError,
    refetchReviews,
  };
}
