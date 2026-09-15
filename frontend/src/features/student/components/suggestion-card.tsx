'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { StudentSuggestion, SuggestionStatus } from '../types/student.types';
import { Badge } from '../../../components/ui/badge';

interface SuggestionCardProps {
  suggestion: StudentSuggestion;
}

const STATUS_BADGES: Record<SuggestionStatus, { variant: 'brand' | 'success' | 'warning' | 'neutral'; label: string }> = {
  open: { variant: 'warning', label: 'Open' },
  in_progress: { variant: 'brand', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  accepted: { variant: 'success', label: 'Accepted' },
  deferred: { variant: 'neutral', label: 'Deferred' },
  superseded: { variant: 'neutral', label: 'Superseded' },
};

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const badgeConfig = STATUS_BADGES[suggestion.status] || { variant: 'neutral', label: suggestion.status };

  return (
    <div className="rounded-lg border border-devoc-border bg-devoc-card p-4 transition-all hover:border-devoc-border-hover space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={badgeConfig.variant} size="sm">
            {badgeConfig.label}
          </Badge>
          <span className="text-[11px] font-mono text-devoc-text-tertiary">
            From {suggestion.reviewerName}
          </span>
        </div>

        <span className="text-[10px] font-mono text-devoc-text-tertiary">
          {new Date(suggestion.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-devoc-text-primary leading-snug">
          {suggestion.text}
        </h4>
      </div>

      {/* Required Action Box */}
      <div className="rounded-md bg-devoc-bg/70 p-2.5 border border-devoc-border/50 text-[11px] space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block font-semibold">
          Required Action
        </span>
        <p className="text-devoc-text-secondary leading-relaxed">
          {suggestion.requiredAction}
        </p>
      </div>

      {/* Context Links */}
      <div className="flex items-center justify-between border-t border-devoc-border/40 pt-2 text-[11px] text-devoc-text-secondary">
        {suggestion.relatedActivityId ? (
          <Link
            href={`/learning/activities/${suggestion.relatedActivityId}`}
            className="flex items-center gap-1 text-devoc-brand hover:underline font-medium"
          >
            <span>Linked Activity</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <span className="text-devoc-text-tertiary">General Milestone Feedback</span>
        )}

        <Link
          href={`/learning/reviews/${suggestion.sourceId}`}
          className="flex items-center gap-1 text-devoc-text-secondary hover:text-devoc-text-primary"
        >
          <span>Source Review</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
