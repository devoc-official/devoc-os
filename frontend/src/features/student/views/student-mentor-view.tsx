'use client';

import React from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Mail,
  Phone,
  Calendar,
  Clock,
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useEnrollment } from '../hooks/use-enrollment';
import { useMentor } from '../hooks/use-mentor';
import { ReviewHistoryTimeline } from '../components/review-history-timeline';
import { Avatar } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentMentorView() {
  const { activeEnrollment, activeProgram } = useEnrollment();
  const { mentorPerson, mentorAssignment, mentorReviews, hasMentor, isLoading } =
    useMentor(activeEnrollment?.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!hasMentor) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            My Mentor
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Personalized guidance, weekly reviews, and milestone approvals.
          </p>
        </div>

        <div className="rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-3">
          <UserCheck className="mx-auto h-10 w-10 text-devoc-text-tertiary" />
          <h3 className="text-sm font-bold text-devoc-text-primary">No Mentor Assigned Yet</h3>
          <p className="text-xs text-devoc-text-secondary max-w-sm mx-auto">
            Your Academy coordinator will pair you with a mentor specialized in your technology stack and learning goals.
          </p>
        </div>
      </div>
    );
  }

  const fullName = mentorPerson
    ? `${mentorPerson.firstName} ${mentorPerson.lastName}`
    : 'Assigned Academy Mentor';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          My Mentor
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Your dedicated technical guide and review evaluator for {activeProgram?.name || 'Academy'}.
        </p>
      </div>

      {/* Mentor Profile Hero */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border/60 pb-5">
          <div className="flex items-center gap-4">
            <Avatar name={fullName} size="lg" className="h-16 w-16 text-base" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-devoc-text-primary">{fullName}</h2>
                <Badge variant="brand" size="sm">
                  Primary Mentor
                </Badge>
              </div>
              <p className="text-xs text-devoc-text-secondary mt-1">
                {mentorAssignment?.roleContext || 'Senior Academy Technical Lead & Mentor'}
              </p>
              <span className="text-[11px] font-mono text-devoc-text-tertiary block mt-0.5">
                {mentorPerson?.email || 'mentor@devoc.internal'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/learning/reviews">
              <Button size="sm" variant="outline" className="text-xs h-9">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                All Reviews ({mentorReviews.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Mentorship Responsibilities & Cadence Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-md bg-devoc-bg/60 p-3.5 border border-devoc-border/60 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
              Cadence & Review Sync
            </span>
            <span className="font-semibold text-devoc-text-primary flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5 text-devoc-brand" />
              Weekly Progress Evaluation
            </span>
            <span className="text-[10px] text-devoc-text-secondary block">
              1-on-1 milestone deliverables & roadmap calibration
            </span>
          </div>

          <div className="rounded-md bg-devoc-bg/60 p-3.5 border border-devoc-border/60 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
              Assignment Authority
            </span>
            <span className="font-semibold text-devoc-text-primary flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {mentorAssignment?.authorityType || 'Academy Head Delegated'}
            </span>
            <span className="text-[10px] text-devoc-text-secondary block">
              Authorized to approve milestone progression
            </span>
          </div>

          <div className="rounded-md bg-devoc-bg/60 p-3.5 border border-devoc-border/60 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
              Capacity Allocation
            </span>
            <span className="font-semibold font-mono text-devoc-text-primary flex items-center gap-1.5 mt-1">
              {mentorAssignment?.capacityValue || '5'} {mentorAssignment?.capacityUnit || 'students'}
            </span>
            <span className="text-[10px] text-devoc-text-secondary block">
              Subject to DeVoc capacity tracking
            </span>
          </div>
        </div>
      </div>

      {/* Reviews Conducted by this Mentor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-devoc-text-primary">
              Mentor Evaluation History
            </h3>
            <p className="text-xs text-devoc-text-secondary mt-0.5">
              Historical sync notes, progression decisions, and feedback provided by {fullName}.
            </p>
          </div>
        </div>

        <ReviewHistoryTimeline
          reviews={mentorReviews}
          reviewerNameMap={{ [mentorPerson?.id || '']: fullName }}
        />
      </div>
    </div>
  );
}
