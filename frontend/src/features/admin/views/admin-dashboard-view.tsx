'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Network,
  ShieldCheck,
  Database,
  ToggleLeft,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { MetricCard } from '../../../components/data/metric-card';
import { StatusBadge } from '../../../components/data/status-badge';
import { Button } from '../../../components/ui/button';

export function AdminDashboardView() {
  const {
    organization,
    settings,
    members,
    activeMembers,
    pendingOrInvitedMembers,
    suspendedMembers,
    branches,
    businessUnits,
    departments,
    teams,
    people,
    roles,
    features,
    enabledFeatures,
    recentAuditLogs,
    attentionItems,
    isLoading,
  } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-devoc-surface-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-devoc-surface-muted animate-pulse rounded border border-devoc-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
              System Administration
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-devoc-surface-muted text-devoc-text-secondary border border-devoc-border">
              {organization?.name || 'Organization'}
            </span>
          </div>
          <p className="text-xs text-devoc-text-muted mt-1">
            Centralized platform control, structure management, membership governance, and security audit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/audit">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Audit Stream
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="primary" size="sm" className="gap-1 text-xs">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational Attention Items */}
      {attentionItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-devoc-text-primary">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Operational Attention Items ({attentionItems.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-md border border-amber-500/20 bg-amber-500/5 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-semibold text-devoc-text-primary">{item.title}</h4>
                  </div>
                  <p className="text-[11px] text-devoc-text-muted">{item.description}</p>
                </div>
                <Link href={item.actionHref}>
                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                    {item.actionLabel}
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Command Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Organization Members"
          value={members.length}
          subtext={`${activeMembers.length} active • ${pendingOrInvitedMembers.length} invited`}
          icon={Users}
        />
        <MetricCard
          label="Organizational Entities"
          value={businessUnits.length}
          subtext={`${branches.length} branches • ${departments.length} depts • ${teams.length} teams`}
          icon={Network}
        />
        <MetricCard
          label="Talent Directory"
          value={people.length}
          subtext={`${roles.length} role definitions registered`}
          icon={Building2}
        />
        <MetricCard
          label="Feature Configurations"
          value={features.length}
          subtext={`${enabledFeatures.length} active features enabled`}
          icon={ToggleLeft}
        />
      </div>

      {/* Quick Navigation Hub */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-devoc-text-secondary uppercase tracking-wider">
          Administrative Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Link
            href="/admin/organization"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <Building2 className="h-4 w-4 text-devoc-text-muted" />
              Organization Profile
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Tenant metadata, locale, default branch and organizational identity.
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <Users className="h-4 w-4 text-devoc-text-muted" />
              Users & Access
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Organization memberships, invitations, and identity-to-person linking.
            </p>
          </Link>

          <Link
            href="/admin/people"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <ShieldCheck className="h-4 w-4 text-devoc-text-muted" />
              People Administration
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Personnel records, employment status, and contextual role assignments.
            </p>
          </Link>

          <Link
            href="/admin/structure"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <Network className="h-4 w-4 text-devoc-text-muted" />
              Business Structure
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Physical branches, configurable business units, departments, and teams.
            </p>
          </Link>

          <Link
            href="/admin/roles"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <ShieldCheck className="h-4 w-4 text-devoc-text-muted" />
              Roles & Permissions
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Directory of organizational roles and capability matrix scopes.
            </p>
          </Link>

          <Link
            href="/admin/master-data"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <Database className="h-4 w-4 text-devoc-text-muted" />
              Configurable Master Data
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Work categories, meeting types, evaluation templates, and skills.
            </p>
          </Link>

          <Link
            href="/admin/features"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <ToggleLeft className="h-4 w-4 text-devoc-text-muted" />
              Feature Configuration
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Platform feature flags, overrides, and JSON configuration payloads.
            </p>
          </Link>

          <Link
            href="/admin/audit"
            className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-devoc-text-primary">
              <FileText className="h-4 w-4 text-devoc-text-muted" />
              Audit Trail
            </div>
            <p className="text-[11px] text-devoc-text-muted">
              Append-only immutable log of all administrative and security actions.
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Administrative Audit Events */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-devoc-text-primary">Recent Administrative Events</h3>
            <span className="text-[10px] text-devoc-text-muted">(Last 10 mutations)</span>
          </div>
          <Link href="/admin/audit" className="text-xs text-devoc-accent hover:underline flex items-center gap-1">
            View full audit log
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {recentAuditLogs.length > 0 ? (
          <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity Type</th>
                  <th className="py-2.5 px-3">Entity ID</th>
                  <th className="py-2.5 px-3 text-right">Actor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border text-devoc-text-primary">
                {recentAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-devoc-surface-hover transition-colors font-mono text-[11px]">
                    <td className="py-2.5 px-3 text-devoc-text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-devoc-text-primary">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-devoc-text-secondary">
                      {log.entityType}
                    </td>
                    <td className="py-2.5 px-3 text-devoc-text-muted truncate max-w-[120px]">
                      {log.entityId || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-devoc-text-muted truncate max-w-[100px]">
                      {log.actorId || log.actorUserId || 'system'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded border border-dashed border-devoc-border bg-devoc-surface text-center text-xs text-devoc-text-muted">
            No administrative audit events recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
