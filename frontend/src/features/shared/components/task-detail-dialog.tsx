'use client';

import React, { useState } from 'react';
import { Task, Project, TaskStatus, TaskDependency } from '../../../api/projects.api';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/data/status-badge';
import { TaskDependencies } from './task-dependencies';
import { Clock, Calendar, CheckCircle2, Play, Pause, Ban, Eye, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface TaskDetailDialogProps {
  task: Task | null;
  project?: Project | null;
  dependencies?: TaskDependency[];
  allTasks?: Task[];
  isOpen: boolean;
  onClose: () => void;
  canManage?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => Promise<void>;
  onAddDependency?: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onRemoveDependency?: (taskId: string, dependencyId: string) => Promise<void>;
}

export function TaskDetailDialog({
  task,
  project,
  dependencies = [],
  allTasks = [],
  isOpen,
  onClose,
  canManage = false,
  onStatusChange,
  onAddDependency,
  onRemoveDependency,
}: TaskDetailDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!task) return null;

  const handleStatus = async (status: TaskStatus) => {
    if (!onStatusChange) return;
    setIsUpdating(true);
    try {
      await onStatusChange(task.id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      description={project ? `Project: ${project.name} (${project.code})` : undefined}
      maxWidth="lg"
    >
      <div className="space-y-5 pt-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-devoc-text-muted">
            {task.taskKey || `#${task.id.slice(0, 8)}`}
          </span>
          <span className="text-devoc-text-muted text-xs">•</span>
          <span className="text-xs uppercase tracking-wider font-semibold text-devoc-accent">
            {task.taskType}
          </span>
          <StatusBadge status={task.status} />
        </div>

        <div className="space-y-5 pt-2">
          {/* Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-md bg-devoc-surface-secondary/50 border border-devoc-border text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Priority</span>
              <span className="font-medium text-devoc-text-primary uppercase tracking-wide">{task.priority}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Created</span>
              <span className="font-medium text-devoc-text-primary">{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Due Date</span>
              <span className="font-medium text-devoc-text-primary">
                {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'None'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Updated</span>
              <span className="font-medium text-devoc-text-primary">{new Date(task.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Description
            </h4>
            <div className="p-3 rounded-md bg-devoc-surface border border-devoc-border text-xs text-devoc-text-primary leading-relaxed min-h-[60px] whitespace-pre-wrap">
              {task.description || 'No description provided for this task.'}
            </div>
          </div>

          {/* Dependencies Component */}
          <TaskDependencies
            currentTaskId={task.id}
            dependencies={dependencies}
            allTasks={allTasks}
            canManage={canManage}
            onAddDependency={onAddDependency ? (depId) => onAddDependency(task.id, depId) : undefined}
            onRemoveDependency={onRemoveDependency ? (depId) => onRemoveDependency(task.id, depId) : undefined}
          />

          {/* Lifecycle State Transitions */}
          {onStatusChange && (
            <div className="space-y-2 pt-2 border-t border-devoc-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Status Transitions
              </h4>
              <div className="flex flex-wrap gap-2">
                {task.status === 'todo' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus('in_progress')}
                      className="text-xs h-7"
                    >
                      <Play className="h-3 w-3 mr-1 text-blue-600" />
                      Start Work
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus('blocked')}
                      className="text-xs h-7"
                    >
                      <Pause className="h-3 w-3 mr-1 text-amber-600" />
                      Mark Blocked
                    </Button>
                  </>
                )}

                {task.status === 'in_progress' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus('review')}
                      className="text-xs h-7"
                    >
                      <Eye className="h-3 w-3 mr-1 text-purple-600" />
                      Submit for Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus('blocked')}
                      className="text-xs h-7"
                    >
                      <Pause className="h-3 w-3 mr-1 text-amber-600" />
                      Mark Blocked
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus('done')}
                      className="text-xs h-7"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                      Mark Done
                    </Button>
                  </>
                )}

                {task.status === 'review' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus('in_progress')}
                      className="text-xs h-7"
                    >
                      <RotateCcw className="h-3 w-3 mr-1 text-amber-600" />
                      Request Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus('done')}
                      className="text-xs h-7"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                      Approve & Complete
                    </Button>
                  </>
                )}

                {task.status === 'blocked' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => handleStatus('in_progress')}
                    className="text-xs h-7"
                  >
                    <Play className="h-3 w-3 mr-1 text-blue-600" />
                    Unblock / Resume
                  </Button>
                )}

                {task.status !== 'done' && task.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => handleStatus('cancelled')}
                    className="text-xs h-7 text-devoc-text-muted hover:text-red-600"
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Cancel Task
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
