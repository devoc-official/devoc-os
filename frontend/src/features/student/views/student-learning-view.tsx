'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Compass,
  ArrowRight,
  CheckCircle2,
  Clock,
  History,
  AlertCircle,
} from 'lucide-react';
import { useEnrollment } from '../hooks/use-enrollment';
import { useRoadmap } from '../hooks/use-roadmap';
import { useMentor } from '../hooks/use-mentor';
import { LearningJourneyProgress } from '../components/learning-journey-progress';
import { MentorCard } from '../components/mentor-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentLearningView() {
  const {
    enrollments,
    activeEnrollment,
    historicalEnrollments,
    activeProgram,
    isLoading,
  } = useEnrollment();

  const {
    milestones,
    currentMilestone,
    completedMilestonesCount,
    totalMilestonesCount,
    completedActivitiesCount,
    totalActivitiesCount,
    overallProgressPercent,
  } = useRoadmap();

  const { mentorPerson, mentorAssignment, mentorReviews } = useMentor(activeEnrollment?.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          My Learning
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Enrolled academy programs, personalized curriculum roadmap, and mentor support.
        </p>
      </div>

      {/* 1. Active Program & Enrollment */}
      {activeEnrollment && activeProgram ? (
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 space-y-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-devoc-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm" className="capitalize">
                  {activeEnrollment.status} Enrollment
                </Badge>
                <span className="font-mono text-[11px] text-devoc-text-tertiary">
                  {activeProgram.code}
                </span>
              </div>
              <h2 className="text-lg font-bold text-devoc-text-primary mt-1.5">
                {activeProgram.name}
              </h2>
              <p className="text-xs text-devoc-text-secondary mt-1 max-w-2xl leading-relaxed">
                {activeProgram.description || 'Mastering full-stack software development, architectural design, and modern production standards.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link href="/learning/roadmap">
                <Button size="sm" variant="primary" className="text-xs h-9">
                  <Compass className="mr-1.5 h-3.5 w-3.5" />
                  View Full Roadmap
                </Button>
              </Link>
            </div>
          </div>

          {/* Progress Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-md bg-devoc-bg/60 p-3 border border-devoc-border/60">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Milestone Progress
              </span>
              <span className="text-base font-bold font-mono text-devoc-text-primary mt-1 block">
                {completedMilestonesCount} of {totalMilestonesCount}
              </span>
              <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">
                Currently in {currentMilestone?.title || 'Initial Stage'}
              </span>
            </div>

            <div className="rounded-md bg-devoc-bg/60 p-3 border border-devoc-border/60">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Activity Completion
              </span>
              <span className="text-base font-bold font-mono text-devoc-text-primary mt-1 block">
                {completedActivitiesCount} of {totalActivitiesCount}
              </span>
              <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">
                {overallProgressPercent}% completed
              </span>
            </div>

            <div className="rounded-md bg-devoc-bg/60 p-3 border border-devoc-border/60">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Enrollment Dates
              </span>
              <span className="font-mono text-devoc-text-primary text-[11px] mt-1 block">
                Started: {new Date(activeEnrollment.enrolledAt).toLocaleDateString()}
              </span>
              <span className="text-[10px] text-devoc-text-secondary mt-0.5 block">
                Expected: {activeEnrollment.expectedEndAt ? new Date(activeEnrollment.expectedEndAt).toLocaleDateString() : 'Self-paced progression'}
              </span>
            </div>
          </div>

          {/* Stepper */}
          <div className="pt-2">
            <LearningJourneyProgress
              milestones={milestones}
              currentMilestoneId={currentMilestone?.id}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-8 text-center space-y-3">
          <BookOpen className="mx-auto h-10 w-10 text-devoc-text-tertiary" />
          <h3 className="text-sm font-bold text-devoc-text-primary">No Active Learning Program</h3>
          <p className="text-xs text-devoc-text-secondary max-w-sm mx-auto">
            You do not currently have an active learning enrollment. Contact your academy coordinator to enroll in a program.
          </p>
        </div>
      )}

      {/* 2. Mentor Context Card */}
      <MentorCard
        mentorPerson={mentorPerson}
        mentorAssignment={mentorAssignment}
        reviews={mentorReviews}
      />

      {/* 3. Historical Enrollments (Strict separation) */}
      {historicalEnrollments.length > 0 && (
        <div className="rounded-lg border border-devoc-border bg-devoc-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-devoc-border/60 pb-3">
            <History className="h-4 w-4 text-devoc-text-secondary" />
            <h3 className="text-xs font-bold text-devoc-text-primary">
              Historical & Past Enrollments
            </h3>
            <span className="font-mono text-[10px] text-devoc-text-tertiary">
              ({historicalEnrollments.length})
            </span>
          </div>

          <div className="divide-y divide-devoc-border/60 text-xs">
            {historicalEnrollments.map((he) => (
              <div key={he.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-devoc-text-primary">
                      Program Enrollment #{he.id.slice(0, 8)}
                    </span>
                    <Badge variant="neutral" size="sm" className="capitalize">
                      {he.status}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-devoc-text-tertiary font-mono block mt-0.5">
                    Enrolled: {new Date(he.enrolledAt).toLocaleDateString()}
                    {he.completedAt && ` • Completed: ${new Date(he.completedAt).toLocaleDateString()}`}
                    {he.withdrawnAt && ` • Withdrawn: ${new Date(he.withdrawnAt).toLocaleDateString()}`}
                  </span>
                </div>

                <Button variant="ghost" size="sm" className="text-xs h-7 text-devoc-text-secondary">
                  View Archive
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
