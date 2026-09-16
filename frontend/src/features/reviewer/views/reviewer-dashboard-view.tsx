'use client';

import React from 'react';
import Link from 'next/link';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useReviewerQueue } from '../hooks/use-reviewer-queue';

export function ReviewerDashboardView() {
  const { queue, metrics, isLoading } = useReviewerQueue();

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

  const urgentItems = queue.filter((i) => i.attentionUrgency === 'high');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Reviewer Workspace
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Evaluate milestone deliverables, review code submissions, and issue authoritative progression guidance.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Review Queue
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-devoc-brand">{metrics.queueCount}</span>
            <ListTodo className="h-4 w-4 text-devoc-brand" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Students requiring review</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Urgent / Overdue
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-amber-500">{urgentItems.length}</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">&gt;14 days or initial review</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Reviews Completed
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-500">
              {metrics.completedReviewsCount}
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Historical M7 evaluations</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Active Candidates
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-devoc-text-primary">{metrics.studentsCount}</span>
            <Users className="h-4 w-4 text-devoc-text-secondary" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">In enrolled curriculum</span>
        </Card>
      </div>

      {/* Review Queue Triage Table */}
      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-devoc-brand" />
              Prioritized Review Queue
            </CardTitle>
            <CardDescription className="text-xs">
              Students ordered by urgency, days since last evaluation, and pending milestone deliverables.
            </CardDescription>
          </div>
          <Link href="/reviewer/queue">
            <Button variant="outline" size="sm" className="text-xs h-8">
              Full Queue Table <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {queue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-y border-devoc-border">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Program</th>
                    <th className="py-2.5 px-4">Current Milestone</th>
                    <th className="py-2.5 px-4">Days Since Review</th>
                    <th className="py-2.5 px-4">Urgency</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {queue.slice(0, 5).map((item) => (
                    <tr key={item.enrollmentId} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-devoc-text-primary">{item.studentName}</div>
                        <div className="text-[11px] font-mono text-devoc-text-tertiary">{item.studentEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-devoc-text-secondary">
                        {item.programName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-devoc-text-primary font-medium">{item.currentMilestoneTitle}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-devoc-text-secondary">
                        {item.daysSinceLastReview} days
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={item.attentionUrgency === 'high' ? 'brand' : 'outline'}
                          size="sm"
                          className="capitalize text-[10px] uppercase font-mono"
                        >
                          {item.attentionUrgency}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/reviewer/reviews/new?enrollmentId=${item.enrollmentId}`}>
                          <Button variant="primary" size="sm" className="h-7 text-xs">
                            Start Review
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
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">Review queue is up to date.</p>
              <p className="text-[11px]">No student reviews currently require evaluation.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
