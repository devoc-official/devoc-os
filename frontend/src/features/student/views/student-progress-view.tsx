'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  FileText,
  BarChart3,
} from 'lucide-react';
import { useEnrollment } from '../hooks/use-enrollment';
import { useRoadmap } from '../hooks/use-roadmap';
import { useStudentProgress } from '../hooks/use-student-progress';
import { LearningJourneyProgress } from '../components/learning-journey-progress';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentProgressView() {
  const { activeEnrollment, activeProgram } = useEnrollment();
  const { milestones, currentMilestone, activities } = useRoadmap();
  const { metrics, isLoading } = useStudentProgress();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Learning Progress & Metrics
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Personal milestone velocities, activity completion rates, and assessment mastery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            {activeProgram?.name || 'Academy Program'}
          </Badge>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary">
            Curriculum Completion
          </span>
          <span className="text-2xl font-bold font-mono text-devoc-brand block">
            {metrics.programProgressPercent}%
          </span>
          <p className="text-[11px] text-devoc-text-secondary">
            Across {metrics.activitiesTotal} total curriculum activities
          </p>
        </div>

        <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary">
            Milestones Verified
          </span>
          <span className="text-2xl font-bold font-mono text-devoc-text-primary block">
            {metrics.milestonesCompleted} / {metrics.milestonesTotal}
          </span>
          <p className="text-[11px] text-devoc-text-secondary">
            Approved by mentor review evaluations
          </p>
        </div>

        <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary">
            Assessments Certified
          </span>
          <span className="text-2xl font-bold font-mono text-devoc-text-primary block">
            {metrics.assessmentsPassed}
          </span>
          <p className="text-[11px] text-devoc-text-secondary">
            Out of {metrics.assessmentsTaken} recorded attempts
          </p>
        </div>

        <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary">
            Review Cadence
          </span>
          <span className="text-2xl font-bold font-mono text-devoc-text-primary block">
            {metrics.reviewsCount} Sessions
          </span>
          <p className="text-[11px] text-devoc-text-secondary">
            Weekly 1-on-1 mentorship evaluations
          </p>
        </div>
      </div>

      {/* Stage Progression & Stepper */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 space-y-5 shadow-xs">
        <div className="border-b border-devoc-border/60 pb-3">
          <h3 className="text-sm font-bold text-devoc-text-primary">
            Curriculum Stage Breakdown
          </h3>
          <p className="text-xs text-devoc-text-secondary mt-0.5">
            Sequential milestones in your personalized learning roadmap.
          </p>
        </div>

        <LearningJourneyProgress
          milestones={milestones}
          currentMilestoneId={currentMilestone?.id}
        />
      </div>

      {/* Activity Distribution Breakdown */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 space-y-4">
        <div className="border-b border-devoc-border/60 pb-3">
          <h3 className="text-sm font-bold text-devoc-text-primary">
            Activity Distribution by Type
          </h3>
          <p className="text-xs text-devoc-text-secondary mt-0.5">
            Balance between theoretical reading, hands-on practice, and project engineering.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {['reading', 'practice', 'project', 'assessment'].map((type) => {
            const count = activities.filter((a) => a.activityType.toLowerCase() === type).length;
            const completed = activities.filter(
              (a) => a.activityType.toLowerCase() === type && a.status === 'completed'
            ).length;
            const percent = count > 0 ? Math.round((completed / count) * 100) : 0;

            return (
              <div key={type} className="rounded-md bg-devoc-bg/60 p-3.5 border border-devoc-border/60 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary capitalize">
                  {type}
                </span>
                <span className="text-lg font-bold font-mono text-devoc-text-primary block">
                  {completed} / {count}
                </span>
                <div className="w-full h-1.5 bg-devoc-border rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-devoc-brand" style={{ width: `${percent}%` }} />
                </div>
                <span className="text-[10px] text-devoc-text-tertiary block mt-1 font-mono">
                  {percent}% completed
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
