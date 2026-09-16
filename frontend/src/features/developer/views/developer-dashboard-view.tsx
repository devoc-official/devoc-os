'use client';

import React from 'react';
import { useDeveloperDashboard } from '../hooks/use-developer-dashboard';
import { StatusBadge } from '../../../components/data/status-badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import {
  Code2,
  FolderGit2,
  ListTodo,
  Clock,
  Link as LinkIcon,
  AlertTriangle,
  ArrowRight,
  GitPullRequest,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export function DeveloperDashboardView() {
  const {
    projects,
    tasks,
    activeSprintTasks,
    blockedTasks,
    workRecords,
    assignments,
    evidenceList,
    totalHoursLogged,
    isLoading,
  } = useDeveloperDashboard();

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
            <Code2 className="h-5 w-5 text-devoc-accent" />
            Developer Command Dashboard
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Engineering workspace: active sprint deliverables, technical tasks, codebase contributions, and evidence links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/developer">
            <Button size="sm" className="h-8 text-xs font-medium">
              Open Command Workspace
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Sprint In Progress
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {activeSprintTasks.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {blockedTasks.length > 0 ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {blockedTasks.length} blocked
              </span>
            ) : (
              'All tasks progressing'
            )}
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Engineering Hours
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {totalHoursLogged}h
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {workRecords.length} recorded contribution logs
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Active Projects
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {projects.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {assignments.length} M3 role assignments
          </div>
        </div>

        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Evidence Ledger
          </span>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {evidenceList.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            PRs, commits & documents
          </div>
        </div>
      </div>

      {/* Main Grid: Active Sprint & Contribution Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sprint Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                  Active Sprint Tasks ({activeSprintTasks.length})
                </h3>
                <p className="text-[11px] text-devoc-text-muted">
                  Development tasks assigned in active sprints.
                </p>
              </div>

              <Link href="/tasks" className="text-xs font-medium text-devoc-accent hover:underline flex items-center gap-1">
                View All Tasks
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {activeSprintTasks.length > 0 ? (
              <div className="divide-y divide-devoc-border/60">
                {activeSprintTasks.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-devoc-text-muted">
                          {t.taskKey || `#${t.id.slice(0, 6)}`}
                        </span>
                        <span className="font-medium text-devoc-text-primary">{t.title}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-devoc-accent font-semibold block">
                        {t.taskType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No active development tasks currently in progress.
              </div>
            )}
          </div>

          {/* Recent Deliverables */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Recent Code & Architectural Deliverables
              </h3>
              <Link href="/work" className="text-xs font-medium text-devoc-accent hover:underline">
                View Ledger
              </Link>
            </div>

            {workRecords.length > 0 ? (
              <div className="divide-y divide-devoc-border/60">
                {workRecords.slice(0, 5).map((w) => (
                  <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-devoc-text-primary">{w.title}</span>
                      <span className="text-[10px] text-devoc-text-muted block">
                        Logged on {new Date(w.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-devoc-text-secondary">
                        {Math.floor(w.durationMinutes / 60)}h {w.durationMinutes % 60}m
                      </span>
                      <StatusBadge status={w.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No work contributions logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Evidence Ledger & Assignments */}
        <div className="space-y-6">
          {/* Evidence Snippet */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Recent Evidence
              </h3>
              <Link href="/developer/evidence" className="text-xs font-medium text-devoc-accent hover:underline">
                All Evidence
              </Link>
            </div>

            {evidenceList.length > 0 ? (
              <div className="space-y-2">
                {evidenceList.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-devoc-surface-secondary/50 border border-devoc-border text-xs space-y-1">
                    <div className="font-medium text-devoc-text-primary flex items-center gap-1.5">
                      <GitPullRequest className="h-3 w-3 text-devoc-accent" />
                      <span className="truncate">{item.evidence.title}</span>
                    </div>
                    {item.evidence.evidenceUrl && (
                      <a
                        href={item.evidence.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-devoc-accent truncate block hover:underline font-mono"
                      >
                        {item.evidence.evidenceUrl}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-devoc-text-muted">
                No deliverable evidence URLs attached yet.
              </p>
            )}
          </div>

          {/* Active M3 Assignments */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Official Assignments
              </h3>
              <Link href="/developer/assignments" className="text-xs font-medium text-devoc-accent hover:underline">
                View
              </Link>
            </div>

            {assignments.length > 0 ? (
              <div className="space-y-2">
                {assignments.slice(0, 3).map((a) => (
                  <div key={a.id} className="p-2.5 rounded border border-devoc-border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-devoc-text-primary uppercase text-[10px]">
                        {a.roleContext || a.assignmentType}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="text-[11px] text-devoc-text-secondary">
                      Capacity: <span className="font-mono">{a.capacityValue} {a.capacityUnit}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-devoc-text-muted">
                No active development assignments recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
