'use client';

import React from 'react';
import { CheckCircle2, Circle, ArrowRight, Clock } from 'lucide-react';
import { EnrollmentMilestone } from '../../../api/learning.api';
import { Badge } from '../../../components/ui/badge';

interface LearningJourneyProgressProps {
  milestones: EnrollmentMilestone[];
  currentMilestoneId?: string | null;
  onSelectMilestone?: (milestoneId: string) => void;
}

export function LearningJourneyProgress({
  milestones,
  currentMilestoneId,
  onSelectMilestone,
}: LearningJourneyProgressProps) {
  if (!milestones.length) {
    return (
      <div className="rounded-md border border-devoc-border bg-devoc-card p-4 text-center">
        <p className="text-xs text-devoc-text-secondary">No milestones defined for this learning journey yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-xs text-devoc-text-secondary">
        <span className="font-medium text-devoc-text-primary">Roadmap Progression</span>
        <span className="font-mono text-[11px]">
          {milestones.filter((m) => m.status === 'completed').length} of {milestones.length} completed
        </span>
      </div>

      {/* Horizontal Step Progression on Desktop, Scannable list on Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {milestones.map((m, idx) => {
          const isCompleted = m.status === 'completed';
          const isCurrent = m.id === currentMilestoneId || m.status === 'active';
          const isSkipped = m.status === 'skipped';

          return (
            <div
              key={m.id}
              onClick={() => onSelectMilestone?.(m.id)}
              className={`group relative flex flex-col justify-between rounded-md border p-3.5 transition-colors cursor-pointer ${
                isCurrent
                  ? 'border-devoc-brand bg-devoc-brand/5 shadow-xs ring-1 ring-devoc-brand/20'
                  : isCompleted
                  ? 'border-devoc-border bg-devoc-card hover:border-devoc-border-hover'
                  : 'border-devoc-border/60 bg-devoc-bg/60 hover:border-devoc-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] text-devoc-text-tertiary">
                  STEP {String(idx + 1).padStart(2, '0')}
                </span>
                {isCompleted && (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Done
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="brand" size="sm">
                    <Clock className="mr-1 h-3 w-3 animate-pulse" />
                    Current
                  </Badge>
                )}
                {isSkipped && (
                  <Badge variant="neutral" size="sm">
                    Skipped
                  </Badge>
                )}
                {!isCompleted && !isCurrent && !isSkipped && (
                  <Badge variant="neutral" size="sm">
                    Upcoming
                  </Badge>
                )}
              </div>

              <div className="mt-2.5">
                <h4
                  className={`text-xs font-semibold leading-tight line-clamp-1 ${
                    isCurrent ? 'text-devoc-brand' : 'text-devoc-text-primary'
                  }`}
                >
                  {m.title}
                </h4>
                {m.description && (
                  <p className="mt-1 text-[11px] text-devoc-text-secondary line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-devoc-border/50 pt-2 text-[10px] text-devoc-text-tertiary">
                <span>Seq {m.sequence}</span>
                {isCurrent && <span className="font-medium text-devoc-brand">You are here</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
