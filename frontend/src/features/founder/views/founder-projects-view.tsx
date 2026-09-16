'use client';

import React, { useState } from 'react';
import { usePMProjects, ProjectWithStats } from '../../pm/hooks/use-pm-projects';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Search, FolderGit2, AlertTriangle, ArrowRight, Layers } from 'lucide-react';
import Link from 'next/link';

export function FounderProjectsView() {
  const { projects, isLoading } = usePMProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    if (typeFilter !== 'all' && p.projectType !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const totalBlockedTasks = projects.reduce((acc, p) => acc + (p.blockedTasks || 0), 0);
  const activeProjectsCount = projects.filter(
    (p) => p.status === 'development' || p.status === 'planning' || p.status === 'beta'
  ).length;

  const columns: Column<ProjectWithStats>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '110px',
      render: (proj) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-secondary">
          {proj.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Project Name',
      render: (proj) => (
        <div>
          <Link
            href={`/pm/projects/${proj.id}`}
            className="font-semibold text-xs text-devoc-text-primary hover:text-devoc-accent flex items-center gap-1.5"
          >
            {proj.name}
          </Link>
          {proj.description && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{proj.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'projectType',
      header: 'Type',
      width: '130px',
      render: (proj) => (
        <span className="text-[11px] uppercase font-semibold text-devoc-text-secondary tracking-wider">
          {proj.projectType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Lifecycle',
      width: '120px',
      render: (proj) => <StatusBadge status={proj.status} />,
    },
    {
      key: 'progress',
      header: 'Task Completion',
      width: '160px',
      render: (proj) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono font-medium text-devoc-text-primary">
              {proj.completedTasks}/{proj.totalTasks} tasks
            </span>
            <span className="font-mono text-devoc-text-muted">{proj.progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-devoc-surface-secondary overflow-hidden">
            <div
              className="h-full bg-devoc-accent transition-all duration-300"
              style={{ width: `${proj.progressPercent}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'attention',
      header: 'Operational Blockers',
      width: '150px',
      render: (proj) => {
        if (proj.blockedTasks > 0) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" />
              {proj.blockedTasks} blocked task{proj.blockedTasks > 1 ? 's' : ''}
            </span>
          );
        }
        return <span className="text-[11px] text-emerald-600 font-medium">Unblocked</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '110px',
      align: 'right',
      render: (proj) => (
        <Link href={`/pm/projects/${proj.id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs px-2">
            Cockpit
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <FolderGit2 className="h-5 w-5 text-devoc-accent" />
          Strategic Project Portfolio
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Executive portfolio oversight across all organization business units, delivery velocity, sprint progress, and task blockers.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Total Projects</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">{projects.length}</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Active Delivery</span>
          <span className="text-lg font-bold font-mono text-devoc-accent">{activeProjectsCount}</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Total Blockers</span>
          <span className={`text-lg font-bold font-mono ${totalBlockedTasks > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {totalBlockedTasks}
          </span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Delivery Types</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">
            {Array.from(new Set(projects.map((p) => p.projectType))).length}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or title..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 text-xs bg-devoc-surface border border-devoc-border rounded-md px-2 text-devoc-text-primary"
          >
            <option value="all">All Types</option>
            <option value="client">Client</option>
            <option value="internal">Internal</option>
            <option value="student">Student</option>
            <option value="product">Product</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs bg-devoc-surface border border-devoc-border rounded-md px-2 text-devoc-text-primary"
          >
            <option value="all">All Lifecycles</option>
            <option value="idea">Idea</option>
            <option value="planning">Planning</option>
            <option value="development">Development</option>
            <option value="beta">Beta</option>
            <option value="released">Released</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <DataTable
        columns={columns}
        data={filteredProjects}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No projects found"
        emptyDescription="No projects match your active search and filter criteria."
      />
    </div>
  );
}
