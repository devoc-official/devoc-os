'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Compass,
  FileCode,
  GitCommit,
  FolderGit2,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { Avatar } from '../../../components/ui/avatar';
import { LearningJourneyProgress } from '../../student/components/learning-journey-progress';
import { StudentContextPanel } from '../../shared/student-context-panel';
import { ChangesSinceReviewPanel } from '../components/changes-since-review-panel';
import { ReviewForm } from '../components/review-form';
import { useReviewWorkspace } from '../hooks/use-review-workspace';

interface ReviewerWorkspaceViewProps {
  enrollmentId?: string;
  reviewId?: string;
}

export function ReviewerWorkspaceView({ enrollmentId, reviewId }: ReviewerWorkspaceViewProps) {
  const { workspace, isLoading, submitReview, isSubmitting } = useReviewWorkspace(enrollmentId, reviewId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-devoc-text-secondary">
          Review context could not be loaded. Please ensure a valid enrollment is selected.
        </p>
        <Link href="/reviewer/queue">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Review Queue
          </Button>
        </Link>
      </div>
    );
  }

  const {
    student,
    enrollment,
    program,
    milestones,
    currentMilestone,
    currentActivity,
    previousReview,
    previousSuggestions,
    reviewChanges,
    currentEvidence,
    assessments,
  } = workspace;

  return (
    <div className="space-y-8">
      {/* Top Backlink Navigation */}
      <div>
        <Link href="/reviewer/queue">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-devoc-text-secondary px-0">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Review Queue
          </Button>
        </Link>
      </div>

      {/* 1. Header: Student & Program Identity Context Panel */}
      <StudentContextPanel
        student={student}
        enrollment={enrollment}
        program={program}
        milestones={milestones}
        currentMilestone={currentMilestone}
        lastReview={previousReview}
        openSuggestions={previousSuggestions}
        showActions={false}
      />

      {/* 2. Current Journey: Visual Learning Journey Stepper */}
      {milestones.length > 0 && (
        <Card className="border-devoc-border bg-devoc-surface">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <Compass className="h-4 w-4 text-devoc-brand" />
              Authoritative Learning Journey
            </CardTitle>
            <CardDescription className="text-xs">
              Highlighting current milestone stage: {currentMilestone?.title || 'Core Foundations'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <LearningJourneyProgress
              milestones={milestones}
              currentMilestoneId={currentMilestone?.id}
            />
          </CardContent>
        </Card>
      )}

      {/* 3. Operational Grid: Left Column = Prior Context & Current Evidence; Right Column = Evaluation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {/* Changes Since Previous Review Panel (Prior Advice -> Student Action -> Roadmap Changes) */}
          <ChangesSinceReviewPanel
            previousReview={previousReview}
            previousSuggestions={previousSuggestions}
            reviewChanges={reviewChanges}
          />

          {/* Current Work & Submission Evidence Panel */}
          <Card className="border-devoc-border bg-devoc-surface">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
                <FileCode className="h-4 w-4 text-devoc-brand" />
                Current Work & Submission Evidence
              </CardTitle>
              <CardDescription className="text-xs">
                Deliverables, activity instructions, and connected repository work.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-4 text-xs">
              {currentActivity && (
                <div className="p-3 bg-devoc-surface-hover/30 rounded-md border border-devoc-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-devoc-text-primary">{currentActivity.title}</span>
                    <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                      {currentActivity.status}
                    </Badge>
                  </div>
                  {currentActivity.description && (
                    <p className="text-devoc-text-secondary">{currentActivity.description}</p>
                  )}
                </div>
              )}

              {/* Project & Task Deliverables (M4 / M5) */}
              {currentEvidence.projects.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                    Connected Project Deliverables
                  </span>
                  <div className="space-y-2">
                    {currentEvidence.projects.map((proj) => (
                      <div key={proj.id} className="p-3 rounded-md border border-devoc-border bg-devoc-surface flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="h-3.5 w-3.5 text-devoc-brand" />
                            <span className="font-medium text-devoc-text-primary">{proj.name}</span>
                          </div>
                          {proj.description && (
                            <p className="text-[11px] text-devoc-text-secondary">{proj.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                          {proj.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center border border-dashed border-devoc-border/80 rounded-md text-devoc-text-tertiary">
                  <p className="text-[11px]">No external project repositories linked.</p>
                </div>
              )}

              {/* Assessment Context */}
              {assessments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                    Milestone Assessments ({assessments.length})
                  </span>
                  <div className="space-y-1.5">
                    {assessments.map((ass) => (
                      <div key={ass.id} className="p-2.5 rounded-md border border-devoc-border/70 flex items-center justify-between">
                        <span className="font-medium text-devoc-text-primary">{ass.title}</span>
                        <Badge variant="outline" size="sm" className="text-[10px] font-mono">
                          Max: {ass.maxScore} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Reviewer Evaluation & Progression Decision Form */}
        <div>
          <ReviewForm
            currentMilestones={milestones}
            currentMilestoneId={currentMilestone?.id}
            isSubmitting={isSubmitting}
            onSubmit={async (data) => {
              await submitReview(data);
            }}
          />
        </div>
      </div>
    </div>
  );
}
