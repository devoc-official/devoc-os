'use client';

import React from 'react';
import { usePMDashboard } from '../hooks/use-pm-dashboard';
import { StatusBadge } from '../../../components/data/status-badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import {
  FolderGit2,
  ListTodo,
  AlertTriangle,
  Users,
  Clock,
  Calendar,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export function PMDashboardView() {
  const {
    projects,
    tasks,
    blockedTasks,
    inReviewTasks,
    pendingApprovals,
    upcomingMeetings,
    assignments,
    isLoading,
  } = usePMDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-devoc-accent" />
            Project Manager Cockpit
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Delivery governance: cross-project portfolio oversight, blocked sprint tasks, team capacity, and approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/pm/projects">
            <Button size="sm" className="h-8 text-xs font-medium">
              Projects Directory
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 PM Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Managed Projects
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {projects.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            Authorized project portfolio
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Task Blockers
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {blockedTasks.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {blockedTasks.length > 0 ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Requires PM intervention
              </span>
            ) : (
              'Zero blocked tasks'
            )}
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Pending Work Approvals
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {pendingApprovals.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {pendingApprovals.length > 0 ? (
              <span className="text-blue-600 font-medium">Contributions waiting for sign-off</span>
            ) : (
              'All submissions reviewed'
            )}
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Team Assignments
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {assignments.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            Active M3 resource allocations
          </div>
        </div>
      </div>

      {/* Main Grid: Projects & Task Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Projects Portfolio */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                  Project Portfolio
                </h3>
                <p className="text-[11px] text-devoc-text-muted">
                  Current development and release phase projects.
                </p>
              </div>

              <Link href="/pm/projects" className="text-xs font-medium text-devoc-accent hover:underline flex items-center gap-1">
                View All
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {projects.length > 0 ? (
              <div className="divide-y divide-devoc-border/60">
                {projects.slice(0, 5).map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-devoc-text-muted">{p.code}</span>
                        <Link href={`/pm/projects/${p.id}`} className="font-semibold text-devoc-text-primary hover:text-devoc-accent">
                          {p.name}
                        </Link>
                      </div>
                      <span className="text-[11px] text-devoc-text-muted uppercase">
                        {p.projectType}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={p.status} />
                      <Link href={`/pm/projects/${p.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-[11px] px-2">
                          Cockpit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No projects assigned for management.
              </div>
            )}
          </div>

          {/* Blocked and High-Attention Tasks */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                  Tasks Requiring Attention ({blockedTasks.length + inReviewTasks.length})
                </h3>
                <p className="text-[11px] text-devoc-text-muted">
                  Blocked deliverables and submissions awaiting PM review.
                </p>
              </div>

              <Link href="/pm/tasks" className="text-xs font-medium text-devoc-accent hover:underline flex items-center gap-1">
                Manage Tasks
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {blockedTasks.length > 0 || inReviewTasks.length > 0 ? (
              <div className="divide-y divide-devoc-border/60">
                {blockedTasks.concat(inReviewTasks).slice(0, 5).map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-devoc-text-muted">{t.taskKey || `#${t.id.slice(0, 6)}`}</span>
                        <span className="font-medium text-devoc-text-primary">{t.title}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-devoc-text-muted">
                        Priority: {t.priority}
                      </span>
                    </div>

                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No blocked tasks or pending reviews.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Approvals & Meetings */}
        <div className="space-y-6">
          {/* Work Contributions Awaiting Sign-off */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Work Approvals ({pendingApprovals.length})
              </h3>
              <Link href="/pm/work" className="text-xs font-medium text-devoc-accent hover:underline">
                Review All
              </Link>
            </div>

            {pendingApprovals.length > 0 ? (
              <div className="space-y-2">
                {pendingApprovals.slice(0, 4).map((w) => (
                  <div key={w.id} className="p-2.5 rounded border border-devoc-border text-xs space-y-1">
                    <div className="font-medium text-devoc-text-primary truncate">{w.title}</div>
                    <div className="flex items-center justify-between text-[11px] text-devoc-text-muted">
                      <span>{Math.floor(w.durationMinutes / 60)}h {w.durationMinutes % 60}m</span>
                      <StatusBadge status={w.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-devoc-text-muted">
                All team work logs have been reviewed.
              </p>
            )}
          </div>

          {/* Project Meetings */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Project Meetings
              </h3>
              <Link href="/pm/meetings" className="text-xs font-medium text-devoc-accent hover:underline">
                All Meetings
              </Link>
            </div>

            {upcomingMeetings.length > 0 ? (
              <div className="space-y-2">
                {upcomingMeetings.slice(0, 3).map((m) => (
                  <div key={m.id} className="p-2.5 rounded border border-devoc-border text-xs space-y-1">
                    <div className="font-medium text-devoc-text-primary">{m.title}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-devoc-text-muted font-mono">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(m.scheduledStartAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-devoc-text-muted">
                No project meetings scheduled.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
