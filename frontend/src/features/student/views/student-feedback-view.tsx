'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useEnrollment } from '../hooks/use-enrollment';
import { useReviews } from '../hooks/use-reviews';
import { SuggestionCard } from '../components/suggestion-card';
import { StudentSuggestion, SuggestionStatus } from '../types/student.types';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentFeedbackView() {
  const { activeEnrollment } = useEnrollment();
  const { suggestions, reviews, isLoading } = useReviews(activeEnrollment?.id);

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSuggestions = useMemo(() => {
    if (statusFilter === 'all') return suggestions;
    return suggestions.filter((s) => s.status === statusFilter);
  }, [suggestions, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const openCount = suggestions.filter((s) => s.status === 'open').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Feedback & Action Items
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Qualitative guidance, suggestions, and required improvements from mentors and reviewers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={openCount > 0 ? 'warning' : 'success'} size="sm">
            {openCount} Open Suggestions
          </Badge>
          <span className="text-xs font-mono text-devoc-text-secondary">
            {suggestions.length} Total items
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="rounded-lg border border-devoc-border bg-devoc-card p-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['all', 'open', 'in_progress', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-medium text-xs capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-devoc-brand/10 text-devoc-brand font-semibold'
                  : 'text-devoc-text-secondary hover:text-devoc-text-primary'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-devoc-text-tertiary hidden sm:inline">
          Showing {filteredSuggestions.length} items
        </span>
      </div>

      {/* Suggestions Grid */}
      {filteredSuggestions.length === 0 ? (
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-2">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
          <h4 className="text-xs font-semibold text-devoc-text-primary">
            No Feedback Matching Filter
          </h4>
          <p className="text-xs text-devoc-text-secondary">
            You have addressed all suggestions under this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  );
}
