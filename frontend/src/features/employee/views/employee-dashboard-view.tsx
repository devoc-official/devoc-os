'use client';

import React from 'react';
import { useEmployeeDashboard } from '../hooks/use-employee-dashboard';
import { AttendanceSummary } from '../../shared/components/attendance-summary';
import { StatusBadge } from '../../../components/data/status-badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import {
  Briefcase,
  ListTodo,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FolderGit2,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export function EmployeeDashboardView() {
  const {
    workRecords,
    tasks,
    openTasks,
    blockedTasks,
    todayAttendance,
    currentTimesheet,
    leaveBalances,
    upcomingMeetings,
    evaluations,
    isLoading,
  } = useEmployeeDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const recentContributions = workRecords.slice(0, 5);
  const urgentTasks = openTasks.slice(0, 5);
  const totalLeaveAvailable = leaveBalances.reduce((acc, b) => acc + (b.availableDays || 0), 0);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Employee Workspace
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Operational dashboard: daily responsibilities, active sprint tasks, workforce time, and upcoming reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/work">
            <Button size="sm" className="h-8 text-xs font-medium">
              <Briefcase className="h-3.5 w-3.5 mr-1.5" />
              Log Contribution
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Operational Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Work Time */}
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Today's Time
            </span>
            <Clock className="h-4 w-4 text-devoc-text-muted" />
          </div>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {todayAttendance ? `${Math.floor(todayAttendance.totalWorkMinutes / 60)}h ${todayAttendance.totalWorkMinutes % 60}m` : '0h 0m'}
          </div>
          <div className="text-[11px] text-devoc-text-secondary flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {todayAttendance?.status === 'present' ? 'Session active' : 'Not clocked in'}
          </div>
        </div>

        {/* Card 2: Open Tasks & Blockers */}
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Sprint Tasks
            </span>
            <ListTodo className="h-4 w-4 text-devoc-text-muted" />
          </div>
          <div className="text-2xl font-bold font-mono text-devoc-text-primary">
            {openTasks.length}
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            {blockedTasks.length > 0 ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {blockedTasks.length} task blocked
              </span>
            ) : (
              'No active blockers'
            )}
          </div>
        </div>

        {/* Card 3: Timesheet Status */}
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Timesheet
            </span>
            <FileText className="h-4 w-4 text-devoc-text-muted" />
          </div>
          <div className="text-2xl font-bold text-devoc-text-primary">
            {currentTimesheet ? <StatusBadge status={currentTimesheet.status} /> : 'No Timesheet'}
          </div>
          <div className="text-[11px] text-devoc-text-secondary font-mono">
            {currentTimesheet ? `${currentTimesheet.totalRegularHours}h logged this week` : 'Opens on schedule'}
          </div>
        </div>

        {/* Card 4: Available Leave */}
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Leave Balance
            </span>
            <Calendar className="h-4 w-4 text-devoc-text-muted" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {totalLeaveAvailable} days
          </div>
          <div className="text-[11px] text-devoc-text-secondary">
            Available annual leave balance
          </div>
        </div>
      </div>

      {/* Main 2-Column Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Tasks & Work */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Urgent / Assigned Tasks */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                  My Assigned Tasks
                </h3>
                <p className="text-[11px] text-devoc-text-muted">
                  High-priority and in-progress operational tasks.
                </p>
              </div>

              <Link href="/tasks" className="text-xs font-medium text-devoc-accent hover:underline flex items-center gap-1">
                View All Tasks
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {urgentTasks.length > 0 ? (
              <div className="divide-y divide-devoc-border/60">
                {urgentTasks.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-devoc-text-muted">
                          {t.taskKey || `#${t.id.slice(0, 6)}`}
                        </span>
                        <span className="font-medium text-devoc-text-primary">{t.title}</span>
                      </div>
                      {t.dueAt && (
                        <span className="text-[10px] text-devoc-text-muted block">
                          Due: {new Date(t.dueAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-devoc-text-muted">
                        {t.priority}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No open tasks assigned.
              </div>
            )}
          </div>

          {/* Section: Recent Work Contributions */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                  Recent Contributions
                </h3>
                <p className="text-[11px] text-devoc-text-muted">
                  Recent work logs submitted for manager review.
                </p>
              </div>

              <Link href="/work" className="text-xs font-medium text-devoc-accent hover:underline flex items-center gap-1">
                Open Work Ledger
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentContributions.length > 0 ? (
              <div className="divide-y divide-devoc-border/60">
                {recentContributions.map((w) => (
                  <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-medium text-devoc-text-primary">{w.title}</span>
                      <span className="text-[10px] text-devoc-text-muted block">
                        Logged on {new Date(w.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
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
                No work logs recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attendance & Meetings */}
        <div className="space-y-6">
          {/* Quick Attendance Clock Widget */}
          <AttendanceSummary todayRecord={todayAttendance} />

          {/* Upcoming Meetings */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Upcoming Meetings
              </h3>
              <Link href="/meetings" className="text-xs font-medium text-devoc-accent hover:underline flex items-center gap-1">
                All Meetings
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingMeetings.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingMeetings.slice(0, 3).map((m) => (
                  <div key={m.id} className="p-2.5 rounded-md border border-devoc-border/70 bg-devoc-surface-secondary/40 space-y-1">
                    <div className="font-medium text-xs text-devoc-text-primary">{m.title}</div>
                    <div className="flex items-center gap-2 text-[11px] text-devoc-text-muted">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(m.scheduledStartAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No upcoming meetings scheduled.
              </div>
            )}
          </div>

          {/* Evaluations Status */}
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Performance Evaluations
              </h3>
              <Link href="/evaluations" className="text-xs font-medium text-devoc-accent hover:underline">
                View
              </Link>
            </div>

            {evaluations.length > 0 ? (
              <div className="p-2.5 rounded-md border border-devoc-border text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-devoc-text-primary">Recent Performance Review</span>
                  <StatusBadge status={evaluations[0].state} />
                </div>
                <p className="text-[11px] text-devoc-text-secondary">
                  {evaluations[0].summaryFeedback || 'Evaluation record in progress.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-devoc-text-muted">
                No pending or completed evaluations found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
