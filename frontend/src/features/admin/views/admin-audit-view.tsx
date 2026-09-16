'use client';

import React from 'react';
import { FileText, Filter, RefreshCw, Eye, ShieldCheck, Calendar, User, Search } from 'lucide-react';
import { useAdminAudit } from '../hooks/use-admin-audit';
import { AdminAuditLog } from '../../../api/admin.api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

export function AdminAuditView() {
  const {
    logs,
    filters,
    selectedLog,
    setSelectedLog,
    isLoading,
    updateFilters,
    resetFilters,
    refetch,
  } = useAdminAudit();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
              Audit & Governance Trail
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-semibold">
              Append-Only (M10/M12)
            </span>
          </div>
          <p className="text-xs text-devoc-text-muted mt-1">
            Immutable inspection log of all administrative actions, structural changes, and security mutations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-devoc-text-primary">
          <Filter className="h-3.5 w-3.5 text-devoc-text-muted" />
          Audit Query Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-devoc-text-muted">Action Name</label>
            <Input
              value={filters.action || ''}
              onChange={(e) => updateFilters({ action: e.target.value })}
              placeholder="e.g. PERSON_USER_LINKED"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-devoc-text-muted">Actor User ID</label>
            <Input
              value={filters.actorId || ''}
              onChange={(e) => updateFilters({ actorId: e.target.value })}
              placeholder="Filter by Actor UUID"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-devoc-text-muted">Start Date</label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-devoc-text-muted">End Date</label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-7 text-devoc-text-muted">
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="h-64 bg-devoc-surface-muted animate-pulse rounded border border-devoc-border" />
      ) : logs.length > 0 ? (
        <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary font-sans text-xs">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3 text-right font-sans">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-devoc-border text-devoc-text-primary text-[11px]">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-devoc-surface-hover cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-devoc-text-muted whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-devoc-accent">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-devoc-text-secondary uppercase">
                    {log.entityType}
                  </td>
                  <td className="py-2.5 px-3 text-devoc-text-muted truncate max-w-[120px]">
                    {log.entityId || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-devoc-text-muted truncate max-w-[100px]">
                    {log.actorId || log.actorUserId || 'system'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 font-sans">
                      <Eye className="h-3 w-3" />
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 rounded border border-dashed border-devoc-border bg-devoc-surface text-center text-xs text-devoc-text-muted">
          No audit records found matching the active query criteria.
        </div>
      )}

      {/* Audit Detail Dialog */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              Audit Record: {selectedLog?.action}
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded bg-devoc-surface-muted border border-devoc-border font-mono text-[11px]">
                <div>
                  <span className="text-devoc-text-muted block text-[10px]">Log UUID</span>
                  <span className="text-devoc-text-primary select-all">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-devoc-text-muted block text-[10px]">Recorded At</span>
                  <span className="text-devoc-text-primary">
                    {new Date(selectedLog.createdAt).toISOString()}
                  </span>
                </div>
                <div>
                  <span className="text-devoc-text-muted block text-[10px]">Entity Target</span>
                  <span className="text-devoc-text-primary">
                    {selectedLog.entityType} ({selectedLog.entityId || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-devoc-text-muted block text-[10px]">Actor / Request ID</span>
                  <span className="text-devoc-text-primary truncate block">
                    {selectedLog.actorId || selectedLog.actorUserId || 'system'} / {selectedLog.requestId || '—'}
                  </span>
                </div>
              </div>

              {selectedLog.beforeState && (
                <div className="space-y-1">
                  <span className="font-semibold text-devoc-text-secondary uppercase text-[10px] tracking-wider block">
                    State Prior to Mutation (Before)
                  </span>
                  <pre className="p-3 rounded bg-devoc-surface-muted border border-devoc-border font-mono text-[11px] overflow-x-auto text-devoc-text-muted">
                    {JSON.stringify(selectedLog.beforeState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterState && (
                <div className="space-y-1">
                  <span className="font-semibold text-devoc-text-secondary uppercase text-[10px] tracking-wider block">
                    State Result (After)
                  </span>
                  <pre className="p-3 rounded bg-devoc-surface-muted border border-devoc-border font-mono text-[11px] overflow-x-auto text-green-400">
                    {JSON.stringify(selectedLog.afterState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.payload && (
                <div className="space-y-1">
                  <span className="font-semibold text-devoc-text-secondary uppercase text-[10px] tracking-wider block">
                    Event Mutation Payload
                  </span>
                  <pre className="p-3 rounded bg-devoc-surface-muted border border-devoc-border font-mono text-[11px] overflow-x-auto text-devoc-text-primary">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
