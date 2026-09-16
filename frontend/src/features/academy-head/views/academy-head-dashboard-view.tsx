'use client';

import React from 'react';
import { useAcademyHeadDashboard } from '../hooks/use-academy-head-dashboard';
import { StatusBadge } from '../../../components/data/status-badge';
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  FolderGit2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export function AcademyHeadDashboardView() {
  const {
    programs,
    activeStudents,
    completedStudents,
    pausedStudents,
    pendingReviewsCount,
    completedReviews,
    mentorAssignments,
    studentsWithoutMentor,
    blockedTasks,
    attentionItems,
    isLoading,
  } = useAcademyHeadDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-devoc-accent" />
          Academy Head Command Center
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Operational oversight of learning programs, student progress, mentor allocation, evaluation cadence, and curriculum progression.
        </p>
      </div>

      {/* Academy Operational Attention Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Academy Operational Attention ({attentionItems.length})
        </h2>

        {attentionItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface flex flex-col justify-between space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        item.severity === 'critical'
                          ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                          : item.severity === 'warning'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-devoc-text-primary line-clamp-1">{item.title}</h3>
                  <p className="text-[11px] text-devoc-text-secondary line-clamp-2">{item.description}</p>
                </div>
                <Link
                  href={item.actionHref}
                  className="inline-flex items-center text-[11px] font-medium text-devoc-accent hover:underline pt-1"
                >
                  {item.actionLabel}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface text-xs text-devoc-text-muted flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Academy operations are running smoothly. All active students have mentors and zero review delays.
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Users className="h-3 w-3" /> Active Students
          </span>
          <div className="text-lg font-bold font-mono text-devoc-text-primary">
            {activeStudents.length}
          </div>
          <span className="text-[10px] text-devoc-text-muted">
            +{completedStudents.length} completed, {pausedStudents.length} paused
          </span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> Learning Programs
          </span>
          <div className="text-lg font-bold font-mono text-devoc-accent">
            {programs.length}
          </div>
          <span className="text-[10px] text-devoc-text-muted">Active curricula</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Reviews Queue
          </span>
          <div className="text-lg font-bold font-mono text-amber-600">
            {pendingReviewsCount}
          </div>
          <span className="text-[10px] text-devoc-text-muted">
            {completedReviews.length} completed
          </span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <UserCheck className="h-3 w-3" /> Active Mentors
          </span>
          <div className="text-lg font-bold font-mono text-devoc-text-primary">
            {mentorAssignments.length}
          </div>
          <span className="text-[10px] text-devoc-text-muted">Assigned pairings</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <FolderGit2 className="h-3 w-3" /> Project Blockers
          </span>
          <div className={`text-lg font-bold font-mono ${blockedTasks.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {blockedTasks.length}
          </div>
          <span className="text-[10px] text-devoc-text-muted">Deliverable issues</span>
        </div>
      </div>

      {/* Program Portfolio Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Program Curriculum & Student Distribution
          </h2>
          <Link href="/learning/programs" className="text-xs text-devoc-accent hover:underline flex items-center gap-1">
            Manage Programs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {programs.map((p) => {
            const pStudents = activeStudents.filter((s) => s.learningProgramId === p.id);
            return (
              <div key={p.id} className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-xs text-devoc-text-primary">{p.name}</h3>
                    <p className="text-[11px] text-devoc-text-muted font-mono">{p.code}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-xs text-devoc-text-secondary line-clamp-2">
                  {p.description || 'Self-paced learning program.'}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-devoc-border text-[11px]">
                  <span className="text-devoc-text-muted">Active Students:</span>
                  <span className="font-mono font-bold text-devoc-text-primary">{pStudents.length}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
