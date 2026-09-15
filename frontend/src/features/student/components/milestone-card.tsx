'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  ListTodo,
  Calendar,
} from 'lucide-react';
import { MilestoneWithActivities } from '../hooks/use-roadmap';
import { ActivityItem } from './activity-item';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

interface MilestoneCardProps {
  milestone: MilestoneWithActivities;
  isCurrent?: boolean;
  onCompleteActivity?: (activityId: string) => void;
  isCompletingActivity?: boolean;
  defaultExpanded?: boolean;
}

export function MilestoneCard({
  milestone,
  isCurrent,
  onCompleteActivity,
  isCompletingActivity,
  defaultExpanded = false,
}: MilestoneCardProps) {
  const [expanded, setExpanded] = useState<boolean>(Boolean(defaultExpanded || isCurrent));
  const isCompleted = milestone.status === 'completed';
  const isSkipped = milestone.status === 'skipped';

  const completedActivities = milestone.activities.filter(
    (a) => a.status === 'completed'
  ).length;

  return (
    <div
      className={`rounded-lg border transition-all ${
        isCurrent
          ? 'border-devoc-brand bg-devoc-card shadow-xs ring-1 ring-devoc-brand/20'
          : isCompleted
          ? 'border-devoc-border bg-devoc-card'
          : 'border-devoc-border/60 bg-devoc-bg/40'
      }`}
    >
      {/* Milestone Header */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-mono font-bold ${
                isCompleted
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                  : isCurrent
                  ? 'border-devoc-brand bg-devoc-brand text-white'
                  : 'border-devoc-border bg-devoc-card text-devoc-text-secondary'
              }`}
            >
              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : milestone.sequence}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-devoc-text-primary">
                  {milestone.title}
                </h3>
                {isCompleted && (
                  <Badge variant="success" size="sm">
                    Completed
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="brand" size="sm">
                    In Progress
                  </Badge>
                )}
                {isSkipped && (
                  <Badge variant="neutral" size="sm">
                    Skipped
                  </Badge>
                )}
                {!isCompleted && !isCurrent && !isSkipped && (
                  <Badge variant="neutral" size="sm">
                    Pending
                  </Badge>
                )}
              </div>

              {milestone.description && (
                <p className="mt-1 text-xs text-devoc-text-secondary leading-relaxed max-w-2xl">
                  {milestone.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:self-center">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[11px] text-devoc-text-secondary">
                {completedActivities}/{milestone.activities.length} acts
              </span>
              <div className="w-16 h-1.5 bg-devoc-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-devoc-brand transition-all"
                  style={{ width: `${milestone.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Expand / Collapse Button */}
            {milestone.activities.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-8 w-8 p-0 text-devoc-text-secondary hover:text-devoc-text-primary"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Timestamps */}
        {(milestone.startedAt || milestone.completedAt) && (
          <div className="mt-3 flex items-center gap-4 text-[10px] text-devoc-text-tertiary border-t border-devoc-border/40 pt-2 font-mono">
            {milestone.startedAt && (
              <span>Started: {new Date(milestone.startedAt).toLocaleDateString()}</span>
            )}
            {milestone.completedAt && (
              <span>Completed: {new Date(milestone.completedAt).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Activities List */}
      {expanded && milestone.activities.length > 0 && (
        <div className="border-t border-devoc-border/60 bg-devoc-bg/30 p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-devoc-text-secondary px-1 mb-1">
            <span>Milestone Deliverables & Activities</span>
            <span className="font-mono text-[10px] text-devoc-text-tertiary">
              {milestone.activities.length} activities
            </span>
          </div>

          {milestone.activities.map((act) => (
            <ActivityItem
              key={act.id}
              activity={act}
              onComplete={onCompleteActivity}
              isCompleting={isCompletingActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
