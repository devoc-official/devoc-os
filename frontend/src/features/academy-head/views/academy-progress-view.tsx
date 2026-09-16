'use client';

import React from 'react';
import { useAcademyProgress } from '../hooks/use-academy-progress';
import { TrendingUp, Users, CheckCircle2, PauseCircle, Calendar, BookOpen } from 'lucide-react';

export function AcademyProgressView() {
  const {
    programs,
    enrollments,
    totalEnrollments,
    activeCount,
    completedCount,
    stalledCount,
    completionRate,
    completedReviews,
    pendingReviewsCount,
    isLoading,
  } = useAcademyProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-devoc-accent" />
          Student Progression & Velocity
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Cohort velocity tracking, graduation rate metrics, milestone completion cadence, and review cycle turnarounds.
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
            {completedCount} of {totalEnrollments} graduated
          </span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Users className="h-3 w-3" /> Actively Learning
          </span>
          <div className="text-lg font-bold font-mono text-devoc-accent">{activeCount}</div>
          <span className="text-[10px] text-devoc-text-muted">Currently active students</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <PauseCircle className="h-3 w-3" /> Paused / Stalled
          </span>
          <div className="text-lg font-bold font-mono text-amber-600">{stalledCount}</div>
          <span className="text-[10px] text-devoc-text-muted">Requires academy intervention</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Review Velocity
          </span>
          <div className="text-lg font-bold font-mono text-devoc-text-primary">
            {completedReviews.length} <span className="text-xs font-normal text-devoc-text-muted">done / {pendingReviewsCount} due</span>
          </div>
          <span className="text-[10px] text-devoc-text-muted">Evaluations throughput</span>
        </div>
      </div>

      {/* Program Cohort Progress Breakdown */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
          Program Progression Distribution
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map((p) => {
            const pEnrollments = enrollments.filter((e) => e.learningProgramId === p.id);
            const pCompleted = pEnrollments.filter((e) => e.status === 'completed').length;
            const pActive = pEnrollments.filter((e) => e.status === 'active').length;
            const pPaused = pEnrollments.filter((e) => e.status === 'paused').length;
            const pRate = pEnrollments.length > 0 ? Math.round((pCompleted / pEnrollments.length) * 100) : 0;

            return (
              <div key={p.id} className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-xs text-devoc-text-primary">{p.name}</h3>
                    <span className="font-mono text-[10px] text-devoc-text-muted">{p.code}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-devoc-accent">{pRate}% completed</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-devoc-surface-secondary overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${pRate}%` }}
                    title={`Completed: ${pCompleted}`}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${pEnrollments.length > 0 ? (pActive / pEnrollments.length) * 100 : 0}%`,
                    }}
                    title={`Active: ${pActive}`}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{
                      width: `${pEnrollments.length > 0 ? (pPaused / pEnrollments.length) * 100 : 0}%`,
                    }}
                    title={`Paused: ${pPaused}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-devoc-text-secondary pt-1">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> {pCompleted} Graduated
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> {pActive} Active
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> {pPaused} Paused
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
