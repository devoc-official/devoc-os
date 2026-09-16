'use client';

import React from 'react';
import { useDeveloperAssignments } from '../hooks/use-developer-assignments';
import { Assignment } from '../../../api/assignments.api';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Layers } from 'lucide-react';

export function DeveloperAssignmentsView() {
  const { assignments, projects, isLoading } = useDeveloperAssignments();

  const projectMap = new Map<string, string>();
  projects.forEach((p) => projectMap.set(p.id, p.name));

  const columns: Column<Assignment>[] = [
    {
      key: 'roleContext',
      header: 'Role Context',
      render: (a) => (
        <span className="font-semibold text-xs text-devoc-text-primary">
          {a.roleContext || a.assignmentType}
        </span>
      ),
    },
    {
      key: 'targetType',
      header: 'Target Object',
      render: (a) => {
        const projName = a.targetType === 'project' ? projectMap.get(a.targetId) : null;
        return (
          <div className="text-xs">
            <span className="font-medium text-devoc-text-primary">{projName || `#${a.targetId.slice(0, 8)}`}</span>
            <span className="text-[10px] text-devoc-text-muted block uppercase">{a.targetType}</span>
          </div>
        );
      },
    },
    {
      key: 'capacity',
      header: 'Allocated Capacity',
      render: (a) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-primary">
          {a.capacityValue} {a.capacityUnit}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Assignment Status',
      width: '120px',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'dates',
      header: 'Effective Dates',
      render: (a) => (
        <span className="text-[11px] text-devoc-text-secondary font-mono">
          {new Date(a.startAt).toLocaleDateString()}
          {a.endAt ? ` to ${new Date(a.endAt).toLocaleDateString()}` : ' (Indefinite)'}
        </span>
      ),
    },
    {
      key: 'authorityType',
      header: 'Authority',
      render: (a) => (
        <span className="text-[10px] uppercase font-semibold tracking-wider text-devoc-text-muted">
          {a.authorityType}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Official Assignments
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          M3 Assignment Engine records: designated responsibility areas, allocated capacity, and active role contexts.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No active assignments found"
        emptyDescription="You have no official assignments registered in the M3 engine."
      />
    </div>
  );
}
