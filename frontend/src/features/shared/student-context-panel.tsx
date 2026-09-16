'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  GraduationCap,
  Compass,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Avatar } from '../../components/ui/avatar';
import { LearningJourneyProgress } from '../student/components/learning-journey-progress';
import { EnrollmentMilestone, LearningEnrollment, LearningProgram, LearningReview } from '../../api/learning.api';
import { Person } from '../../api/people.api';
import { StudentSuggestion } from '../student/types/student.types';

export interface StudentContextPanelProps {
  student: Person;
  enrollment?: LearningEnrollment | null;
  program?: LearningProgram | null;
  milestones?: EnrollmentMilestone[];
  currentMilestone?: EnrollmentMilestone | null;
  mentorName?: string | null;
  lastReview?: LearningReview | null;
  openSuggestions?: StudentSuggestion[];
  showActions?: boolean;
  className?: string;
}

export function StudentContextPanel({
  student,
  enrollment,
  program,
  milestones = [],
  currentMilestone,
  mentorName,
  lastReview,
  openSuggestions = [],
  showActions = true,
  className = '',
}: StudentContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const progressPercent = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  return (
    <Card className={`border-devoc-border bg-devoc-surface transition-all ${className}`}>
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={`${student.firstName} ${student.lastName}`}
              size="md"
              className="bg-devoc-brand/10 text-devoc-brand font-semibold"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-devoc-text-primary">
                  {student.firstName} {student.lastName}
                </h3>
                <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                  {enrollment?.status || 'Active'}
                </Badge>
              </div>
              <p className="text-xs text-devoc-text-secondary font-mono">{student.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showActions && (
              <Link href={`/mentor/students/${student.id}`}>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  View Profile <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs h-8 text-devoc-text-secondary"
              aria-label={isExpanded ? 'Collapse student context' : 'Expand student context'}
            >
              {isExpanded ? (
                <>
                  Less <ChevronUp className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Details <ChevronDown className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Primary Operational Summary Line */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-devoc-border/60 text-xs">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">Program</span>
            <span className="font-medium text-devoc-text-primary truncate block mt-0.5">
              {program?.name || 'Full-Stack Track'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">Current Milestone</span>
            <span className="font-medium text-devoc-text-primary truncate block mt-0.5">
              {currentMilestone?.title || 'Foundations'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">Progress</span>
            <span className="font-mono text-devoc-brand font-semibold block mt-0.5">{progressPercent}%</span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">Assigned Mentor</span>
            <span className="font-medium text-devoc-text-primary truncate block mt-0.5">
              {mentorName || 'Unassigned'}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Progressive Disclosure: Rich Journey & Context Details */}
      {isExpanded && (
        <CardContent className="p-4 sm:p-5 pt-2 space-y-4 border-t border-devoc-border/60 text-xs bg-devoc-surface-hover/30">
          {milestones.length > 0 && (
            <div className="space-y-2 p-3 bg-devoc-surface rounded-md border border-devoc-border/70">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-devoc-brand" /> Learning Journey Progression
              </span>
              <LearningJourneyProgress
                milestones={milestones}
                currentMilestoneId={currentMilestone?.id}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Last Review Context */}
            <div className="p-3 bg-devoc-surface rounded-md border border-devoc-border/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-devoc-text-secondary" /> Last Review
                </span>
                {lastReview?.reviewedAt && (
                  <span className="text-[10px] font-mono text-devoc-text-tertiary">
                    {new Date(lastReview.reviewedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {lastReview ? (
                <div>
                  <p className="text-xs font-medium text-devoc-text-primary line-clamp-2">{lastReview.summary}</p>
                  {lastReview.feedback && (
                    <p className="text-[11px] text-devoc-text-secondary line-clamp-2 mt-1 italic">
                      "{lastReview.feedback}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-devoc-text-tertiary">No reviews conducted yet.</p>
              )}
            </div>

            {/* Open Suggestions */}
            <div className="p-3 bg-devoc-surface rounded-md border border-devoc-border/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Open Suggestions ({openSuggestions.length})
                </span>
              </div>
              {openSuggestions.length > 0 ? (
                <ul className="space-y-1">
                  {openSuggestions.slice(0, 2).map((s) => (
                    <li key={s.id} className="text-[11px] text-devoc-text-secondary flex items-start gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span className="line-clamp-1">{s.text}</span>
                    </li>
                  ))}
                  {openSuggestions.length > 2 && (
                    <p className="text-[10px] text-devoc-text-tertiary">+{openSuggestions.length - 2} more suggestions</p>
                  )}
                </ul>
              ) : (
                <p className="text-[11px] text-devoc-text-tertiary">All suggestions resolved.</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
