'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useReviewerHistory } from '../hooks/use-reviewer-history';

export function ReviewerFeedbackView() {
  const { history, isLoading } = useReviewerHistory();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Extract all suggestions recorded across reviews
  const allSuggestions: {
    id: string;
    studentName: string;
    text: string;
    reviewId: string;
    reviewedAt: string;
  }[] = [];

  history.forEach((rev) => {
    const sugs = (rev.metadata as any)?.suggestions;
    if (Array.isArray(sugs)) {
      sugs.forEach((text: string, idx: number) => {
        allSuggestions.push({
          id: `${rev.id}-${idx}`,
          studentName: rev.studentName,
          text,
          reviewId: rev.id,
          reviewedAt: rev.reviewedAt,
        });
      });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Feedback & Suggestion Continuity Ledger
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Review historical suggestions across candidate students to preserve continuity and prevent duplicate recommendations.
        </p>
      </div>

      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
            <FileText className="h-4 w-4 text-devoc-brand" />
            Historical Suggestions Recorded ({allSuggestions.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Actionable guidance attached to finalized review records.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {allSuggestions.length > 0 ? (
            <div className="divide-y divide-devoc-border/60">
              {allSuggestions.map((sug) => (
                <div key={sug.id} className="p-4 sm:p-5 hover:bg-devoc-surface-hover/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-devoc-text-primary">{sug.studentName}</span>
                      <span className="text-[10px] font-mono text-devoc-text-tertiary">
                        {new Date(sug.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-devoc-text-secondary font-medium">{sug.text}</p>
                  </div>
                  <Link href={`/reviewer/reviews/${sug.reviewId}`}>
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs">
                      Review Context <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-devoc-text-tertiary space-y-2">
              <FileText className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No suggestions recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
