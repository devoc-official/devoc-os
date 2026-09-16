'use client';

import React from 'react';
import { usePMProgress } from '../hooks/use-pm-progress';
import { StatusBadge } from '../../../components/data/status-badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, BarChart3 } from 'lucide-react';

export function PMProgressView() {
  const {
    projects,
    tasks,
    workRecords,
    tasksByStatus,
    completionRate,
    blockedTasks,
    overdueTasks,
    totalTasks,
    isLoading,
  } = usePMProgress();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-devoc-accent" />
          Delivery Progress & Velocity
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Authoritative task completion velocity, workflow breakdown by state machine status, and blocker indicators.
        </p>
      </div>

      {/* Top Velocity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Overall Completion Rate
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {completionRate}%
          </div>
          <div className="text-[11px] text-devoc-text-muted">
            {tasksByStatus.done} of {totalTasks} tasks completed
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Active Sprint Tasks
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {tasksByStatus.in_progress + tasksByStatus.review}
          </div>
          <div className="text-[11px] text-devoc-text-muted">
            {tasksByStatus.in_progress} in progress, {tasksByStatus.review} in review
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Blocked Tasks
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {blockedTasks.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {blockedTasks.length > 0 ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Intervention required
              </span>
            ) : (
              'Clean delivery pipeline'
            )}
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Overdue Deliverables
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {overdueTasks.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {overdueTasks.length > 0 ? (
              <span className="text-red-600 font-medium">Past due date</span>
            ) : (
              'All tasks on schedule'
            )}
          </div>
        </div>
      </div>

      {/* State Machine Status Distribution */}
      <div className="p-5 rounded-md border border-devoc-border bg-devoc-surface space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
          Task Distribution by State Machine Lifecycle
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
          <div className="p-3 rounded-md bg-devoc-surface-secondary/50 border border-devoc-border space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">To Do</span>
            <span className="font-mono text-lg font-bold text-devoc-text-primary">{tasksByStatus.todo}</span>
          </div>

          <div className="p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-300 block">In Progress</span>
            <span className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300">{tasksByStatus.in_progress}</span>
          </div>

          <div className="p-3 rounded-md bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-purple-700 dark:text-purple-300 block">Review</span>
            <span className="font-mono text-lg font-bold text-purple-700 dark:text-purple-300">{tasksByStatus.review}</span>
          </div>

          <div className="p-3 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-300 block">Blocked</span>
            <span className="font-mono text-lg font-bold text-amber-700 dark:text-amber-300">{tasksByStatus.blocked}</span>
          </div>

          <div className="p-3 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-300 block">Done</span>
            <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">{tasksByStatus.done}</span>
          </div>

          <div className="p-3 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-devoc-border space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Cancelled</span>
            <span className="font-mono text-lg font-bold text-devoc-text-muted">{tasksByStatus.cancelled}</span>
          </div>
        </div>
      </div>

      {/* Blocked and Overdue Lists */}
      {(blockedTasks.length > 0 || overdueTasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blocked Tasks */}
          <div className="p-4 rounded-md border border-amber-200 dark:border-amber-950 bg-amber-50/20 dark:bg-amber-950/10 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Blocked Deliverables ({blockedTasks.length})
            </h3>
            <div className="divide-y divide-amber-200/50 dark:divide-amber-900/50">
              {blockedTasks.map((t) => (
                <div key={t.id} className="py-2 text-xs flex items-center justify-between">
                  <span className="font-medium text-devoc-text-primary">{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="p-4 rounded-md border border-red-200 dark:border-red-950 bg-red-50/20 dark:bg-red-950/10 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-800 dark:text-red-200 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Overdue Tasks ({overdueTasks.length})
            </h3>
            <div className="divide-y divide-red-200/50 dark:divide-red-900/50">
              {overdueTasks.map((t) => (
                <div key={t.id} className="py-2 text-xs flex items-center justify-between">
                  <span className="font-medium text-devoc-text-primary">{t.title}</span>
                  <span className="font-mono text-red-600 text-[11px]">
                    Due: {new Date(t.dueAt!).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
