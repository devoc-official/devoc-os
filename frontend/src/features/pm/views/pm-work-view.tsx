'use client';

import React from 'react';
import { usePMWork } from '../hooks/use-pm-work';
import { WorkTable } from '../../shared/components/work-table';
import { WorkRecord } from '../../../api/work.api';

export function PMWorkView() {
  const { workRecords, categories, projects, isLoading, approveWork, rejectWork } = usePMWork();

  const handleApprove = async (record: WorkRecord) => {
    await approveWork(record.id);
  };

  const handleReject = async (record: WorkRecord) => {
    await rejectWork(record.id, 'Deliverables need revision');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Team Work Contributions
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Review, approve, and verify engineering contributions and deliverables logged by team members.
        </p>
      </div>

      <WorkTable
        records={workRecords}
        categories={categories}
        projects={projects}
        isLoading={isLoading}
        canApprove={true}
        onApproveWork={handleApprove}
        onRejectWork={handleReject}
        emptyTitle="No team contributions found"
        emptyDescription="There are no logged work contributions currently registered."
      />
    </div>
  );
}
