'use client';

import React from 'react';
import Link from 'next/link';
import { UserCheck, Mail, Phone, Calendar, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { Person } from '../../../api/people.api';
import { Assignment } from '../../../api/assignments.api';
import { LearningReview } from '../../../api/learning.api';
import { Avatar } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

interface MentorCardProps {
  mentorPerson: Person | null;
  mentorAssignment: Assignment | null;
  reviews: LearningReview[];
}

export function MentorCard({
  mentorPerson,
  mentorAssignment,
  reviews,
}: MentorCardProps) {
  if (!mentorPerson && !mentorAssignment) {
    return (
      <div className="rounded-lg border border-devoc-border bg-devoc-card p-6 text-center">
        <UserCheck className="mx-auto h-8 w-8 text-devoc-text-tertiary mb-2" />
        <h4 className="text-xs font-semibold text-devoc-text-primary">No Mentor Assigned Yet</h4>
        <p className="text-xs text-devoc-text-secondary mt-1 max-w-sm mx-auto">
          Your learning coordinator will assign a dedicated mentor to guide your personalized journey and conduct milestone reviews.
        </p>
      </div>
    );
  }

  const fullName = mentorPerson
    ? `${mentorPerson.firstName} ${mentorPerson.lastName}`
    : 'Assigned Academy Mentor';

  const roleTitle = mentorAssignment?.roleContext || 'Academy Mentor & Technical Reviewer';

  return (
    <div className="rounded-lg border border-devoc-border bg-devoc-card p-5 space-y-4">
      {/* Mentor Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={fullName} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-devoc-text-primary">{fullName}</h3>
              <Badge variant="brand" size="sm">
                Active Mentor
              </Badge>
            </div>
            <p className="text-xs text-devoc-text-secondary mt-0.5">{roleTitle}</p>
          </div>
        </div>

        <Link href="/learning/mentor">
          <Button size="sm" variant="outline" className="text-xs h-8">
            View Mentorship Details
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-devoc-border/60 pt-4 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Contact
          </span>
          <span className="font-mono text-devoc-text-primary text-[11px] truncate block">
            {mentorPerson?.email || 'mentor@devoc.internal'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Review Cadence
          </span>
          <span className="text-devoc-text-primary text-[11px] flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-devoc-brand" />
            Weekly Syncs
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Completed Reviews
          </span>
          <span className="text-devoc-text-primary text-[11px] font-mono">
            {reviews.length} sessions held
          </span>
        </div>
      </div>
    </div>
  );
}
