'use client';

import React, { useState } from 'react';
import { usePMProjects, ProjectWithStats } from '../hooks/use-pm-projects';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Search, FolderGit2, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function PMProjectsView() {
  const { projects, isLoading } = usePMProjects();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const columns: Column<ProjectWithStats>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '120px',
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
            className="font-semibold text-xs text-devoc-text-primary hover:text-devoc-accent"
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
      width: '130px',
      render: (proj) => <StatusBadge status={proj.status} />,
    },
    {
      key: 'progress',
      header: 'Sprint Progress',
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
      header: 'Attention',
      width: '110px',
      render: (proj) => {
        if (proj.blockedTasks > 0) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
              <AlertTriangle className="h-3 w-3" />
              {proj.blockedTasks} blocked
            </span>
          );
        }
        return <span className="text-[11px] text-devoc-text-muted">Normal</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
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
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Project Portfolio
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Authorized project directory with delivery velocity, sprint completion percentages, and blocker alerts.
        </p>
      </div>

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

      <DataTable
        columns={columns}
        data={filteredProjects}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No managed projects found"
        emptyDescription="You have no authorized projects assigned for project management."
      />
    </div>
  );
}
