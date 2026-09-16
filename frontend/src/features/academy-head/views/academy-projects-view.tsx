'use client';

import React, { useState } from 'react';
import { usePMProjects, ProjectWithStats } from '../../pm/hooks/use-pm-projects';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { FolderGit2, Search, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function AcademyProjectsView() {
  const { projects, isLoading } = usePMProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('student');

  const filteredProjects = projects.filter((p) => {
    if (typeFilter !== 'all' && p.projectType !== typeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const columns: Column<ProjectWithStats>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '120px',
      render: (p) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-secondary">{p.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Project Name',
      render: (p) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">{p.name}</div>
          {p.description && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'projectType',
      header: 'Type',
      width: '130px',
      render: (p) => (
        <span className="text-[11px] uppercase font-semibold text-devoc-text-secondary">
          {p.projectType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'progress',
      header: 'Deliverable Progress',
      width: '160px',
      render: (p) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-devoc-text-primary">
              {p.completedTasks}/{p.totalTasks} tasks
            </span>
            <span className="font-mono text-devoc-text-muted">{p.progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-devoc-surface-secondary overflow-hidden">
            <div
              className="h-full bg-devoc-accent transition-all duration-300"
              style={{ width: `${p.progressPercent}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'blockers',
      header: 'Blockers',
      width: '140px',
      render: (p) => {
        if (p.blockedTasks > 0) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" />
              {p.blockedTasks} blocked
            </span>
          );
        }
        return <span className="text-[11px] text-emerald-600 font-medium">Clear</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      render: (p) => (
        <Link
          href={`/pm/projects/${p.id}`}
          className="text-xs text-devoc-accent hover:underline inline-flex items-center"
        >
          Inspect <ArrowRight className="h-3 w-3 ml-1" />
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
          Student & Academy Projects Portfolio
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Practical milestone deliverables, capstone project tracking, student team collaborations, and blocker intervention.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 text-xs bg-devoc-surface border border-devoc-border rounded-md px-2 text-devoc-text-primary w-full sm:w-auto"
        >
          <option value="student">Student Projects Only</option>
          <option value="all">All Projects</option>
          <option value="client">Client Projects</option>
          <option value="internal">Internal Tools</option>
        </select>
      </div>

      {/* Projects Table */}
      <DataTable
        columns={columns}
        data={filteredProjects}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No projects found"
        emptyDescription="No student projects match your search criteria."
      />
    </div>
  );
}
