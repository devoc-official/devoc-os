'use client';

import React from 'react';
import { useFounderAcademy } from '../hooks/use-founder-academy';
import { StatusBadge } from '../../../components/data/status-badge';
import { DataTable, Column } from '../../../components/data/data-table';
import { GraduationCap, BookOpen, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { LearningEnrollment } from '../../../api/learning.api';

export function FounderAcademyView() {
  const {
    programs,
    enrollments,
    activeStudents,
    completedStudents,
    reviews,
    peopleMap,
    programMap,
    mentorAssignments,
    obligations,
    totalFeeGross,
    totalFeeCollected,
    totalFeeOutstanding,
    isLoading,
  } = useFounderAcademy();

  const columns: Column<LearningEnrollment>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (e) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">
            {peopleMap?.get(e.personId) || `#${e.personId?.slice(0, 8) || 'unknown'}`}
          </div>
          <span className="text-[10px] font-mono text-devoc-text-muted">
            Enrolled: {e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : 'Active'}
          </span>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Learning Program',
      render: (e) => (
        <span className="text-xs text-devoc-text-secondary font-medium">
          {programMap?.get(e.learningProgramId) || 'Self-Paced Curriculum'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Enrollment Status',
      width: '120px',
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: 'expectedEnd',
      header: 'Target Completion',
      width: '140px',
      align: 'right',
      render: (e) => (
        <span className="font-mono text-xs text-devoc-text-secondary">
          {e.expectedEndAt ? new Date(e.expectedEndAt).toLocaleDateString() : 'Self-paced'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-devoc-accent" />
          Academy Operations & Economics
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Holistic visibility into curriculum programs, student enrollments, milestone review queues, and M9 fee collections.
        </p>
      </div>

      {/* Academy Economics (M9 Finance Data) */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-devoc-accent" />
          Academy Fee Economics (M9 Finance Engine)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">
              Total Contracted Fee Obligations
            </span>
            <div className="text-base font-bold font-mono text-devoc-text-primary">
              ₹{(totalFeeGross || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-devoc-text-muted">{obligations.length} total student fee schedules</p>
          </div>

          <div className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">
              Collected Tuition Fees
            </span>
            <div className="text-base font-bold font-mono text-emerald-600">
              ₹{(totalFeeCollected || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-devoc-text-muted">Settled via M9 posted transactions</p>
          </div>

          <div className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">
              Outstanding Receivable Balance
            </span>
            <div className="text-base font-bold font-mono text-amber-600">
              ₹{(totalFeeOutstanding || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-devoc-text-muted">Scheduled installments and EMIs</p>
          </div>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">Active Programs</span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">{programs.length}</div>
        </div>
        <div className="p-3 rounded border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">Active Students</span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">{activeStudents.length}</div>
        </div>
        <div className="p-3 rounded border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">Graduated Students</span>
          <div className="text-base font-bold font-mono text-emerald-600">{completedStudents.length}</div>
        </div>
        <div className="p-3 rounded border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">Active Mentors</span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">{mentorAssignments.length}</div>
        </div>
      </div>

      {/* Student Enrollments Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
          Student Enrollment Roster
        </h2>

        <DataTable
          columns={columns}
          data={enrollments}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No enrollments found"
          emptyDescription="No student enrollments registered in the organization."
        />
      </div>
    </div>
  );
}
