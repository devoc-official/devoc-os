'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMentorReviews } from '../hooks/use-mentor-reviews';
import { ProgressionDecisionBadge } from '../../reviewer/components/progression-decision-badge';

export function MentorReviewsView() {
  const { reviews, isLoading } = useMentorReviews();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Mentor Reviews & Syncs
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Historical record of mentor evaluations, sync sessions, and qualitative guidance given to mentees.
        </p>
      </div>

      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-devoc-brand" />
            Review History Archive
          </CardTitle>
          <CardDescription className="text-xs">
            Reviews recorded in the M7 Learning Engine across all assigned student enrollments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reviews.length > 0 ? (
            <div className="divide-y divide-devoc-border/60">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 sm:p-5 hover:bg-devoc-surface-hover/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-devoc-text-primary text-sm">
                        {rev.studentName || 'Mentee'}
                      </span>
                      <ProgressionDecisionBadge decision={(rev.metadata as any)?.decision} />
                      <span className="text-[11px] font-mono text-devoc-text-tertiary">
                        {new Date(rev.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-devoc-text-secondary font-medium">{rev.summary}</p>
                    {rev.feedback && (
                      <p className="text-[11px] text-devoc-text-tertiary italic">"{rev.feedback}"</p>
                    )}
                  </div>
                  <Link href={`/mentor/reviews/${rev.id}`}>
                    <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs">
                      View Review Notes <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-devoc-text-tertiary space-y-2">
              <MessageSquare className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No reviews recorded yet.</p>
              <p className="text-[11px]">Milestone and weekly syncs conducted with mentees will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
