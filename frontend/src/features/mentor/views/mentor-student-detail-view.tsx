'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  Compass,
  MessageSquare,
  AlertCircle,
  FileText,
  FolderGit2,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { Avatar } from '../../../components/ui/avatar';
import { LearningJourneyProgress } from '../../student/components/learning-journey-progress';
import { StudentContextPanel } from '../../shared/student-context-panel';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { peopleApi } from '../../../api/people.api';
import { learningApi, LearningEnrollment, LearningProgram, EnrollmentMilestone, LearningActivity, LearningReview } from '../../../api/learning.api';

interface MentorStudentDetailViewProps {
  studentId: string;
}

export function MentorStudentDetailView({ studentId }: MentorStudentDetailViewProps) {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;

  const { data, isLoading } = useQuery({
    queryKey: ['mentor', 'student-detail', orgId, studentId],
    queryFn: async () => {
      if (!orgId || !studentId) return null;

      const student = await peopleApi.getPerson(orgId, studentId);
      const enrollments = await learningApi.listPersonEnrollments(orgId, studentId);
      const activeEnrollment = enrollments.find((e) => e.status === 'active') || enrollments[0] || null;

      let program: LearningProgram | null = null;
      let milestones: EnrollmentMilestone[] = [];
      let activities: LearningActivity[] = [];
      let reviews: LearningReview[] = [];

      if (activeEnrollment) {
        [program, milestones, activities, reviews] = await Promise.all([
          learningApi.getProgramById(orgId, activeEnrollment.learningProgramId).catch(() => null),
          learningApi.listEnrollmentMilestones(orgId, activeEnrollment.id).catch(() => []),
          learningApi.listEnrollmentActivities(orgId, activeEnrollment.id).catch(() => []),
          learningApi.listReviews(orgId, activeEnrollment.id).catch(() => []),
        ]);
      }

      const currentMilestone = milestones.find((m) => m.status === 'active') || milestones[0] || null;

      return {
        student,
        enrollment: activeEnrollment,
        program,
        milestones,
        currentMilestone,
        activities,
        reviews,
      };
    },
    enabled: Boolean(orgId && studentId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-devoc-text-secondary">Student not found or inaccessible.</p>
        <Link href="/mentor/students">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to My Students
          </Button>
        </Link>
      </div>
    );
  }

  const { student, enrollment, program, milestones, currentMilestone, activities, reviews } = data;

  return (
    <div className="space-y-8">
      {/* Top Navigation Backlink */}
      <div>
        <Link href="/mentor/students">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-devoc-text-secondary px-0">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to My Students
          </Button>
        </Link>
      </div>

      {/* Student Context Hero */}
      <StudentContextPanel
        student={student}
        enrollment={enrollment}
        program={program}
        milestones={milestones}
        currentMilestone={currentMilestone}
        mentorName="You (Assigned Mentor)"
        lastReview={reviews[0] || null}
        showActions={false}
      />

      {/* Learning Journey Progression */}
      {milestones.length > 0 && (
        <Card className="border-devoc-border bg-devoc-surface">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <Compass className="h-4 w-4 text-devoc-brand" />
              Personalized Learning Journey
            </CardTitle>
            <CardDescription className="text-xs">
              Authoritative progression across program milestones.
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

      {/* 2-Column Operational Grid: Current Activities & Review History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Milestone Deliverables */}
        <Card className="border-devoc-border bg-devoc-surface">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-devoc-brand" />
              Current Deliverables & Activities
            </CardTitle>
            <CardDescription className="text-xs">
              Activities linked to current milestone: {currentMilestone?.title || 'Foundations'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {activities.length > 0 ? (
              <div className="divide-y divide-devoc-border/60">
                {activities.map((act) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-medium text-devoc-text-primary block">{act.title}</span>
                      <span className="text-[11px] text-devoc-text-secondary capitalize font-mono">
                        {act.activityType}
                      </span>
                    </div>
                    <Badge
                      variant={act.status === 'completed' ? 'brand' : 'outline'}
                      size="sm"
                      className="capitalize text-[10px]"
                    >
                      {act.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-devoc-text-tertiary">No activities currently defined for this milestone.</p>
            )}
          </CardContent>
        </Card>

        {/* Mentor Reviews Timeline */}
        <Card className="border-devoc-border bg-devoc-surface">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-devoc-brand" />
              Review History & Guidance
            </CardTitle>
            <CardDescription className="text-xs">
              Prior mentor review syncs and qualitative guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-md bg-devoc-surface-hover/40 border border-devoc-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-devoc-text-primary capitalize">{rev.reviewType.replace('_', ' ')}</span>
                      <span className="font-mono text-[10px] text-devoc-text-tertiary">
                        {new Date(rev.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-devoc-text-secondary">{rev.summary}</p>
                    {rev.feedback && (
                      <p className="text-[11px] text-devoc-text-tertiary italic pt-1 border-t border-devoc-border/40">
                        "{rev.feedback}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-devoc-text-tertiary">
                <p className="text-xs">No reviews recorded yet for this student.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
