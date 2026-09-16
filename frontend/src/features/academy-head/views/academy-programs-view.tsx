'use client';

import React, { useState } from 'react';
import { useAcademyPrograms } from '../hooks/use-academy-programs';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { BookOpen, Search, Users, CheckCircle2, PauseCircle } from 'lucide-react';
import { LearningProgram } from '../../../api/learning.api';

interface ProgramStatRow {
  program: LearningProgram;
  totalEnrolled: number;
  activeCount: number;
  completedCount: number;
  pausedCount: number;
}

export function AcademyProgramsView() {
  const { programStats, isLoading } = useAcademyPrograms();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStats = programStats.filter((ps) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ps.program.name.toLowerCase().includes(q) || ps.program.code.toLowerCase().includes(q);
  });

  const columns: Column<ProgramStatRow>[] = [
    {
      key: 'code',
      header: 'Program Code',
      width: '140px',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-secondary">
          {r.program.code}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Program Curriculum',
      render: (r) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">{r.program.name}</div>
          {r.program.description && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{r.program.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Curriculum Status',
      width: '130px',
      render: (r) => <StatusBadge status={r.program.status} />,
    },
    {
      key: 'totalEnrolled',
      header: 'Total Enrolled',
      width: '120px',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-devoc-text-primary">
          {r.totalEnrolled} students
        </span>
      ),
    },
    {
      key: 'activeCount',
      header: 'Actively Learning',
      width: '130px',
      render: (r) => (
        <span className="font-mono text-xs font-medium text-devoc-accent">
          {r.activeCount} active
        </span>
      ),
    },
    {
      key: 'completedCount',
      header: 'Graduated',
      width: '120px',
      render: (r) => (
        <span className="font-mono text-xs font-medium text-emerald-600">
          {r.completedCount} completed
        </span>
      ),
    },
    {
      key: 'pausedCount',
      header: 'Paused',
      width: '100px',
      render: (r) => (
        <span className="font-mono text-xs text-devoc-text-muted">{r.pausedCount}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-devoc-accent" />
          Academy Programs & Curricula
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Authorized learning programs, self-paced roadmaps, student cohort distributions, and graduation outcomes.
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
              placeholder="Search program..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Programs Table */}
      <DataTable
        columns={columns}
        data={filteredStats}
        keyField={(r) => r.program.id}
        isLoading={isLoading}
        emptyTitle="No learning programs found"
        emptyDescription="No curricula match your search criteria."
      />
    </div>
  );
}
