'use client';

import React, { useState } from 'react';
import { usePMWork } from '../../pm/hooks/use-pm-work';
import { useEmployeeWork } from '../../employee/hooks/use-employee-work';
import { WorkTable } from '../../shared/components/work-table';
import { WorkLogModal } from '../../shared/components/work-log-modal';
import { WorkRecord } from '../../../api/work.api';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { StatusBadge } from '../../../components/data/status-badge';
import { Briefcase, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export function FounderWorkView() {
  const { workRecords, categories, projects, isLoading, approveWork, rejectWork, refetch } = usePMWork();
  const { createWork } = useEmployeeWork();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WorkRecord | null>(null);

  const totalMinutes = workRecords.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const pendingCount = workRecords.filter((r) => r.status === 'submitted').length;
  const approvedCount = workRecords.filter((r) => r.status === 'approved').length;

  const handleApprove = async (record: WorkRecord) => {
    await approveWork(record.id);
    refetch();
  };

  const handleReject = async (record: WorkRecord) => {
    await rejectWork(record.id, 'Founder revision requested');
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-devoc-accent" />
            Executive Work & Contributions
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Organization-wide contribution oversight, deliverable approvals, and founder strategic time logging.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsLogModalOpen(true)} className="h-8 text-xs font-medium">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Log Contribution
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Total Records</span>
          <span className="text-lg font-bold font-mono text-devoc-text-primary">{workRecords.length}</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Contribution Hours</span>
          <span className="text-lg font-bold font-mono text-devoc-accent">{totalHours}h</span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Pending Verification</span>
          <span className={`text-lg font-bold font-mono ${pendingCount > 0 ? 'text-amber-600' : 'text-devoc-text-muted'}`}>
            {pendingCount}
          </span>
        </div>
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Approved Records</span>
          <span className="text-lg font-bold font-mono text-emerald-600">{approvedCount}</span>
        </div>
      </div>

      {/* Main Table */}
      <WorkTable
        records={workRecords}
        categories={categories}
        projects={projects}
        isLoading={isLoading}
        canApprove={true}
        onApproveWork={handleApprove}
        onRejectWork={handleReject}
        onRecordClick={(record) => setSelectedRecord(record)}
        emptyTitle="No contributions registered"
        emptyDescription="No work logs found across the organization."
      />

      {/* Work Log Creation Modal */}
      <WorkLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        categories={categories}
        projects={projects}
        onSubmit={async (payload) => {
          await createWork(payload);
          refetch();
        }}
      />

      {/* Detail Dialog */}
      {selectedRecord && (
        <Dialog
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title={selectedRecord.title}
          description={`Logged on ${new Date(selectedRecord.createdAt).toLocaleDateString()}`}
          maxWidth="md"
        >
          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={selectedRecord.status} />
              <span className="text-xs font-mono text-devoc-text-muted">
                {Math.floor(selectedRecord.durationMinutes / 60)}h {selectedRecord.durationMinutes % 60}m
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Description</span>
              <p className="p-2.5 rounded bg-devoc-surface-secondary/40 border border-devoc-border mt-1 whitespace-pre-wrap text-devoc-text-primary">
                {selectedRecord.description || 'No detailed description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Duration</span>
                <span className="font-mono text-devoc-text-primary">{selectedRecord.durationMinutes} minutes</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Status</span>
                <span className="font-semibold text-devoc-text-primary uppercase">{selectedRecord.status}</span>
              </div>
            </div>

            {selectedRecord.status === 'submitted' && (
              <div className="flex justify-end gap-2 pt-3 border-t border-devoc-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleReject(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="h-7 text-xs text-red-600 hover:text-red-700"
                >
                  Request Revision
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleApprove(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="h-7 text-xs"
                >
                  Approve Deliverable
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
