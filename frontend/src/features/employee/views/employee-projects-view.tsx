'use client';

import React, { useState } from 'react';
import { useEmployeeProjects } from '../hooks/use-employee-projects';
import { Project } from '../../../api/projects.api';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { FolderGit2, Search, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function EmployeeProjectsView() {
  const { projects, isLoading } = useEmployeeProjects();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const columns: Column<Project>[] = [
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
          <div className="font-medium text-devoc-text-primary flex items-center gap-1.5">
            <span>{proj.name}</span>
          </div>
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
        <span className="text-[11px] uppercase tracking-wider font-semibold text-devoc-text-secondary">
          {proj.projectType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Lifecycle Status',
      width: '130px',
      render: (proj) => <StatusBadge status={proj.status} />,
    },
    {
      key: 'createdAt',
      header: 'Initiated',
      width: '110px',
      render: (proj) => (
        <span className="text-[11px] text-devoc-text-secondary">
          {new Date(proj.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Projects
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Projects where you have active authorized assignment or delivery context.
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
        emptyTitle="No assigned projects found"
        emptyDescription="You are currently not assigned to any active projects."
      />
    </div>
  );
}
