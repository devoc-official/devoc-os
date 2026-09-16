'use client';

import React, { useState } from 'react';
import { useAcademyStudents, OperationalStudentRow } from '../hooks/use-academy-students';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { StudentContextPanel } from '../../shared/student-context-panel';
import { Users, Search, AlertTriangle, UserCheck, GraduationCap, ChevronRight } from 'lucide-react';

export function AcademyStudentsView() {
  const { studentRows, programs, isLoading } = useAcademyStudents();
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudentRow, setSelectedStudentRow] = useState<OperationalStudentRow | null>(null);

  const filteredRows = studentRows.filter((r) => {
    if (programFilter !== 'all' && r.enrollment.learningProgramId !== programFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${r.student.firstName} ${r.student.lastName}`.toLowerCase();
    const email = r.student.email.toLowerCase();
    const prog = r.program?.name.toLowerCase() || '';
    const mentor = r.mentorName?.toLowerCase() || '';
    return fullName.includes(q) || email.includes(q) || prog.includes(q) || mentor.includes(q);
  });

  const columns: Column<OperationalStudentRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <button
            onClick={() => setSelectedStudentRow(r)}
            className="font-semibold text-xs text-devoc-text-primary hover:text-devoc-accent text-left"
          >
            {r.student.firstName} {r.student.lastName}
          </button>
          <span className="text-[10px] text-devoc-text-muted block">{r.student.email}</span>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Program Curriculum',
      render: (r) => (
        <span className="text-xs text-devoc-text-secondary font-medium">
          {r.program?.name || 'Custom Curriculum'}
        </span>
      ),
    },
    {
      key: 'mentor',
      header: 'Assigned Mentor',
      width: '160px',
      render: (r) => {
        if (r.mentorName) {
          return (
            <span className="text-xs text-devoc-text-primary font-medium flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-emerald-600" />
              {r.mentorName}
            </span>
          );
        }
        return (
          <span className="text-[11px] text-amber-600 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            Unassigned
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Enrollment',
      width: '110px',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'reviews',
      header: 'Reviews Log',
      width: '120px',
      render: (r) => (
        <div>
          <span className="font-mono text-xs text-devoc-text-primary">{r.totalReviews} reviews</span>
          {r.lastReviewDate && (
            <span className="text-[10px] text-devoc-text-muted block">
              Last: {new Date(r.lastReviewDate).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'attention',
      header: 'Operational Status',
      width: '140px',
      render: (r) => {
        if (r.attentionTag === 'no_mentor') {
          return (
            <span className="text-[11px] text-amber-600 font-semibold inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> No Mentor
            </span>
          );
        }
        if (r.attentionTag === 'stalled') {
          return <span className="text-[11px] text-zinc-500 font-medium">Paused / Stalled</span>;
        }
        if (r.attentionTag === 'needs_review') {
          return <span className="text-[11px] text-blue-600 font-medium">Review Pending</span>;
        }
        return <span className="text-[11px] text-emerald-600 font-medium">On Track</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedStudentRow(r)}
          className="h-7 text-xs px-2"
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-devoc-accent" />
          Academy Student Directory & Operations
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Roster of active, completed, and paused academy students with mentor pairings, review histories, and progression status.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or mentor..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="h-8 text-xs bg-devoc-surface border border-devoc-border rounded-md px-2 text-devoc-text-primary"
          >
            <option value="all">All Programs ({programs.length})</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs bg-devoc-surface border border-devoc-border rounded-md px-2 text-devoc-text-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <DataTable
        columns={columns}
        data={filteredRows}
        keyField={(r) => r.enrollment.id}
        isLoading={isLoading}
        emptyTitle="No students found"
        emptyDescription="No student enrollments match your active filter."
      />

      {/* Student Context Modal */}
      {selectedStudentRow && (
        <Dialog
          isOpen={Boolean(selectedStudentRow)}
          onClose={() => setSelectedStudentRow(null)}
          title={`Student Profile: ${selectedStudentRow.student.firstName} ${selectedStudentRow.student.lastName}`}
          description={selectedStudentRow.program?.name || 'Learning Journey'}
          maxWidth="lg"
        >
          <div className="py-2">
            <StudentContextPanel
              student={selectedStudentRow.student}
              enrollment={selectedStudentRow.enrollment}
              program={selectedStudentRow.program}
              mentorName={selectedStudentRow.mentorName}
              showActions={false}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
