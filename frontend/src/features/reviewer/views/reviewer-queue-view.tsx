'use client';

import React from 'react';
import Link from 'next/link';
import { Search, ListTodo, Filter, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useReviewerQueue } from '../hooks/use-reviewer-queue';

export function ReviewerQueueView() {
  const {
    queue,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedUrgency,
    setSelectedUrgency,
  } = useReviewerQueue();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Review Queue
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Triage and prioritize students awaiting milestone evaluations, code reviews, and progression approvals.
        </p>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-devoc-border bg-devoc-surface">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-devoc-text-tertiary" />
            <Input
              placeholder="Search by student, email, milestone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-devoc-text-tertiary" />
            <span className="text-[11px] text-devoc-text-tertiary uppercase font-mono">Urgency:</span>
            {['all', 'high', 'medium', 'low'].map((urg) => (
              <Button
                key={urg}
                variant={selectedUrgency === urg ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedUrgency(urg)}
                className="text-xs h-7 capitalize px-2.5"
              >
                {urg}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Operational Table */}
      <Card className="border-devoc-border bg-devoc-surface">
        <CardContent className="p-0">
          {queue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-b border-devoc-border">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Program Track</th>
                    <th className="py-2.5 px-4">Current Milestone</th>
                    <th className="py-2.5 px-4">Days Since Sync</th>
                    <th className="py-2.5 px-4">Submission Status</th>
                    <th className="py-2.5 px-4">Urgency</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {queue.map((item) => (
                    <tr key={item.enrollmentId} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-devoc-text-primary">{item.studentName}</div>
                        <div className="text-[11px] font-mono text-devoc-text-tertiary">{item.studentEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-devoc-text-secondary font-medium">
                        {item.programName}
                      </td>
                      <td className="py-3 px-4 font-medium text-devoc-text-primary">
                        {item.currentMilestoneTitle}
                      </td>
                      <td className="py-3 px-4 font-mono text-devoc-text-secondary">
                        {item.daysSinceLastReview} days
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm" className="capitalize text-[10px] font-mono">
                          {item.submissionStatus}
                        </Badge>
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
                            Evaluate <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
              <p className="text-xs font-medium text-devoc-text-secondary">No items in the review queue.</p>
              <p className="text-[11px]">All student milestones have been evaluated.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
