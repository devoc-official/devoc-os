'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, AlertCircle, Award, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useReviewerQueue } from '../hooks/use-reviewer-queue';

export function ReviewerAssessmentsView() {
  const { queue, isLoading } = useReviewerQueue();

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
          Assessments Overview
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Monitor milestone assessment submissions, attempt counts, and eligibility across candidate students.
        </p>
      </div>

      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-devoc-brand" />
            Milestone Assessment Submissions
          </CardTitle>
          <CardDescription className="text-xs">
            Authoritative assessment records configured in the M7 Learning Engine.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {queue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-y border-devoc-border">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Program Track</th>
                    <th className="py-2.5 px-4">Milestone</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {queue.map((item) => (
                    <tr key={item.enrollmentId} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-devoc-text-primary">{item.studentName}</div>
                        <div className="text-[11px] font-mono text-devoc-text-tertiary">{item.studentEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-devoc-text-secondary">
                        {item.programName}
                      </td>
                      <td className="py-3 px-4 text-devoc-text-primary">
                        {item.currentMilestoneTitle}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                          {item.submissionStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/reviewer/reviews/new?enrollmentId=${item.enrollmentId}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Evaluate Submission <ArrowRight className="h-3 w-3 ml-1" />
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
              <CheckCircle2 className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No assessment submissions pending review.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
