'use client';

import React, { useState } from 'react';
import { usePMAssignments } from '../hooks/use-pm-assignments';
import { Assignment } from '../../../api/assignments.api';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogFooter } from '../../../components/ui/dialog';
import { Plus, Users, Layers } from 'lucide-react';

export function PMAssignmentsView() {
  const { assignments, people, projects, isLoading, createAssignment } = usePMAssignments();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personId, setPersonId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [roleContext, setRoleContext] = useState('Frontend Developer');
  const [capacityValue, setCapacityValue] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const peopleMap = new Map<string, string>();
  people.forEach((p) => peopleMap.set(p.id, `${p.firstName} ${p.lastName}`));

  const projectMap = new Map<string, string>();
  projects.forEach((p) => projectMap.set(p.id, p.name));

  const handleCreate = async () => {
    if (!personId || !targetId) return;
    setIsSubmitting(true);
    try {
      await createAssignment({
        personId,
        targetId,
        targetType: 'project',
        roleContext,
        capacityValue,
        capacityUnit: 'hours_per_week',
      });
      setIsModalOpen(false);
      setPersonId('');
      setTargetId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Assignment>[] = [
    {
      key: 'person',
      header: 'Assigned Person',
      render: (a) => (
        <span className="font-medium text-xs text-devoc-text-primary">
          {peopleMap.get(a.personId) || `#${a.personId.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'roleContext',
      header: 'Role Context',
      render: (a) => (
        <span className="font-semibold text-xs text-devoc-accent">
          {a.roleContext || a.assignmentType}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target Scope',
      render: (a) => {
        const name = a.targetType === 'project' ? projectMap.get(a.targetId) : null;
        return (
          <div className="text-xs">
            <span className="font-medium text-devoc-text-primary">{name || `#${a.targetId.slice(0, 8)}`}</span>
            <span className="text-[10px] text-devoc-text-muted block uppercase">{a.targetType}</span>
          </div>
        );
      },
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (a) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-primary">
          {a.capacityValue} {a.capacityUnit}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'startAt',
      header: 'Assigned Date',
      width: '120px',
      render: (a) => (
        <span className="font-mono text-[11px] text-devoc-text-secondary">
          {new Date(a.startAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Project & Task Assignments
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            M3 Assignment Engine: allocate human resources, assign role contexts, and manage workload capacity.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="h-8 text-xs font-medium">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Create Assignment
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No assignments found"
        emptyDescription="Create your first M3 project assignment using the button above."
      />

      {/* Assignment Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Resource Assignment"
        description="Assign a team member to a project with allocated weekly capacity."
        maxWidth="md"
      >
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Team Member <span className="text-red-500">*</span>
            </label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            >
              <option value="">Select person...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Target Project <span className="text-red-500">*</span>
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Role Context <span className="text-red-500">*</span>
            </label>
            <Input
              value={roleContext}
              onChange={(e) => setRoleContext(e.target.value)}
              placeholder="e.g. Lead Engineer, UI Designer"
              className="h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Weekly Capacity (Hours)
            </label>
            <Input
              type="number"
              min="1"
              max="60"
              value={capacityValue}
              onChange={(e) => setCapacityValue(Number(e.target.value))}
              className="w-32 h-8 text-xs bg-devoc-surface border-devoc-border font-mono"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(false)}
            disabled={isSubmitting}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={isSubmitting || !personId || !targetId}
            className="text-xs h-8"
          >
            Create Assignment
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
