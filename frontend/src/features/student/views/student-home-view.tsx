'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Calendar,
  Sparkles,
  Award,
} from 'lucide-react';
import { useAuth } from '../../../auth/use-auth';
import { useStudentData } from '../hooks/use-student-data';
import { LearningJourneyProgress } from '../components/learning-journey-progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentHomeView() {
  const { user } = useAuth();
  const studentData = useStudentData();

  if (studentData.isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  const {
    activeProgram,
    currentMilestone,
    currentActivity,
    nextActivity,
    metrics,
    attentionItems,
    upcomingItems,
    reviews,
    milestones,
  } = studentData;

  const latestReview = reviews[0];

  return (
    <div className="space-y-8">
      {/* 1. Welcome & Primary Learning State Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Welcome back, {user?.fullName || 'Student'}
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          {activeProgram
            ? `Enrolled in ${activeProgram.name} • Personalized Learning Journey`
            : 'Explore your academy roadmap, upcoming reviews, and milestone deliverables.'}
        </p>
      </div>

      {/* 2. Hero: Current Learning Journey & Immediate Next Action */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-devoc-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="brand" size="sm">
                Active Journey
              </Badge>
              <span className="font-mono text-[11px] text-devoc-text-tertiary">
                {activeProgram?.code || 'ACADEMY-V1'}
              </span>
            </div>
            <h2 className="text-base font-bold text-devoc-text-primary mt-1.5">
              {currentMilestone ? currentMilestone.title : 'Initial Academy Orientation'}
            </h2>
            <p className="text-xs text-devoc-text-secondary mt-0.5 max-w-xl leading-relaxed">
              {currentMilestone?.description || 'Follow your personalized roadmap and deliver activities for review.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {currentActivity && (
              <Link href={`/learning/activities/${currentActivity.id}`}>
                <Button size="sm" variant="primary" className="text-xs h-9 px-4 font-semibold">
                  <span>Continue: {currentActivity.title}</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            <Link href="/learning/roadmap">
              <Button size="sm" variant="outline" className="text-xs h-9 px-3.5">
                <Compass className="mr-1.5 h-3.5 w-3.5" />
                Roadmap
              </Button>
            </Link>
          </div>
        </div>

        {/* Milestone Stepper */}
        <LearningJourneyProgress
          milestones={milestones}
          currentMilestoneId={currentMilestone?.id}
        />
      </div>

      {/* 3. Progress Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-lg border border-devoc-border bg-devoc-card p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Overall Progress
          </span>
          <span className="text-xl font-bold font-mono text-devoc-brand mt-1 block">
            {metrics.programProgressPercent}%
          </span>
          <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">Curriculum pace</span>
        </div>

        <div className="rounded-lg border border-devoc-border bg-devoc-card p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Milestones
          </span>
          <span className="text-xl font-bold font-mono text-devoc-text-primary mt-1 block">
            {metrics.milestonesCompleted} / {metrics.milestonesTotal}
          </span>
          <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">Approved deliverables</span>
        </div>

        <div className="rounded-lg border border-devoc-border bg-devoc-card p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Activities
          </span>
          <span className="text-xl font-bold font-mono text-devoc-text-primary mt-1 block">
            {metrics.activitiesCompleted} / {metrics.activitiesTotal}
          </span>
          <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">Completed items</span>
        </div>

        <div className="rounded-lg border border-devoc-border bg-devoc-card p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Assessments
          </span>
          <span className="text-xl font-bold font-mono text-devoc-text-primary mt-1 block">
            {metrics.assessmentsPassed} passed
          </span>
          <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">
            {metrics.assessmentsTaken} attempts submitted
          </span>
        </div>

        <div className="rounded-lg border border-devoc-border bg-devoc-card p-3.5 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Reviews Held
          </span>
          <span className="text-xl font-bold font-mono text-devoc-text-primary mt-1 block">
            {metrics.reviewsCount}
          </span>
          <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">Mentor syncs</span>
        </div>
      </div>

      {/* 4. Two-Column Context: Needs Attention & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <div className="rounded-lg border border-devoc-border bg-devoc-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold text-devoc-text-primary">Needs Your Attention</h3>
            </div>
            <span className="font-mono text-[10px] text-devoc-text-tertiary">
              {attentionItems.length} items
            </span>
          </div>

          {attentionItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-devoc-text-secondary">
              <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1.5" />
              <p className="font-medium text-devoc-text-primary">All caught up!</p>
              <p className="text-[11px] text-devoc-text-tertiary mt-0.5">No overdue activities or pending review feedback.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {attentionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-md border border-devoc-border/70 p-3 hover:border-devoc-border transition-colors bg-devoc-bg/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-devoc-text-primary line-clamp-1">
                        {item.title}
                      </span>
                      {item.badgeLabel && (
                        <Badge variant="warning" size="sm">
                          {item.badgeLabel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-devoc-text-secondary mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-devoc-text-tertiary shrink-0 self-center" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Reviews & Milestones */}
        <div className="rounded-lg border border-devoc-border bg-devoc-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-devoc-brand" />
              <h3 className="text-xs font-bold text-devoc-text-primary">Upcoming Milestones & Reviews</h3>
            </div>
            <Link href="/learning/roadmap" className="text-[11px] text-devoc-brand hover:underline font-medium">
              View All
            </Link>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-devoc-text-secondary">
              <p>No upcoming scheduled events.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-md border border-devoc-border/70 p-3 hover:border-devoc-border transition-colors bg-devoc-bg/40"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-devoc-text-primary line-clamp-1">
                      {item.title}
                    </span>
                    <p className="text-[11px] text-devoc-text-secondary mt-0.5 line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm" className="font-mono text-[10px] shrink-0 self-center">
                    {item.date}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Recent Mentor Feedback */}
      {latestReview && (
        <div className="rounded-lg border border-devoc-border bg-devoc-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-devoc-brand" />
              <h3 className="text-xs font-bold text-devoc-text-primary">Latest Mentor Feedback</h3>
            </div>
            <Link href="/learning/reviews" className="text-[11px] text-devoc-brand hover:underline font-medium">
              Review History
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-devoc-text-tertiary">
              <span>{latestReview.summary}</span>
              <span className="font-mono">{new Date(latestReview.reviewedAt).toLocaleDateString()}</span>
            </div>
            {latestReview.feedback && (
              <div className="rounded-md bg-devoc-bg/70 p-3 border border-devoc-border/50 text-devoc-text-secondary leading-relaxed">
                &ldquo;{latestReview.feedback}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
