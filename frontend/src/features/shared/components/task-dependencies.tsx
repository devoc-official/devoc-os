'use client';

import React, { useState } from 'react';
import { Task, TaskDependency } from '../../../api/projects.api';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/data/status-badge';
import { ArrowRight, Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface TaskDependenciesProps {
  currentTaskId: string;
  dependencies: TaskDependency[];
  allTasks?: Task[];
  canManage?: boolean;
  onAddDependency?: (dependsOnTaskId: string) => Promise<void>;
  onRemoveDependency?: (dependencyId: string) => Promise<void>;
  className?: string;
}

export function TaskDependencies({
  currentTaskId,
  dependencies,
  allTasks = [],
  canManage = false,
  onAddDependency,
  onRemoveDependency,
  className,
}: TaskDependenciesProps) {
  const [selectedTaskToAdd, setSelectedTaskToAdd] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available tasks to depend on: exclude self and already added dependencies
  const existingDepTaskIds = new Set(dependencies.map((d) => d.dependsOnTaskId));
  const availableTasks = allTasks.filter(
    (t) => t.id !== currentTaskId && !existingDepTaskIds.has(t.id)
  );

  const handleAdd = async () => {
    if (!selectedTaskToAdd || !onAddDependency) return;
    setErrorMsg(null);
    setIsAdding(true);
    try {
      await onAddDependency(selectedTaskToAdd);
      setSelectedTaskToAdd('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add dependency');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (depId: string) => {
    if (!onRemoveDependency) return;
    try {
      await onRemoveDependency(depId);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove dependency');
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
          Task Dependencies & Blockers
        </h4>
        <span className="text-[11px] text-devoc-text-muted">
          {dependencies.length} {dependencies.length === 1 ? 'blocker' : 'blockers'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {dependencies.length === 0 ? (
        <div className="p-4 rounded-md border border-dashed border-devoc-border text-center text-xs text-devoc-text-muted">
          No blocking dependencies configured. This task can proceed independently.
        </div>
      ) : (
        <div className="space-y-2">
          {dependencies.map((dep) => {
            const depTask = allTasks.find((t) => t.id === dep.dependsOnTaskId);
            const isDone = depTask?.status === 'done';

            return (
              <div
                key={dep.id}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-md border text-xs',
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                    : 'border-amber-200 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/20'
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-shrink-0 font-mono text-[11px] text-devoc-text-muted">
                    <span>{depTask?.taskKey || `#${dep.dependsOnTaskId.slice(0, 6)}`}</span>
                    <ArrowRight className="h-3 w-3 text-devoc-text-muted" />
                  </div>

                  <span className="font-medium text-devoc-text-primary truncate">
                    {depTask?.title || `Task ${dep.dependsOnTaskId.slice(0, 8)}`}
                  </span>

                  {depTask && <StatusBadge status={depTask.status} />}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-devoc-text-muted uppercase tracking-wider">
                    {dep.dependencyType || 'blocks'}
                  </span>

                  {canManage && onRemoveDependency && (
                    <button
                      onClick={() => handleRemove(dep.id)}
                      className="p-1 text-devoc-text-muted hover:text-red-600 rounded transition-colors"
                      title="Remove Dependency"
                      aria-label="Remove Dependency"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dependency Controls for Authorized PM */}
      {canManage && onAddDependency && availableTasks.length > 0 && (
        <div className="pt-2 border-t border-devoc-border/60 flex items-center gap-2">
          <select
            value={selectedTaskToAdd}
            onChange={(e) => setSelectedTaskToAdd(e.target.value)}
            className="flex-1 h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            aria-label="Select blocker task"
          >
            <option value="">Select a task that blocks this one...</option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.taskKey ? `${t.taskKey}: ` : ''}
                {t.title} ({t.status})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedTaskToAdd || isAdding}
            className="h-8 text-xs px-3"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Blocker
          </Button>
        </div>
      )}
    </div>
  );
}
