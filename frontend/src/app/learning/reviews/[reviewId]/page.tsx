'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Calendar, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../../auth/use-auth';
import { useEnrollment } from '../../../../features/student/hooks/use-enrollment';
import { learningApi, LearningReview, ReviewChange } from '../../../../api/learning.api';
import { AppShell } from '../../../../layouts/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = (params?.reviewId as string) || '';
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const { activeEnrollment } = useEnrollment();

  const { data: review = null, isLoading: isReviewLoading } = useQuery({
    queryKey: ['student', 'review', orgId, activeEnrollment?.id, reviewId],
    queryFn: async () => {
      if (!orgId || !activeEnrollment?.id || !reviewId) return null;
      return learningApi.getReviewById(orgId, activeEnrollment.id, reviewId);
    },
    enabled: Boolean(orgId && activeEnrollment?.id && reviewId),
  });

  const { data: changes = [], isLoading: isChangesLoading } = useQuery({
    queryKey: ['student', 'review-changes', orgId, activeEnrollment?.id, reviewId],
    queryFn: async () => {
      if (!orgId || !activeEnrollment?.id || !reviewId) return [];
      return learningApi.listReviewChanges(orgId, activeEnrollment.id, reviewId).catch(() => [] as ReviewChange[]);
    },
    enabled: Boolean(orgId && activeEnrollment?.id && reviewId),
  });

  if (isReviewLoading || isChangesLoading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!review) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-3">
          <h3 className="text-sm font-bold text-devoc-text-primary">Review Record Not Found</h3>
          <p className="text-xs text-devoc-text-secondary">
            The requested review evaluation could not be located.
          </p>
          <Link href="/learning/reviews">
            <Button size="sm" variant="outline" className="text-xs mt-2">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Reviews
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/learning/reviews"
            className="inline-flex items-center text-xs font-medium text-devoc-text-secondary hover:text-devoc-text-primary transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Reviews
          </Link>
        </div>

        <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-devoc-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm" className="capitalize">
                  {review.reviewType} Review
                </Badge>
                {review.progressValue !== null && review.progressValue !== undefined && (
                  <Badge variant="neutral" size="sm">
                    <TrendingUp className="mr-1 h-3 w-3 text-devoc-brand" />
                    {review.progressValue}% Progression
                  </Badge>
                )}
              </div>
              <h1 className="text-base font-bold text-devoc-text-primary mt-2">
                {review.summary}
              </h1>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-devoc-text-tertiary">
              <Calendar className="h-4 w-4" />
              <span>{new Date(review.reviewedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Qualitative Feedback */}
          {review.feedback && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-devoc-text-tertiary font-mono">
                Evaluator Notes & Feedback
              </h3>
              <div className="rounded-md bg-devoc-bg/70 p-4 border border-devoc-border/60 text-xs text-devoc-text-secondary leading-relaxed">
                {review.feedback}
              </div>
            </div>
          )}

          {/* Roadmap Changes Recorded */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-devoc-text-tertiary font-mono">
              Roadmap Adjustments Made
            </h3>
            {changes.length === 0 ? (
              <p className="text-xs text-devoc-text-secondary">
                No roadmap structure changes recorded during this review session.
              </p>
            ) : (
              <div className="space-y-2">
                {changes.map((ch) => (
                  <div key={ch.id} className="rounded-md border border-devoc-border p-3 text-xs bg-devoc-bg/40 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                          {ch.changeType}
                        </Badge>
                        <span className="font-medium text-devoc-text-primary">Target: {ch.targetType}</span>
                      </div>
                      {ch.reason && (
                        <p className="text-[11px] text-devoc-text-secondary mt-1">
                          Reason: {ch.reason}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-devoc-text-tertiary">
                      {new Date(ch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
