'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Users, ExternalLink, Filter, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMentorStudents } from '../hooks/use-mentor-students';

export function MentorStudentsView() {
  const { students, isLoading } = useMentorStudents();
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.currentMilestoneTitle.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, search, statusFilter]);

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
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          My Students
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Complete operational roster of students assigned to your mentorship guidance.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-devoc-border bg-devoc-surface">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-devoc-text-tertiary" />
            <Input
              placeholder="Search by student name, email, milestone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-devoc-text-tertiary" />
            <span className="text-[11px] text-devoc-text-tertiary uppercase font-mono">Status:</span>
            {['all', 'active', 'paused', 'completed'].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="text-xs h-7 capitalize px-2.5"
              >
                {st}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Roster Table */}
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
                    <th className="py-2.5 px-4">Overall Progress</th>
                    <th className="py-2.5 px-4">Last Review</th>
                    <th className="py-2.5 px-4">Enrollment</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {filteredStudents.map((st) => (
                    <tr key={st.personId} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-devoc-text-primary">{st.studentName}</div>
                        <div className="text-[11px] font-mono text-devoc-text-tertiary">{st.email}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-devoc-text-secondary">
                        {st.programName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-devoc-text-primary block font-medium">{st.currentMilestoneTitle}</span>
                        {st.attentionReason && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block">
                            {st.attentionReason}
                          </span>
                        )}
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
                        {st.lastReviewDate ? new Date(st.lastReviewDate).toLocaleDateString() : 'None'}
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
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Open Workspace <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
              <p className="text-[11px]">Try adjusting your search query or status filter.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
