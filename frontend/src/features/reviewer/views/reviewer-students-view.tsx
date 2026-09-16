'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Users, ExternalLink, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useReviewerQueue } from '../hooks/use-reviewer-queue';

export function ReviewerStudentsView() {
  const { allQueue, isLoading } = useReviewerQueue();
  const [search, setSearch] = useState<string>('');

  const filteredStudents = useMemo(() => {
    return allQueue.filter((s) => {
      return (
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
        s.currentMilestoneTitle.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [allQueue, search]);

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
          Reviewee Students
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Directory of enrolled students across active learning programs available for milestone evaluations.
        </p>
      </div>

      <Card className="p-4 border-devoc-border bg-devoc-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-devoc-text-tertiary" />
          <Input
            placeholder="Search by student, email, milestone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </Card>

      <Card className="border-devoc-border bg-devoc-surface">
        <CardContent className="p-0">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-b border-devoc-border">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Program Track</th>
                    <th className="py-2.5 px-4">Current Milestone</th>
                    <th className="py-2.5 px-4">Last Sync</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {filteredStudents.map((st) => (
                    <tr key={st.enrollmentId} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-devoc-text-primary">{st.studentName}</div>
                        <div className="text-[11px] font-mono text-devoc-text-tertiary">{st.studentEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-devoc-text-secondary font-medium">
                        {st.programName}
                      </td>
                      <td className="py-3 px-4 font-medium text-devoc-text-primary">
                        {st.currentMilestoneTitle}
                      </td>
                      <td className="py-3 px-4 font-mono text-devoc-text-secondary text-[11px]">
                        {st.lastReviewDate ? new Date(st.lastReviewDate).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                          {st.submissionStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/reviewer/reviews/new?enrollmentId=${st.enrollmentId}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
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
              <Users className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No matching students found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
