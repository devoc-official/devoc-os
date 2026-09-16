'use client';

import React from 'react';
import { usePMDashboard } from '../hooks/use-pm-dashboard';
import { StatusBadge } from '../../../components/data/status-badge';
import { ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function PMRisksView() {
  const { blockedTasks } = usePMDashboard();

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Project Delivery Risks
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Risk registry and delivery bottleneck tracking across managed projects.
        </p>
      </div>

      {/* Authoritative Architectural Gap Notice */}
      <div className="p-6 rounded-md border border-dashed border-devoc-border bg-devoc-surface space-y-3 max-w-2xl">
        <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
          <ShieldAlert className="h-5 w-5" />
          <span>Risk Engine Status — Deferred Capability</span>
        </div>

        <p className="text-xs text-devoc-text-secondary leading-relaxed">
          In accordance with Section 38 of the DeVoc OS Master Architecture and F4 Execution Specification, a dedicated Risk Engine domain has not yet been introduced in backend M1–M15.
        </p>

        <p className="text-xs text-devoc-text-secondary leading-relaxed">
          To preserve data integrity and prevent AI hallucination, no mock or fabricated risk records are generated. Operational risk management is formally deferred to a dedicated milestone.
        </p>

        <div className="pt-2 border-t border-devoc-border text-xs text-devoc-text-muted">
          Operational delivery risks are currently monitored via active task blockers in the M4 Projects & Tasks engine.
        </div>
      </div>

      {/* Live Operational Blockers from M4 Tasks */}
      <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3 max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Current Active Task Blockers ({blockedTasks.length})
          </h3>
          <Link href="/pm/tasks" className="text-xs font-medium text-devoc-accent hover:underline flex items-center gap-1">
            Manage in Tasks
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {blockedTasks.length > 0 ? (
          <div className="divide-y divide-devoc-border/60">
            {blockedTasks.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-devoc-text-primary">{t.title}</div>
                  <span className="font-mono text-[11px] text-devoc-text-muted">
                    {t.taskKey || `#${t.id.slice(0, 6)}`} • Priority: {t.priority}
                  </span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-devoc-text-muted">
            No active blocked tasks currently recorded across your projects.
          </p>
        )}
      </div>
    </div>
  );
}
