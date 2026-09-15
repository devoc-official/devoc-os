'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  FileText,
  Code2,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { LearningActivity } from '../../../api/learning.api';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

interface ActivityItemProps {
  activity: LearningActivity;
  isCurrent?: boolean;
  onComplete?: (id: string) => void;
  onSkip?: (id: string) => void;
  isCompleting?: boolean;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  reading: BookOpen,
  practice: Code2,
  project: FileText,
  assessment: HelpCircle,
  review: Sparkles,
};

export function ActivityItem({
  activity,
  isCurrent,
  onComplete,
  onSkip,
  isCompleting,
}: ActivityItemProps) {
  const IconComponent = TYPE_ICONS[activity.activityType.toLowerCase()] || BookOpen;
  const isCompleted = activity.status === 'completed';
  const isSkipped = activity.status === 'skipped';

  return (
    <div
      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border p-3.5 transition-colors ${
        isCurrent
          ? 'border-devoc-brand bg-devoc-brand/5 shadow-2xs'
          : isCompleted
          ? 'border-devoc-border bg-devoc-card'
          : 'border-devoc-border/60 bg-devoc-bg/60 hover:border-devoc-border'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-mono ${
            isCompleted
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
              : isCurrent
              ? 'border-devoc-brand/20 bg-devoc-brand/10 text-devoc-brand'
              : 'border-devoc-border bg-devoc-card text-devoc-text-tertiary'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <IconComponent className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-devoc-text-tertiary">
              #{activity.sequence}
            </span>
            <Link
              href={`/learning/activities/${activity.id}`}
              className="text-xs font-semibold text-devoc-text-primary hover:text-devoc-brand transition-colors line-clamp-1"
            >
              {activity.title}
            </Link>
            <Badge variant="neutral" size="sm">
              {activity.activityType}
            </Badge>
            {isCurrent && (
              <Badge variant="brand" size="sm">
                Current Focus
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="success" size="sm">
                Completed
              </Badge>
            )}
            {isSkipped && (
              <Badge variant="neutral" size="sm">
                Skipped
              </Badge>
            )}
          </div>

          {activity.description && (
            <p className="mt-1 text-[11px] text-devoc-text-secondary line-clamp-1">
              {activity.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {!isCompleted && !isSkipped && onComplete && (
          <Button
            size="sm"
            variant="outline"
            disabled={isCompleting}
            onClick={() => onComplete(activity.id)}
            className="text-xs h-7 px-2.5"
          >
            {isCompleting ? 'Saving...' : 'Mark Done'}
          </Button>
        )}
        <Link href={`/learning/activities/${activity.id}`}>
          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-devoc-text-secondary hover:text-devoc-text-primary">
            Details
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
