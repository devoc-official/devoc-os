'use client';

import React, { useState } from 'react';
import { useFounderPeople } from '../hooks/use-founder-people';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Avatar } from '../../../components/ui/avatar';
import { Person, Role, Employment } from '../../../api/people.api';
import { Users, Search, Briefcase, Filter } from 'lucide-react';

export function FounderPeopleView() {
  const { people, roles, employments, assignments, buMap, workRecords, isLoading } = useFounderPeople();
  const [searchQuery, setSearchQuery] = useState('');
  const [personaFilter, setPersonaFilter] = useState<string>('all');

  const employmentMap = new Map(employments.map((e) => [e.personId, e]));

  // Count assignments per person
  const assignmentCountMap = new Map<string, number>();
  for (const a of assignments) {
    if (a.status === 'active') {
      assignmentCountMap.set(a.personId, (assignmentCountMap.get(a.personId) || 0) + 1);
    }
  }

  // Filter people
  const filteredPeople = people.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
      const matchEmail = p.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    if (personaFilter !== 'all') {
      const emp = employmentMap.get(p.id);
      if (personaFilter === 'employee' && !emp) return false;
      if (personaFilter === 'student') {
        const hasStudentRole = assignments.some(
          (a) => a.personId === p.id && a.roleContext?.toLowerCase().includes('student')
        );
        if (!hasStudentRole) return false;
      }
    }

    return true;
  });

  const columns: Column<Person>[] = [
    {
      key: 'name',
      header: 'Person & Contact',
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${p.firstName} ${p.lastName}`} className="h-7 w-7 text-[10px]" />
          <div>
            <div className="font-semibold text-xs text-devoc-text-primary">
              {p.firstName} {p.lastName}
            </div>
            <div className="text-[11px] text-devoc-text-muted">{p.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (p) => <StatusBadge status={p.status || 'active'} />,
    },
    {
      key: 'employment',
      header: 'Employment Context',
      render: (p) => {
        const emp = employmentMap.get(p.id);
        if (!emp) return <span className="text-[11px] text-devoc-text-muted">Uncontracted</span>;
        return (
          <div>
            <div className="font-medium text-xs text-devoc-text-primary">{emp.jobTitle}</div>
            <span className="text-[10px] uppercase font-semibold text-devoc-text-secondary">
              {emp.employmentType.replace('_', ' ')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'assignments',
      header: 'Active Assignments',
      width: '140px',
      render: (p) => {
        const count = assignmentCountMap.get(p.id) || 0;
        return (
          <span className="font-mono text-xs text-devoc-text-primary">
            {count} {count === 1 ? 'assignment' : 'assignments'}
          </span>
        );
      },
    },
    {
      key: 'joined',
      header: 'Member Since',
      width: '120px',
      align: 'right',
      render: (p) => (
        <span className="font-mono text-[11px] text-devoc-text-muted">
          {new Date(p.createdAt).toLocaleDateString()}
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
          Executive Talent & People Directory
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Complete organizational overview of all people, employment agreements, contextual roles, and M3 assignments.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All People' },
            { id: 'employee', label: 'Employees' },
            { id: 'student', label: 'Students' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPersonaFilter(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                personaFilter === tab.id
                  ? 'bg-devoc-accent text-white'
                  : 'bg-devoc-surface border border-devoc-border text-devoc-text-secondary hover:text-devoc-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredPeople}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No people found"
        emptyDescription="No individuals registered matching current search criteria."
      />
    </div>
  );
}
