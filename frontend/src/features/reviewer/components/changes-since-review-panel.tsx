'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, GitCommit, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ReviewChange, LearningReview } from '../../../api/learning.api';
import { StudentSuggestion } from '../../student/types/student.types';

interface ChangesSinceReviewPanelProps {
  previousReview?: LearningReview | null;
  previousSuggestions?: StudentSuggestion[];
  reviewChanges?: ReviewChange[];
  className?: string;
}

export function ChangesSinceReviewPanel({
  previousReview,
  previousSuggestions = [],
  reviewChanges = [],
  className = '',
}: ChangesSinceReviewPanelProps) {
  return (
    <Card className={`border-devoc-border bg-devoc-surface ${className}`}>
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-devoc-brand" />
            Changes Since Previous Review
          </CardTitle>
          <Badge variant="outline" size="sm" className="text-[10px] font-mono">
            {reviewChanges.length} Roadmap Updates
          </Badge>
        </div>
        <p className="text-xs text-devoc-text-secondary">
          Track how student actions and roadmap adjustments responded to previous feedback.
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-1 space-y-4 text-xs">
        {/* Prior Review Context Baseline */}
        {previousReview && (
          <div className="p-3 rounded-md bg-devoc-surface-hover/50 border border-devoc-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-devoc-text-tertiary">
              <span className="uppercase tracking-wider font-mono">Previous Review Advice</span>
              <span>{new Date(previousReview.reviewedAt).toLocaleDateString()}</span>
            </div>
            <p className="text-xs font-medium text-devoc-text-primary">{previousReview.summary}</p>
            {previousReview.feedback && (
              <p className="text-[11px] text-devoc-text-secondary italic">"{previousReview.feedback}"</p>
            )}
          </div>
        )}

        {/* Prior Suggestions & Follow-up State */}
        {previousSuggestions.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
              Previous Actionable Suggestions ({previousSuggestions.length})
            </span>
            <div className="grid grid-cols-1 gap-2">
              {previousSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="p-2.5 rounded-md border border-devoc-border/70 bg-devoc-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs text-devoc-text-primary font-medium">{sug.text}</p>
                    {sug.evidence && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 inline shrink-0" />
                        <span>Evidence: {sug.evidence}</span>
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={sug.status === 'completed' || sug.status === 'accepted' ? 'brand' : 'outline'}
                    size="sm"
                    className="capitalize text-[10px] shrink-0 self-start sm:self-center"
                  >
                    {sug.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Authoritative M7 Review Roadmap Changes Recorded */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Authoritative Roadmap Changes Applied
          </span>
          {reviewChanges.length > 0 ? (
            <div className="divide-y divide-devoc-border/50 border border-devoc-border/60 rounded-md overflow-hidden bg-devoc-surface">
              {reviewChanges.map((change) => (
                <div key={change.id} className="p-3 flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-devoc-brand/10 text-devoc-brand mt-0.5 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-devoc-text-primary capitalize">
                        {change.changeType.replace('_', ' ')}
                      </span>
                      <Badge variant="outline" size="sm" className="text-[10px] uppercase">
                        {change.targetType}
                      </Badge>
                    </div>
                    {change.reason && (
                      <p className="text-[11px] text-devoc-text-secondary">Reason: {change.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center border border-dashed border-devoc-border/80 rounded-md text-devoc-text-tertiary">
              <p className="text-xs">No roadmap changes recorded for this review cycle.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
