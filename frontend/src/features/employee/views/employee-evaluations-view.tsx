'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { evaluationApi, Evaluation } from '../../../api/evaluation.api';
import { StatusBadge } from '../../../components/data/status-badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function EmployeeEvaluationsView() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['employee', 'evaluations-full', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await evaluationApi.listEvaluations(orgId, { subjectId: personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Performance Reviews & Evaluations
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Historical and active qualitative performance reviews, reviewer feedback, and outcome recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evaluations List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Evaluation Records ({evaluations.length})
          </h3>

          {evaluations.length > 0 ? (
            <div className="space-y-3">
              {evaluations.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvaluation(ev)}
                  className={cn(
                    'p-4 rounded-md border cursor-pointer transition-colors space-y-2',
                    selectedEvaluation?.id === ev.id
                      ? 'border-devoc-accent bg-devoc-surface-secondary/70'
                      : 'border-devoc-border bg-devoc-surface hover:bg-devoc-surface-secondary/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-devoc-text-primary">
                        Evaluation #{ev.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={ev.state} />
                    </div>
                    <span className="text-[11px] font-mono text-devoc-text-muted">
                      {ev.completedAt ? `Completed: ${new Date(ev.completedAt).toLocaleDateString()}` : 'In progress'}
                    </span>
                  </div>

                  {ev.summaryFeedback && (
                    <p className="text-xs text-devoc-text-secondary line-clamp-2">
                      {ev.summaryFeedback}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-devoc-text-muted pt-1">
                    <span>Created: {new Date(ev.createdAt).toLocaleDateString()}</span>
                    {ev.scheduledAt && <span>Scheduled: {new Date(ev.scheduledAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
              No evaluation records found for your account.
            </div>
          )}
        </div>

        {/* Evaluation Detail Panel */}
        <div className="space-y-4">
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Review Inspection
            </h3>

            {selectedEvaluation ? (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Status</span>
                  <StatusBadge status={selectedEvaluation.state} />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Summary Feedback</span>
                  <div className="p-2.5 rounded bg-devoc-surface-secondary/50 border border-devoc-border text-devoc-text-primary whitespace-pre-wrap">
                    {selectedEvaluation.summaryFeedback || 'No summary feedback recorded yet.'}
                  </div>
                </div>

                {selectedEvaluation.feedback && selectedEvaluation.feedback.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-devoc-border">
                    <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">
                      Qualitative Feedback Items ({selectedEvaluation.feedback.length})
                    </span>
                    <ul className="space-y-1.5">
                      {selectedEvaluation.feedback.map((f) => (
                        <li key={f.id} className="p-2 rounded bg-devoc-surface-secondary/40 border border-devoc-border text-[11px]">
                          <span className="font-semibold block uppercase text-[10px] text-devoc-accent">
                            {f.feedbackType}
                          </span>
                          <span className="text-devoc-text-secondary">
                            {JSON.stringify(f.payload)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-devoc-text-muted">
                Select an evaluation from the list to review feedback and outcomes.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
