'use client';

import React, { useState } from 'react';
import { Timesheet } from '../../../api/workforce-time.api';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/data/status-badge';
import { FileText, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface TimesheetSummaryProps {
  currentTimesheet?: Timesheet | null;
  timesheetHistory?: Timesheet[];
  isLoading?: boolean;
  onSubmitTimesheet?: (timesheetId: string) => Promise<void>;
  className?: string;
}

export function TimesheetSummary({
  currentTimesheet,
  timesheetHistory = [],
  isLoading = false,
  onSubmitTimesheet,
  className,
}: TimesheetSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentTimesheet || !onSubmitTimesheet) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmitTimesheet(currentTimesheet.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Timesheet submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {errorMsg && (
        <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Current Weekly Timesheet */}
      {currentTimesheet ? (
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-devoc-accent" />
                <span className="text-xs font-semibold text-devoc-text-primary">
                  Period: {currentTimesheet.periodStartDate} to {currentTimesheet.periodEndDate}
                </span>
                <StatusBadge status={currentTimesheet.status} />
              </div>
              <p className="text-[11px] text-devoc-text-secondary mt-0.5">
                Weekly workforce timesheet summary for verification and managerial approval.
              </p>
            </div>

            {(currentTimesheet.status === 'draft' || currentTimesheet.status === 'rejected') && onSubmitTimesheet && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-8 text-xs font-medium"
              >
                <Send className="h-3 w-3 mr-1.5" />
                Submit Weekly Timesheet
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-md bg-devoc-surface-secondary/50 border border-devoc-border text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Regular Hours</span>
              <span className="font-mono font-bold text-devoc-text-primary text-sm">
                {currentTimesheet.totalRegularHours}h
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Break Hours</span>
              <span className="font-mono text-devoc-text-secondary text-sm">
                {currentTimesheet.totalBreakHours}h
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Overtime</span>
              <span className="font-mono text-devoc-text-secondary text-sm">
                {currentTimesheet.totalOvertimeHours}h
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Billable Hours</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                {currentTimesheet.totalBillableHours}h
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-md border border-dashed border-devoc-border bg-devoc-surface text-center space-y-1">
          <FileText className="h-6 w-6 text-devoc-text-muted mx-auto" />
          <div className="text-xs font-medium text-devoc-text-primary">No Active Timesheet</div>
          <div className="text-[11px] text-devoc-text-secondary">
            There is no timesheet currently open for this billing period.
          </div>
        </div>
      )}

      {/* Timesheet History Archive */}
      {timesheetHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Timesheet History Archive
          </h4>
          <div className="rounded-md border border-devoc-border bg-devoc-surface overflow-hidden">
            <table className="w-full text-xs text-devoc-text-primary">
              <thead>
                <tr className="border-b border-devoc-border bg-devoc-surface-secondary text-devoc-text-secondary font-medium">
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Period</th>
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Status</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Regular</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Overtime</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border/60">
                {timesheetHistory.map((ts) => (
                  <tr key={ts.id} className="hover:bg-devoc-surface-secondary/40">
                    <td className="px-3.5 py-2 font-mono text-devoc-text-secondary">
                      {ts.periodStartDate} — {ts.periodEndDate}
                    </td>
                    <td className="px-3.5 py-2">
                      <StatusBadge status={ts.status} />
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono">{ts.totalRegularHours}h</td>
                    <td className="px-3.5 py-2 text-right font-mono text-devoc-text-muted">{ts.totalOvertimeHours}h</td>
                    <td className="px-3.5 py-2 text-right font-mono text-devoc-text-muted">
                      {ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
