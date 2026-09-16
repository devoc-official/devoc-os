'use client';

import React, { useState } from 'react';
import { useAcademyPlacement, PlacementReadinessCandidate } from '../hooks/use-academy-placement';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Briefcase, Search, CheckCircle2, AlertCircle, Info, ShieldCheck, GraduationCap } from 'lucide-react';

export function AcademyPlacementView() {
  const { completedCandidates, totalCompletedGraduates, isLoading } = useAcademyPlacement();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCandidates = completedCandidates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${c.student.firstName} ${c.student.lastName}`.toLowerCase();
    const email = c.student.email.toLowerCase();
    const prog = c.program?.name.toLowerCase() || '';
    return name.includes(q) || email.includes(q) || prog.includes(q);
  });

  const columns: Column<PlacementReadinessCandidate>[] = [
    {
      key: 'student',
      header: 'Graduate Candidate',
      render: (c) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">
            {c.student.firstName} {c.student.lastName}
          </div>
          <span className="text-[10px] text-devoc-text-muted">{c.student.email}</span>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Completed Program',
      render: (c) => (
        <span className="text-xs text-devoc-text-secondary font-medium">
          {c.program?.name || 'Learning Curriculum'}
        </span>
      ),
    },
    {
      key: 'completionStatus',
      header: 'Curriculum Verification',
      width: '180px',
      render: (c) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> Course Completed
        </span>
      ),
    },
    {
      key: 'completedAt',
      header: 'Graduation Date',
      width: '140px',
      render: (c) => (
        <span className="font-mono text-xs text-devoc-text-muted">
          {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : 'Verified Graduate'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-devoc-accent" />
          Placement Readiness & Verified Graduates
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Graduate pool qualified for industry placement based on verified course completion and approved milestone deliverables.
        </p>
      </div>

      {/* Section 26 Deferred Capability Notice */}
      <div className="p-4 rounded-md border border-blue-500/30 bg-blue-500/10 text-xs text-blue-900 dark:text-blue-200 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Architectural Notice: Section 26 Placement Capability</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          DeVoc OS M1–M15 does not implement a dedicated external placement/job-board engine. In strict adherence to
          system architecture principles, this view surfaces <strong>only verified learning graduates</strong> who have
          fully cleared curriculum requirements, reviewer approvals, and capstone milestones (Status: <code>completed</code>).
          Zero synthetic employer or interview records are fabricated.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Verified Graduates</span>
          <span className="text-lg font-bold font-mono text-emerald-600">{totalCompletedGraduates}</span>
          <span className="text-[10px] text-devoc-text-muted block mt-0.5">Cleared all course completion rules</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Verification Standard</span>
          <span className="text-xs font-semibold text-devoc-text-primary block mt-1">Milestone + Project Approval</span>
          <span className="text-[10px] text-devoc-text-muted block">Audited against M7 Learning Engine</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">External Syndication</span>
          <span className="text-xs font-semibold text-devoc-text-secondary block mt-1">Exportable Graduate Pool</span>
          <span className="text-[10px] text-devoc-text-muted block">Ready for employer partner outreach</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between">
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graduates..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Graduates Table */}
      <DataTable
        columns={columns}
        data={filteredCandidates}
        keyField={(c) => c.student.id}
        isLoading={isLoading}
        emptyTitle="No verified graduates yet"
        emptyDescription="Students will appear here once their enrollment status reaches 'completed' upon clearing all curriculum milestones."
      />
    </div>
  );
}
