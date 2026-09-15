'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Calendar, User, ArrowRight, Award, TrendingUp } from 'lucide-react';
import { LearningReview } from '../../../api/learning.api';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

interface ReviewHistoryTimelineProps {
  reviews: LearningReview[];
  reviewerNameMap?: Record<string, string>;
}

export function ReviewHistoryTimeline({
  reviews,
  reviewerNameMap = {},
}: ReviewHistoryTimelineProps) {
  if (!reviews.length) {
    return (
      <div className="rounded-lg border border-devoc-border bg-devoc-card p-6 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-devoc-text-tertiary mb-2" />
        <h4 className="text-xs font-semibold text-devoc-text-primary">No Review Records Yet</h4>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Mentor and Academy reviews will appear here chronologically as you progress through milestones.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-devoc-border">
      {reviews.map((review) => {
        const reviewerName = reviewerNameMap[review.reviewerPersonId] || 'Mentor / Reviewer';

        return (
          <div key={review.id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-6 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-devoc-card bg-devoc-brand ring-2 ring-devoc-brand/20" />

            {/* Review Content Card */}
            <div className="rounded-lg border border-devoc-border bg-devoc-card p-4 transition-all hover:border-devoc-border-hover">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-devoc-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-devoc-text-primary capitalize">
                    {review.reviewType} Review
                  </span>
                  <Badge variant="brand" size="sm">
                    {reviewerName}
                  </Badge>
                  {review.progressValue !== null && review.progressValue !== undefined && (
                    <Badge variant="neutral" size="sm">
                      <TrendingUp className="mr-1 h-3 w-3 text-devoc-brand" />
                      {review.progressValue}% Progress
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-devoc-text-tertiary">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(review.reviewedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-3">
                <p className="text-xs font-medium text-devoc-text-primary leading-relaxed">
                  {review.summary}
                </p>
                {review.feedback && (
                  <div className="mt-2.5 rounded-md bg-devoc-bg/70 p-3 border border-devoc-border/60">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block mb-1">
                      Detailed Feedback & Suggestions
                    </span>
                    <p className="text-xs text-devoc-text-secondary leading-relaxed">
                      {review.feedback}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-end">
                <Link href={`/learning/reviews/${review.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-devoc-text-secondary hover:text-devoc-text-primary">
                    View Full Review
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
