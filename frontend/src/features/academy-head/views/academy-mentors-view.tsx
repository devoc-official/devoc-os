'use client';

import React, { useState } from 'react';
import { useAcademyMentors, MentorWorkloadInfo } from '../hooks/use-academy-mentors';
import { DataTable, Column } from '../../../components/data/data-table';
import { Input } from '../../../components/ui/input';
import { UserCheck, Search, Users, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function AcademyMentorsView() {
  const { mentorWorkloads, isLoading } = useAcademyMentors();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMentors = mentorWorkloads.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${m.mentor.firstName} ${m.mentor.lastName}`.toLowerCase();
    const email = m.mentor.email.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const columns: Column<MentorWorkloadInfo>[] = [
    {
      key: 'mentor',
      header: 'Mentor',
      render: (r) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">
            {r.mentor.firstName} {r.mentor.lastName}
          </div>
          <span className="text-[10px] text-devoc-text-muted">{r.mentor.email}</span>
        </div>
      ),
    },
    {
      key: 'assignedStudents',
      header: 'Assigned Mentees',
      width: '150px',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-devoc-text-primary flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-devoc-accent" />
          {r.assignedStudentIds.length} student{r.assignedStudentIds.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'capacity',
      header: 'Weekly Capacity',
      width: '140px',
      render: (r) => (
        <span className="font-mono text-xs text-devoc-text-secondary">
          {r.totalCapacityHours > 0 ? `${r.totalCapacityHours} hrs/week` : 'Flexible'}
        </span>
      ),
    },
    {
      key: 'reviews',
      header: 'Review Cadence',
      width: '160px',
      render: (r) => (
        <div className="text-xs">
          <span className="text-emerald-600 font-mono font-medium">{r.completedReviewsCount} completed</span>
          {r.pendingReviewsCount > 0 && (
            <span className="text-amber-600 font-mono text-[11px] block">
              {r.pendingReviewsCount} pending
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Capacity Load',
      width: '140px',
      render: (r) => {
        const isOverloaded = r.assignedStudentIds.length > 5 || r.totalCapacityHours > 30;
        if (isOverloaded) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" /> Heavy Load
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Available Capacity
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-devoc-accent" />
          Mentor Allocation & Capacity Roster
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Active mentor pairings, allocated mentorship hours, weekly review cadences, and mentee distribution.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between">
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mentor..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Mentors Table */}
      <DataTable
        columns={columns}
        data={filteredMentors}
        keyField={(r) => r.mentor.id}
        isLoading={isLoading}
        emptyTitle="No mentors assigned"
        emptyDescription="No active mentor assignments currently registered in the system."
      />
    </div>
  );
}
