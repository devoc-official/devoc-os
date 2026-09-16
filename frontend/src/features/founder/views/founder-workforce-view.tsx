'use client';

import React, { useState } from 'react';
import { useFounderPeople } from '../hooks/use-founder-people';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Assignment } from '../../../api/assignments.api';
import { Users, Search, AlertTriangle, Briefcase, Building2, CheckCircle2 } from 'lucide-react';

export function FounderWorkforceView() {
  const { people, employments, assignments, businessUnits, buMap, isLoading } = useFounderPeople();
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');

  const peopleMap = new Map(people.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));

  // Calculate per-person capacity load
  const personCapacityMap = new Map<string, number>();
  assignments
    .filter((a) => a.status === 'active')
    .forEach((a) => {
      const current = personCapacityMap.get(a.personId) || 0;
      personCapacityMap.set(a.personId, current + (a.capacityValue || 0));
    });

  const overloadedPeople = Array.from(personCapacityMap.entries()).filter(([_, load]) => load > 40);

  const filteredAssignments = assignments.filter((a) => {
    if (targetTypeFilter !== 'all' && a.targetType !== targetTypeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const personName = peopleMap.get(a.personId)?.toLowerCase() || '';
    const roleCtx = (a.roleContext || '').toLowerCase();
    return personName.includes(q) || roleCtx.includes(q) || a.targetType.toLowerCase().includes(q);
  });

  const columns: Column<Assignment>[] = [
    {
      key: 'person',
      header: 'Team Member',
      render: (a) => {
        const name = peopleMap.get(a.personId) || `ID: ${a.personId.slice(0, 8)}`;
        const totalLoad = personCapacityMap.get(a.personId) || 0;
        const isOverloaded = totalLoad > 40;

        return (
          <div>
            <div className="font-semibold text-xs text-devoc-text-primary flex items-center gap-1.5">
              {name}
              {isOverloaded && (
                <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 inline-flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {totalLoad}h/wk
                </span>
              )}
            </div>
            <span className="text-[10px] text-devoc-text-muted">Total Load: {totalLoad}h/wk</span>
          </div>
        );
      },
    },
    {
      key: 'targetType',
      header: 'Assignment Target',
      width: '160px',
      render: (a) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-devoc-text-secondary uppercase">
          {a.targetType === 'business_unit' ? (
            <Building2 className="h-3 w-3 text-devoc-accent" />
          ) : (
            <Briefcase className="h-3 w-3 text-devoc-accent" />
          )}
          {a.targetType.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'roleContext',
      header: 'Context Role',
      render: (a) => (
        <span className="text-xs text-devoc-text-primary font-medium">{a.roleContext}</span>
      ),
    },
    {
      key: 'capacity',
      header: 'Allocated Capacity',
      width: '150px',
      render: (a) => (
        <span className="font-mono text-xs text-devoc-text-secondary">
          {a.capacityValue ? `${a.capacityValue} ${a.capacityUnit.replace('_', ' ')}` : 'Flexible'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'dates',
      header: 'Timeline',
      width: '140px',
      render: (a) => (
        <span className="text-[11px] text-devoc-text-muted">
          {a.startAt ? new Date(a.startAt).toLocaleDateString() : 'Immediate'}
          {a.endAt ? ` → ${new Date(a.endAt).toLocaleDateString()}` : ' → Ongoing'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <Users className="h-5 w-5 text-devoc-accent" />
          Workforce & Talent Allocation
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Executive allocation matrix, multi-target assignment distribution (projects, business units, departments), and capacity load monitoring.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Total Headcount</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">{people.length}</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Active Assignments</span>
          <span className="text-lg font-bold font-mono text-devoc-accent">
            {assignments.filter((a) => a.status === 'active').length}
          </span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Capacity Overloads</span>
          <span className={`text-lg font-bold font-mono ${overloadedPeople.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {overloadedPeople.length}
          </span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Active Business Units</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">{businessUnits.length}</span>
        </div>
      </div>

      {/* Overload Alert if any */}
      {overloadedPeople.length > 0 && (
        <div className="p-3 rounded-md border border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Capacity Allocation Warning ({overloadedPeople.length} team members allocated &gt; 40 hrs/week)
          </div>
          <p className="text-[11px] text-amber-800">
            DeVoc OS Section 4 permits multiple simultaneous assignments with non-blocking warnings to ensure delivery sustainability.
          </p>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member or role..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>

        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="h-8 text-xs bg-devoc-surface border border-devoc-border rounded-md px-2 text-devoc-text-primary w-full sm:w-auto"
        >
          <option value="all">All Targets</option>
          <option value="project">Project Assignments</option>
          <option value="business_unit">Business Unit Assignments</option>
          <option value="department">Department Assignments</option>
          <option value="team">Team Assignments</option>
        </select>
      </div>

      {/* Assignments Table */}
      <DataTable
        columns={columns}
        data={filteredAssignments}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No assignments found"
        emptyDescription="No assignments match your search and filter criteria."
      />
    </div>
  );
}
