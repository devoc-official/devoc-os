'use client';

import React, { useState, useMemo } from 'react';
import { Task, Project, TaskStatus, TaskPriority } from '../../../api/projects.api';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface TaskTableProps {
  tasks: Task[];
  projects?: Project[];
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onStatusChange?: (task: Task, status: TaskStatus) => void;
  className?: string;
  showProjectColumn?: boolean;
}

const PRIORITY_STYLES: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
  medium: { label: 'Medium', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  high: { label: 'High', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  critical: { label: 'Critical', className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
};

export function TaskTable({
  tasks,
  projects = [],
  isLoading = false,
  onTaskClick,
  emptyTitle = 'No tasks found',
  emptyDescription = 'There are no tasks assigned or available matching your query.',
  className,
  showProjectColumn = true,
}: TaskTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesKey = t.taskKey?.toLowerCase().includes(q) || false;
        const project = projectMap.get(t.projectId);
        const matchesProject = project?.name.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesKey && !matchesProject) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery, projectMap]);

  const columns: Column<Task>[] = [
    {
      key: 'taskKey',
      header: 'Key',
      width: '100px',
      render: (task) => (
        <span className="font-mono text-[11px] font-semibold text-devoc-text-secondary">
          {task.taskKey || `#${task.id.slice(0, 6)}`}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (task) => (
        <div>
          <div className="font-medium text-devoc-text-primary">{task.title}</div>
          {task.description && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{task.description}</p>
          )}
        </div>
      ),
    },
    ...(showProjectColumn
      ? [
          {
            key: 'projectId',
            header: 'Project',
            width: '160px',
            render: (task: Task) => {
              const project = projectMap.get(task.projectId);
              return (
                <span className="text-[11px] text-devoc-text-secondary font-medium truncate block max-w-[150px]">
                  {project ? project.name : task.projectId.slice(0, 8)}
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: 'priority',
      header: 'Priority',
      width: '90px',
      render: (task) => {
        const conf = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider',
              conf.className
            )}
          >
            {conf.label}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (task) => {
        return <StatusBadge status={task.status} />;
      },
    },
    {
      key: 'dueAt',
      header: 'Due Date',
      width: '110px',
      render: (task) => {
        if (!task.dueAt) return <span className="text-devoc-text-muted text-[11px]">—</span>;
        const due = new Date(task.dueAt);
        const isPast = due.getTime() < Date.now() && task.status !== 'done' && task.status !== 'cancelled';
        return (
          <span className={cn('text-[11px]', isPast ? 'text-red-600 font-semibold' : 'text-devoc-text-secondary')}>
            {due.toLocaleDateString()}
          </span>
        );
      },
    },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks..."
            className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            aria-label="Filter by Status"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            aria-label="Filter by Priority"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Primary Data Table */}
      <DataTable
        columns={columns}
        data={filteredTasks}
        keyField="id"
        isLoading={isLoading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onRowClick={onTaskClick}
      />
    </div>
  );
}
