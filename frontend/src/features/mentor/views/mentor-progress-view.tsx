'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMentorStudents } from '../hooks/use-mentor-students';

export function MentorProgressView() {
  const { students, isLoading } = useMentorStudents();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const averageProgress =
    students.length > 0
      ? Math.round(students.reduce((acc, s) => acc + s.progressPercent, 0) / students.length)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Learning Progress Overview
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Comparative milestone velocity, deliverable completion, and review cadence adherence across mentees.
        </p>
      </div>

      {/* Cohort Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Average Mentee Progress
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-devoc-brand">{averageProgress}%</span>
            <TrendingUp className="h-4 w-4 text-devoc-brand" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Across all active enrollments</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Progressing Mentees
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-500">
              {students.filter((s) => s.progressPercent > 0).length}
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Active milestone deliverables</span>
        </Card>

        <Card className="p-4 border-devoc-border bg-devoc-surface">
          <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
            Completed Tracks
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-devoc-text-primary">
              {students.filter((s) => s.status === 'completed').length}
            </span>
            <Award className="h-4 w-4 text-devoc-brand" />
          </div>
          <span className="text-[11px] text-devoc-text-secondary mt-1 block">Program graduates</span>
        </Card>
      </div>

      {/* Progress Matrix Table */}
      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-devoc-text-primary">
            Mentee Progression Velocity
          </CardTitle>
          <CardDescription className="text-xs">
            Individual milestone completion and review cadence.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-y border-devoc-border">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Program Track</th>
                  <th className="py-2.5 px-4">Current Stage</th>
                  <th className="py-2.5 px-4">Milestone Progress</th>
                  <th className="py-2.5 px-4">Last Review Date</th>
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
                      <span className="text-devoc-text-primary font-medium">{st.currentMilestoneTitle}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-devoc-border overflow-hidden">
                          <div
                            className="h-full bg-devoc-brand rounded-full transition-all"
                            style={{ width: `${st.progressPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-devoc-text-primary">
                          {st.progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-devoc-text-secondary font-mono text-[11px]">
                      {st.lastReviewDate ? new Date(st.lastReviewDate).toLocaleDateString() : 'None'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/mentor/students/${st.personId}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Inspect <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
