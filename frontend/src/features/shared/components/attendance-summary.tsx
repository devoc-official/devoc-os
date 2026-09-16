'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '../../../api/workforce-time.api';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/data/status-badge';
import { Clock, LogIn, LogOut, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface AttendanceSummaryProps {
  todayRecord?: AttendanceRecord | null;
  recentRecords?: AttendanceRecord[];
  isLoading?: boolean;
  onCheckIn?: () => Promise<void>;
  onCheckOut?: () => Promise<void>;
  className?: string;
}

export function AttendanceSummary({
  todayRecord,
  recentRecords = [],
  isLoading = false,
  onCheckIn,
  onCheckOut,
  className,
}: AttendanceSummaryProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCheckedIn = Boolean(
    todayRecord && todayRecord.status === 'present' && !todayRecord.hasMissingCheckout
  );

  const formatHoursMins = (mins: number) => {
    if (!mins || mins <= 0) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const handleCheckIn = async () => {
    if (!onCheckIn) return;
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      await onCheckIn();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Check-in failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!onCheckOut) return;
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      await onCheckOut();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Check-out failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {errorMsg && (
        <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Today's Clock Card */}
      <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Today's Attendance
              </span>
              <span className="text-xs text-devoc-text-muted">•</span>
              <span className="text-xs font-mono text-devoc-text-primary">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-lg font-bold text-devoc-text-primary">
                {todayRecord ? formatHoursMins(todayRecord.totalWorkMinutes) : '0h 0m'}
              </span>
              <span className="text-xs text-devoc-text-muted">recorded today</span>
              {todayRecord && <StatusBadge status={todayRecord.status} />}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isCheckedIn ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckOut}
                disabled={isProcessing || !onCheckOut}
                className="h-9 px-4 text-xs font-medium border-amber-600/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Clock Out
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCheckIn}
                disabled={isProcessing || !onCheckIn}
                className="h-9 px-4 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Clock In
              </Button>
            )}
          </div>
        </div>

        {todayRecord?.hasMissingCheckout && (
          <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
            <span>Missing check-out detected on a prior session. Please submit an attendance correction.</span>
          </div>
        )}
      </div>

      {/* Recent Attendance History Table */}
      {recentRecords.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
            Recent Attendance Ledger
          </h4>
          <div className="rounded-md border border-devoc-border bg-devoc-surface overflow-hidden">
            <table className="w-full text-xs text-devoc-text-primary">
              <thead>
                <tr className="border-b border-devoc-border bg-devoc-surface-secondary text-devoc-text-secondary font-medium">
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Date</th>
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Status</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Presence</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Breaks</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Net Work</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border/60">
                {recentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-devoc-surface-secondary/40">
                    <td className="px-3.5 py-2 font-mono text-devoc-text-secondary">{r.attendanceDate}</td>
                    <td className="px-3.5 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono text-devoc-text-secondary">
                      {formatHoursMins(r.totalPresenceMinutes)}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono text-devoc-text-muted">
                      {formatHoursMins(r.totalBreakMinutes)}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-semibold text-devoc-text-primary">
                      {formatHoursMins(r.totalWorkMinutes)}
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
