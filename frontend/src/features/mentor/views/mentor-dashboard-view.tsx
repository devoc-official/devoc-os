'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  FileText,
  Compass,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMentorStudents } from '../hooks/use-mentor-students';

export function MentorDashboardView() {
  const { students, attentionItems, metrics, isLoading, mentorPerson } = useMentorStudents();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Mentor Workspace
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Guiding assigned mentees, conducting regular milestone reviews, and evaluating progress across the Academy.
        </p>
      </div>

      {/* Operational Metrics (Real M7/M3 data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Assigned Mentees
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-devoc-text-primary">
              {metrics.assignedStudentsCount}
            </span>
            <Users className="h-4 w-4 text-devoc-brand" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">
            {metrics.activeStudentsCount} active in curriculum
          </span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Reviews Completed
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-devoc-text-primary">
              {metrics.reviewsCompletedCount}
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Recorded to M7 history</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Reviews Due / Attention
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-amber-500">
              {metrics.pendingReviewsCount}
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Awaiting mentor follow-up</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Open Suggestions
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-devoc-text-primary">
              {metrics.unresolvedSuggestionsCount}
            </span>
            <FileText className="h-4 w-4 text-devoc-text-secondary" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Awaiting student resolution</span>
        </Card>
      </div>

      {/* Needs Attention Container */}
      {attentionItems.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold text-devoc-text-primary">
                Needs Your Attention ({attentionItems.length})
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-devoc-text-secondary">
              Students requiring scheduled review syncs, unblocking, or feedback follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-1 space-y-2">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-devoc-surface border border-devoc-border text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-devoc-text-primary">{item.studentName}</span>
                    <Badge variant="outline" size="sm" className="text-[10px] uppercase font-mono border-amber-500/40 text-amber-600 dark:text-amber-400">
                      {item.urgency}
                    </Badge>
                  </div>
                  <p className="text-devoc-text-secondary">{item.description}</p>
                </div>
                <Link href={item.href}>
                  <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs">
                    View Student <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Assigned Students Operational Table */}
      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <Users className="h-4 w-4 text-devoc-brand" />
              Assigned Mentees Overview
            </CardTitle>
            <CardDescription className="text-xs">
              Direct mentee relationships resolved via M3 Assignments and M7 Learning Engine.
            </CardDescription>
          </div>
          <Link href="/mentor/students">
            <Button variant="outline" size="sm" className="text-xs h-8">
              All Students Directory <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-y border-devoc-border">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Program</th>
                    <th className="py-2.5 px-4">Current Milestone</th>
                    <th className="py-2.5 px-4">Progress</th>
                    <th className="py-2.5 px-4">Last Review</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {students.map((st) => (
                    <tr key={st.personId} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-devoc-text-primary">{st.studentName}</div>
                        <div className="text-[11px] font-mono text-devoc-text-tertiary">{st.email}</div>
                      </td>
                      <td className="py-3 px-4 text-devoc-text-secondary font-medium">
                        {st.programName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-devoc-text-primary">{st.currentMilestoneTitle}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-devoc-border overflow-hidden">
                            <div
                              className="h-full bg-devoc-brand rounded-full"
                              style={{ width: `${st.progressPercent}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-devoc-text-secondary">
                            {st.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-devoc-text-secondary font-mono text-[11px]">
                        {st.lastReviewDate ? new Date(st.lastReviewDate).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={st.status === 'active' ? 'brand' : 'outline'}
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {st.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/mentor/students/${st.personId}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-devoc-text-tertiary space-y-2">
              <Users className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No students are currently assigned to you.</p>
              <p className="text-[11px]">Mentees assigned via M3 Assignments will automatically appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
