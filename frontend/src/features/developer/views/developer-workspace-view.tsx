'use client';

import React, { useState } from 'react';
import { useDeveloperWorkspace } from '../hooks/use-developer-workspace';
import { TaskTable } from '../../shared/components/task-table';
import { TaskDetailDialog } from '../../shared/components/task-detail-dialog';
import { Task, TaskStatus } from '../../../api/projects.api';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import {
  Code2,
  FolderGit2,
  ListTodo,
  Layers,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export function DeveloperWorkspaceView() {
  const {
    projects,
    tasks,
    allTasks,
    assignments,
    workRecords,
    isLoading,
    transitionTaskStatus,
  } = useDeveloperWorkspace();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const reviewTasks = tasks.filter((t) => t.status === 'review');
  const todoTasks = tasks.filter((t) => t.status === 'todo');

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await transitionTaskStatus(taskId, status);
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status } : null));
    }
  };

  return (
    <div className="space-y-6">
      {/* Command Center Titlebar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-devoc-accent/10 text-devoc-accent border border-devoc-accent/20 uppercase">
              Command Workspace
            </span>
            <span className="text-devoc-text-muted text-xs">•</span>
            <span className="text-xs font-mono text-devoc-text-secondary">
              {tasks.length} active tasks across {projects.length} projects
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary mt-1">
            Engineering Command Center
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/work">
            <Button size="sm" variant="outline" className="h-8 text-xs font-medium">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Log Work
            </Button>
          </Link>
          <Link href="/developer/evidence">
            <Button size="sm" className="h-8 text-xs font-medium">
              <GitPullRequest className="h-3.5 w-3.5 mr-1.5" />
              Evidence Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* 3-Lane Sprint Execution Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lane 1: In Progress (Active coding) */}
        <div className="rounded-md border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Play className="h-3 w-3 fill-current" />
              In Progress ({inProgressTasks.length})
            </span>
          </div>

          <div className="space-y-2">
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="p-3 rounded-md bg-devoc-surface border border-devoc-border hover:border-devoc-accent cursor-pointer transition-colors shadow-sm space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] font-semibold text-devoc-text-muted">
                      {t.taskKey || `#${t.id.slice(0, 6)}`}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-devoc-accent">
                      {t.taskType}
                    </span>
                  </div>
                  <div className="font-medium text-xs text-devoc-text-primary">{t.title}</div>
                  <div className="flex items-center justify-between text-[11px] text-devoc-text-muted pt-1">
                    <span className="uppercase text-[10px]">{t.priority}</span>
                    <span>{t.dueAt ? new Date(t.dueAt).toLocaleDateString() : 'No due date'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No tasks currently in progress.
              </div>
            )}
          </div>
        </div>

        {/* Lane 2: In Review (Testing / PR) */}
        <div className="rounded-md border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
              <GitPullRequest className="h-3 w-3" />
              In Review / QA ({reviewTasks.length})
            </span>
          </div>

          <div className="space-y-2">
            {reviewTasks.length > 0 ? (
              reviewTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="p-3 rounded-md bg-devoc-surface border border-devoc-border hover:border-devoc-accent cursor-pointer transition-colors shadow-sm space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] font-semibold text-devoc-text-muted">
                      {t.taskKey || `#${t.id.slice(0, 6)}`}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="font-medium text-xs text-devoc-text-primary">{t.title}</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No items pending review.
              </div>
            )}
          </div>
        </div>

        {/* Lane 3: Up Next (Sprint Backlog) */}
        <div className="rounded-md border border-devoc-border bg-devoc-surface-secondary/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
              <ListTodo className="h-3 w-3" />
              Sprint Backlog ({todoTasks.length})
            </span>
          </div>

          <div className="space-y-2">
            {todoTasks.slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className="p-3 rounded-md bg-devoc-surface border border-devoc-border hover:border-devoc-accent cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-semibold text-devoc-text-muted">
                    {t.taskKey || `#${t.id.slice(0, 6)}`}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-devoc-text-muted">
                    {t.priority}
                  </span>
                </div>
                <div className="font-medium text-xs text-devoc-text-primary">{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects & Official Assignments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-devoc-accent" />
              Active Code Repositories & Projects
            </h3>
            <Link href="/projects" className="text-xs font-medium text-devoc-accent hover:underline">
              All Projects
            </Link>
          </div>

          <div className="divide-y divide-devoc-border/60">
            {projects.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-devoc-text-primary flex items-center gap-2">
                    <span className="font-mono text-[11px] text-devoc-text-secondary">{p.code}</span>
                    <span>{p.name}</span>
                  </div>
                  <span className="text-[11px] text-devoc-text-muted uppercase">
                    {p.projectType}
                  </span>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Official M3 Assignments */}
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-devoc-accent" />
              Official Responsibility & Capacity
            </h3>
            <Link href="/developer/assignments" className="text-xs font-medium text-devoc-accent hover:underline">
              Inspect M3
            </Link>
          </div>

          {assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="p-2.5 rounded border border-devoc-border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-devoc-text-primary uppercase text-[10px]">
                      {a.roleContext || a.assignmentType}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-devoc-text-secondary">
                    <span>Target: #{a.targetId.slice(0, 8)} ({a.targetType})</span>
                    <span className="font-mono font-medium">{a.capacityValue} {a.capacityUnit}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-devoc-text-muted">
              No official M3 assignments registered.
            </p>
          )}
        </div>
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        allTasks={allTasks}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
