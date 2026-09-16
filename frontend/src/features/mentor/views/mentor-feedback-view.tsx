'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMentorFeedback } from '../hooks/use-mentor-feedback';

export function MentorFeedbackView() {
  const { suggestions, openCount, completedCount, isLoading } = useMentorFeedback();

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
          Mentee Suggestions & Follow-Up Tracker
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Monitor actionable advice and verify whether students have implemented suggested improvements across review cycles.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Open Suggestions
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-amber-500">{openCount}</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Awaiting student resolution</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Resolved / Completed Suggestions
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-500">{completedCount}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Verified with code or evidence</span>
        </Card>
      </div>

      {/* Feedback List */}
      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
            <FileText className="h-4 w-4 text-devoc-brand" />
            Actionable Suggestion Ledger
          </CardTitle>
          <CardDescription className="text-xs">
            Advice recorded during reviews and their current resolution status.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {suggestions.length > 0 ? (
            <div className="divide-y divide-devoc-border/60">
              {suggestions.map((sug) => (
                <div key={sug.id} className="p-4 sm:p-5 hover:bg-devoc-surface-hover/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-devoc-text-primary">{sug.studentName}</span>
                      <Badge
                        variant={sug.status === 'completed' || sug.status === 'accepted' ? 'brand' : 'outline'}
                        size="sm"
                        className="capitalize text-[10px]"
                      >
                        {sug.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] font-mono text-devoc-text-tertiary">
                        {new Date(sug.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-devoc-text-primary font-medium">{sug.text}</p>
                    <p className="text-[11px] text-devoc-text-secondary">Action: {sug.requiredAction}</p>
                  </div>
                  <Link href={`/mentor/reviews/${sug.sourceId}`}>
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs">
                      Review Details <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-devoc-text-tertiary space-y-2">
              <FileText className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No active suggestions recorded.</p>
              <p className="text-[11px]">Suggestions attached to reviews will automatically populate here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
