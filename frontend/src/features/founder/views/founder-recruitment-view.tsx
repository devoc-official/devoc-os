'use client';

import React, { useState } from 'react';
import { useFounderRecruitment } from '../hooks/use-founder-recruitment';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Position, Application } from '../../../api/recruitment.api';
import { UserCheck, Search, Briefcase, Users, CheckCircle2, ChevronRight } from 'lucide-react';

export function FounderRecruitmentView() {
  const {
    positions,
    openPositions,
    candidates,
    stages,
    applications,
    activeApplications,
    hiredApplications,
    isLoading,
  } = useFounderRecruitment();

  const [activeTab, setActiveTab] = useState<'positions' | 'applications'>('positions');
  const [searchQuery, setSearchQuery] = useState('');

  const candidateMap = new Map(
    candidates.map((c) => [c.id, { name: `${c.firstName} ${c.lastName}`, email: c.email }])
  );
  const positionMap = new Map(positions.map((p) => [p.id, p.title]));
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

  const filteredPositions = positions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const filteredApplications = applications.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const c = candidateMap.get(a.candidateId);
    const pTitle = positionMap.get(a.positionId) || '';
    return (
      (c?.name.toLowerCase().includes(q) ?? false) ||
      (c?.email.toLowerCase().includes(q) ?? false) ||
      pTitle.toLowerCase().includes(q)
    );
  });

  const positionColumns: Column<Position>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '120px',
      render: (p) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-secondary">{p.code}</span>
      ),
    },
    {
      key: 'title',
      header: 'Position Title',
      render: (p) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">{p.title}</div>
          {p.description && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'employmentType',
      header: 'Employment Type',
      width: '150px',
      render: (p) => (
        <span className="text-[11px] font-medium uppercase text-devoc-text-secondary">
          {p.employmentType.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'openingsCount',
      header: 'Openings',
      width: '100px',
      render: (p) => (
        <span className="font-mono text-xs text-devoc-text-primary">{p.openingsCount}</span>
      ),
    },
    {
      key: 'compensation',
      header: 'Compensation Range',
      width: '180px',
      render: (p) => (
        <span className="font-mono text-xs text-devoc-text-secondary">
          {p.minSalary && p.maxSalary
            ? `${p.currency || 'USD'} ${p.minSalary.toLocaleString()} – ${p.maxSalary.toLocaleString()}`
            : 'Unspecified'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (p) => <StatusBadge status={p.status} />,
    },
  ];

  const applicationColumns: Column<Application>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (a) => {
        const c = candidateMap.get(a.candidateId);
        return (
          <div>
            <div className="font-semibold text-xs text-devoc-text-primary">
              {c ? c.name : `#${a.candidateId.slice(0, 8)}`}
            </div>
            {c?.email && <span className="text-[10px] text-devoc-text-muted">{c.email}</span>}
          </div>
        );
      },
    },
    {
      key: 'position',
      header: 'Position',
      render: (a) => (
        <span className="text-xs text-devoc-text-primary font-medium">
          {positionMap.get(a.positionId) || 'General Application'}
        </span>
      ),
    },
    {
      key: 'stage',
      header: 'Pipeline Stage',
      width: '160px',
      render: (a) => {
        const stageName = a.currentStageId ? stageMap.get(a.currentStageId) : 'Screening';
        return (
          <span className="text-xs font-mono font-medium text-devoc-accent bg-devoc-surface-secondary/60 px-2 py-0.5 rounded border border-devoc-border">
            {stageName || 'Screening'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'appliedAt',
      header: 'Applied Date',
      width: '130px',
      render: (a) => (
        <span className="text-[11px] text-devoc-text-muted">
          {new Date(a.appliedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-devoc-accent" />
          Talent Acquisition & Recruitment Pipeline
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Executive oversight of open requisitions, candidate pipeline flow, and strategic hiring decisions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Open Requisitions</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">{openPositions.length}</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Total Candidates</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">{candidates.length}</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Active Applications</span>
          <span className="text-lg font-bold font-mono text-devoc-accent">{activeApplications.length}</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Hired This Cycle</span>
          <span className="text-lg font-bold font-mono text-emerald-600">{hiredApplications.length}</span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 border-b sm:border-0 border-devoc-border w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'positions'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'applications'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Candidate Applications ({applications.length})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'positions' ? 'Search positions...' : 'Search candidates...'}
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'positions' ? (
        <DataTable
          columns={positionColumns}
          data={filteredPositions}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No positions found"
          emptyDescription="No open or draft recruitment positions match your query."
        />
      ) : (
        <DataTable
          columns={applicationColumns}
          data={filteredApplications}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No applications found"
          emptyDescription="No candidates currently match your search criteria."
        />
      )}
    </div>
  );
}
