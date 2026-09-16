'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, CheckCircle2, GitCommit, FileText, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMentorReviews } from '../hooks/use-mentor-reviews';
import { ProgressionDecisionBadge } from '../../reviewer/components/progression-decision-badge';

interface MentorReviewDetailViewProps {
  reviewId: string;
}

export function MentorReviewDetailView({ reviewId }: MentorReviewDetailViewProps) {
  const { reviews, isLoading } = useMentorReviews();
  const review = reviews.find((r) => r.id === reviewId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-devoc-text-secondary">Review not found or inaccessible.</p>
        <Link href="/mentor/reviews">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Reviews
          </Button>
        </Link>
      </div>
    );
  }

  const suggestions = (review.metadata as any)?.suggestions || [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/mentor/reviews">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-devoc-text-secondary px-0">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Reviews
          </Button>
        </Link>
      </div>

      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-devoc-text-primary">
                  Review for {review.studentName || 'Mentee'}
                </CardTitle>
                <ProgressionDecisionBadge decision={(review.metadata as any)?.decision} />
              </div>
              <p className="text-xs text-devoc-text-secondary mt-0.5">
                {review.programName || 'Curriculum Track'} • Conducted on{' '}
                {new Date(review.reviewedAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline" size="sm" className="capitalize text-[10px] font-mono self-start sm:self-center">
              {review.reviewType.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-2 space-y-6 text-xs">
          {/* Executive Summary */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
              Executive Summary
            </span>
            <p className="text-sm font-medium text-devoc-text-primary bg-devoc-surface-hover/30 p-3 rounded-md border border-devoc-border/60">
              {review.summary}
            </p>
          </div>

          {/* Qualitative Feedback */}
          {review.feedback && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Detailed Feedback & Observations
              </span>
              <div className="p-3.5 rounded-md bg-devoc-surface border border-devoc-border text-devoc-text-secondary leading-relaxed">
                {review.feedback}
              </div>
            </div>
          )}

          {/* Actionable Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Actionable Suggestions ({suggestions.length})
              </span>
              <div className="divide-y divide-devoc-border/60 border border-devoc-border/60 rounded-md overflow-hidden bg-devoc-surface">
                {suggestions.map((sug: string, idx: number) => (
                  <div key={idx} className="p-3 flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <span className="text-xs text-devoc-text-primary">{sug}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
