'use client';

import React, { useState } from 'react';
import { LeaveBalance, LeaveType, LeaveRequest } from '../../../api/workforce-time.api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { StatusBadge } from '../../../components/data/status-badge';
import { Dialog, DialogFooter } from '../../../components/ui/dialog';
import { Calendar, Plus, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  requests?: LeaveRequest[];
  isLoading?: boolean;
  onRequestLeave?: (payload: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    requestedDays: number;
    reason?: string;
  }) => Promise<void>;
  className?: string;
}

export function LeaveBalanceCard({
  balances,
  leaveTypes,
  requests = [],
  isLoading = false,
  onRequestLeave,
  className,
}: LeaveBalanceCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState(leaveTypes[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestedDays, setRequestedDays] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const leaveTypeMap = new Map<string, LeaveType>();
  leaveTypes.forEach((lt) => leaveTypeMap.set(lt.id, lt));

  const handleApply = async () => {
    if (!selectedTypeId || !startDate || !endDate || requestedDays <= 0) {
      setErrorMsg('Please complete all required leave request fields.');
      return;
    }
    if (!onRequestLeave) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onRequestLeave({
        leaveTypeId: selectedTypeId,
        startDate,
        endDate,
        requestedDays,
        reason: reason.trim() || undefined,
      });
      setIsModalOpen(false);
      setStartDate('');
      setEndDate('');
      setRequestedDays(1);
      setReason('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Leave Balances & Allocations
          </h4>
          <p className="text-[11px] text-devoc-text-muted">
            Track annual allocations, used days, and pending requests.
          </p>
        </div>

        {onRequestLeave && (
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Request Leave
          </Button>
        )}
      </div>

      {/* Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {balances.length > 0 ? (
          balances.map((b) => {
            const lt = leaveTypeMap.get(b.leaveTypeId);
            return (
              <div
                key={b.id}
                className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-devoc-text-primary">
                    {lt?.name || 'Annual Leave'}
                  </span>
                  <span className="text-[10px] text-devoc-text-muted font-mono">{b.year}</span>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                  <div className="p-1.5 rounded bg-devoc-surface-secondary/50">
                    <span className="text-[10px] uppercase text-devoc-text-muted block">Total</span>
                    <span className="font-mono text-xs font-bold text-devoc-text-primary">{b.allocatedDays}d</span>
                  </div>
                  <div className="p-1.5 rounded bg-devoc-surface-secondary/50">
                    <span className="text-[10px] uppercase text-devoc-text-muted block">Used</span>
                    <span className="font-mono text-xs font-medium text-devoc-text-secondary">{b.usedDays}d</span>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50">
                    <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-300 block font-semibold">Left</span>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">{b.availableDays}d</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="sm:col-span-3 p-4 rounded-md border border-dashed border-devoc-border text-center text-xs text-devoc-text-muted">
            No active leave balance records configured for this employment.
          </div>
        )}
      </div>

      {/* Leave Requests History */}
      {requests.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Leave Requests History
          </h4>
          <div className="rounded-md border border-devoc-border bg-devoc-surface overflow-hidden">
            <table className="w-full text-xs text-devoc-text-primary">
              <thead>
                <tr className="border-b border-devoc-border bg-devoc-surface-secondary text-devoc-text-secondary font-medium">
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Leave Type</th>
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Dates</th>
                  <th className="px-3.5 py-2 text-center font-semibold text-[11px] uppercase">Days</th>
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Reason</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border/60">
                {requests.map((req) => {
                  const lt = leaveTypeMap.get(req.leaveTypeId);
                  return (
                    <tr key={req.id} className="hover:bg-devoc-surface-secondary/40">
                      <td className="px-3.5 py-2 font-medium text-devoc-text-primary">
                        {lt?.name || 'General Leave'}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-devoc-text-secondary">
                        {req.startDate} to {req.endDate}
                      </td>
                      <td className="px-3.5 py-2 text-center font-mono">{req.requestedDays}d</td>
                      <td className="px-3.5 py-2 text-devoc-text-muted truncate max-w-[150px]">
                        {req.reason || '—'}
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Application Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply for Leave"
        description="Submit planned time off for managerial review."
        maxWidth="md"
      >
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.isPaid ? 'Paid' : 'Unpaid'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-devoc-text-primary block">
                Start Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs bg-devoc-surface border-devoc-border"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-devoc-text-primary block">
                End Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs bg-devoc-surface border-devoc-border"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Requested Working Days <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={requestedDays}
              onChange={(e) => setRequestedDays(Number(e.target.value))}
              className="w-32 h-8 text-xs bg-devoc-surface border-devoc-border font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Reason / Notes
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional explanation..."
              className="w-full p-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent resize-none"
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
            onClick={handleApply}
            disabled={isSubmitting}
            className="text-xs h-8"
          >
            Submit Request
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
