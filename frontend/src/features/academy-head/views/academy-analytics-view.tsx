'use client';

import React from 'react';
import { useAcademyHeadDashboard } from '../hooks/use-academy-head-dashboard';
import { useAcademyProgress } from '../hooks/use-academy-progress';
import { BarChart3, TrendingUp, Users, BookOpen, Calendar, CheckCircle2 } from 'lucide-react';

export function AcademyAnalyticsView() {
  const {
    programs,
    activeStudents,
    completedStudents,
    pausedStudents,
    pendingReviewsCount,
    completedReviews,
    mentorAssignments,
  } = useAcademyHeadDashboard();

  const { completionRate, totalEnrollments } = useAcademyProgress();

  const mentorStudentRatio =
    mentorAssignments.length > 0
      ? (activeStudents.length / mentorAssignments.length).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-devoc-accent" />
          Academy Analytics & Educational KPIs
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Quantitative metrics covering completion velocity, student retention, review throughput, and mentor capacity ratios.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Graduation Rate
          </span>
          <div className="text-lg font-bold font-mono text-emerald-600">{completionRate}%</div>
          <span className="text-[10px] text-devoc-text-muted">
            {completedStudents.length} of {totalEnrollments} finished
          </span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Users className="h-3 w-3" /> Student Load
          </span>
          <div className="text-lg font-bold font-mono text-devoc-accent">{activeStudents.length}</div>
          <span className="text-[10px] text-devoc-text-muted">Active enrollments</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Users className="h-3 w-3" /> Student/Mentor Ratio
          </span>
          <div className="text-lg font-bold font-mono text-devoc-text-primary">{mentorStudentRatio} : 1</div>
          <span className="text-[10px] text-devoc-text-muted">Across {mentorAssignments.length} active mentors</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Review Clearance
          </span>
          <div className="text-lg font-bold font-mono text-devoc-text-primary">
            {completedReviews.length} <span className="text-xs font-normal text-devoc-text-muted">evaluated</span>
          </div>
          <span className="text-[10px] text-devoc-text-muted">{pendingReviewsCount} queued for evaluation</span>
        </div>
      </div>

      {/* Program-by-Program Performance Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
          Curriculum Performance Breakdown
        </h2>

        <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
          <table className="w-full text-xs">
            <thead className="bg-devoc-surface-secondary/50 border-b border-devoc-border text-devoc-text-muted text-[11px] uppercase">
              <tr>
                <th className="p-3 text-left font-semibold">Program</th>
                <th className="p-3 text-left font-semibold">Code</th>
                <th className="p-3 text-right font-semibold">Active</th>
                <th className="p-3 text-right font-semibold">Graduated</th>
                <th className="p-3 text-right font-semibold">Paused</th>
                <th className="p-3 text-right font-semibold">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-devoc-border">
              {programs.map((p) => {
                const pActive = activeStudents.filter((s) => s.learningProgramId === p.id).length;
                const pGraduated = completedStudents.filter((s) => s.learningProgramId === p.id).length;
                const pPaused = pausedStudents.filter((s) => s.learningProgramId === p.id).length;
                const pTotal = pActive + pGraduated + pPaused;
                const rate = pTotal > 0 ? Math.round((pGraduated / pTotal) * 100) : 0;

                return (
                  <tr key={p.id} className="hover:bg-devoc-surface-secondary/30 transition-colors">
                    <td className="p-3 font-semibold text-devoc-text-primary">{p.name}</td>
                    <td className="p-3 font-mono text-devoc-text-muted">{p.code}</td>
                    <td className="p-3 text-right font-mono text-devoc-accent font-medium">{pActive}</td>
                    <td className="p-3 text-right font-mono text-emerald-600 font-medium">{pGraduated}</td>
                    <td className="p-3 text-right font-mono text-devoc-text-muted">{pPaused}</td>
                    <td className="p-3 text-right font-mono font-bold text-devoc-text-primary">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
