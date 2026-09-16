'use client';

import React, { useState } from 'react';
import { usePMTeam, TeamMemberResponsibility } from '../hooks/use-pm-team';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Avatar } from '../../../components/ui/avatar';
import { Search, Users, Briefcase, CheckCircle2 } from 'lucide-react';

export function PMTeamView() {
  const { teamMembers, isLoading } = usePMTeam();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = teamMembers.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${m.person.firstName} ${m.person.lastName}`.toLowerCase();
    const email = m.person.email.toLowerCase();
    const roles = m.assignments.map((a) => a.roleContext?.toLowerCase() || '').join(' ');
    return name.includes(q) || email.includes(q) || roles.includes(q);
  });

  const columns: Column<TeamMemberResponsibility>[] = [
    {
      key: 'person',
      header: 'Team Member',
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${m.person.firstName} ${m.person.lastName}`} className="h-7 w-7 text-[10px]" />
          <div>
            <div className="font-semibold text-xs text-devoc-text-primary">
              {m.person.firstName} {m.person.lastName}
            </div>
            <div className="text-[11px] text-devoc-text-muted">{m.person.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'roleContext',
      header: 'Active Role Contexts',
      render: (m) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {m.assignments.length > 0 ? (
            m.assignments.map((a) => (
              <span
                key={a.id}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-devoc-surface-secondary border border-devoc-border text-devoc-text-primary"
              >
                {a.roleContext || a.assignmentType}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-devoc-text-muted">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'assignedProjects',
      header: 'Assigned Projects',
      render: (m) => (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {m.assignedProjects.length > 0 ? (
            m.assignedProjects.map((p) => (
              <span key={p.id} className="text-xs font-medium text-devoc-text-primary">
                {p.name}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-devoc-text-muted">No projects</span>
          )}
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Total Capacity',
      render: (m) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-primary">
          {m.totalCapacityHours}h/wk
        </span>
      ),
    },
    {
      key: 'activeTasks',
      header: 'Current Tasks',
      render: (m) => (
        <span className="font-mono text-xs text-devoc-text-secondary">
          {m.activeTasks.length} tasks
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (m) => <StatusBadge status={m.person.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Team Responsibility & Capacity
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Synthesized from People, Projects, and M3 Assignment Engine: active roles, project allocation, and weekly workload.
        </p>
      </div>

      <div className="w-full sm:w-64">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team member or role..."
            className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredMembers}
        keyField={(m) => m.person.id}
        isLoading={isLoading}
        emptyTitle="No team members found"
        emptyDescription="No team members registered in the organization."
      />
    </div>
  );
}
