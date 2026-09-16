'use client';

import React, { useState } from 'react';
import { useEmployeeWork } from '../hooks/use-employee-work';
import { WorkTable } from '../../shared/components/work-table';
import { WorkLogModal } from '../../shared/components/work-log-modal';
import { WorkRecord } from '../../../api/work.api';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { StatusBadge } from '../../../components/data/status-badge';
import { Briefcase, Plus, Clock, Send, Link as LinkIcon, AlertCircle } from 'lucide-react';

export function EmployeeWorkView() {
  const { workRecords, categories, projects, isLoading, createWork, submitWork } = useEmployeeWork();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WorkRecord | null>(null);

  const handleSubmit = async (record: WorkRecord) => {
    try {
      await submitWork(record.id);
      if (selectedRecord?.id === record.id) {
        setSelectedRecord(null);
      }
    } catch {
      // Handled in hook
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            My Work
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Work contribution ledger. Log engineering time, outcomes delivered, and link evidence deliverables for review.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsLogModalOpen(true)} className="h-8 text-xs font-medium">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Log Contribution
        </Button>
      </div>

      {/* Main Table */}
      <WorkTable
        records={workRecords}
        categories={categories}
        projects={projects}
        isLoading={isLoading}
        onRecordClick={(record) => setSelectedRecord(record)}
        onSubmitWork={handleSubmit}
        emptyTitle="No work records found"
        emptyDescription="Log your first contribution using the 'Log Contribution' button above."
      />

      {/* Work Log Creation Modal */}
      <WorkLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        categories={categories}
        projects={projects}
        onSubmit={createWork}
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

            {selectedRecord.status === 'draft' && (
              <div className="pt-2 border-t border-devoc-border flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleSubmit(selectedRecord)}
                  className="h-8 text-xs font-medium"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Submit for Approval
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
