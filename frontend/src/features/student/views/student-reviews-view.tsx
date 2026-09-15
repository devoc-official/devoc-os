'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Calendar, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { useEnrollment } from '../hooks/use-enrollment';
import { useReviews } from '../hooks/use-reviews';
import { useMentor } from '../hooks/use-mentor';
import { ReviewHistoryTimeline } from '../components/review-history-timeline';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentReviewsView() {
  const { activeEnrollment, activeProgram } = useEnrollment();
  const { reviews, suggestions, isLoading } = useReviews(activeEnrollment?.id);
  const { mentorPerson } = useMentor(activeEnrollment?.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    );
  }

  const mentorName = mentorPerson
    ? `${mentorPerson.firstName} ${mentorPerson.lastName}`
    : 'Academy Mentor';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Learning Reviews & Evaluations
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Historical evaluations, roadmap decisions, and qualitative feedback from your mentors and reviewers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/learning/feedback">
            <Badge variant="brand" size="sm" className="cursor-pointer hover:bg-devoc-brand/20">
              {suggestions.filter((s) => s.status === 'open').length} Open Action Items
            </Badge>
          </Link>
        </div>
      </div>

      {/* Review Timeline */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-devoc-brand" />
            <h3 className="text-xs font-bold text-devoc-text-primary">
              All Milestone & Cadence Reviews
            </h3>
          </div>
          <span className="font-mono text-[11px] text-devoc-text-tertiary">
            {reviews.length} total sessions
          </span>
        </div>

        <ReviewHistoryTimeline
          reviews={reviews}
          reviewerNameMap={{ [mentorPerson?.id || '']: mentorName }}
        />
      </div>
    </div>
  );
}
