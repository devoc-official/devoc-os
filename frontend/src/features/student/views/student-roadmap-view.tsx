'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Circle,
  HelpCircle,
} from 'lucide-react';
import { useRoadmap } from '../hooks/use-roadmap';
import { MilestoneCard } from '../components/milestone-card';
import { LearningJourneyProgress } from '../components/learning-journey-progress';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentRoadmapView() {
  const {
    activeProgram,
    currentMilestone,
    milestonesWithActivities,
    milestones,
    completedMilestonesCount,
    totalMilestonesCount,
    completedActivitiesCount,
    totalActivitiesCount,
    overallProgressPercent,
    completeActivity,
    isLoading,
  } = useRoadmap();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-28 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
              Personalized Learning Roadmap
            </h1>
            <Badge variant="brand" size="sm">
              Personalized Plan
            </Badge>
          </div>
          <p className="text-xs text-devoc-text-secondary mt-1">
            {activeProgram
              ? `${activeProgram.name} • Sequential milestone progression and activity deliverables`
              : 'Your personalized curriculum roadmap approved by Academy mentors.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-devoc-brand">
              {overallProgressPercent}% Completed
            </span>
            <span className="text-[10px] text-devoc-text-tertiary block">
              {completedMilestonesCount}/{totalMilestonesCount} Milestones • {completedActivitiesCount}/{totalActivitiesCount} Activities
            </span>
          </div>
        </div>
      </div>

      {/* Stepper Summary */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 shadow-xs">
        <LearningJourneyProgress
          milestones={milestones}
          currentMilestoneId={currentMilestone?.id}
        />
      </div>

      {/* Roadmap Legend & Personalized Clarification Banner */}
      <div className="rounded-md border border-devoc-border/60 bg-devoc-bg/60 px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-devoc-text-secondary">
          <Sparkles className="h-4 w-4 text-devoc-brand shrink-0" />
          <span>
            This is your <strong>authoritative personalized journey</strong>. Changes approved in mentor reviews directly reflect here.
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-devoc-text-tertiary shrink-0">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Done
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-devoc-brand" /> Current
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-devoc-text-tertiary" /> Upcoming
          </span>
        </div>
      </div>

      {/* Milestone Stack */}
      <div className="space-y-4">
        {milestonesWithActivities.map((m) => {
          const isCurrent = m.id === currentMilestone?.id;
          return (
            <MilestoneCard
              key={m.id}
              milestone={m}
              isCurrent={isCurrent}
              defaultExpanded={isCurrent}
              onCompleteActivity={completeActivity}
            />
          );
        })}
      </div>
    </div>
  );
}
