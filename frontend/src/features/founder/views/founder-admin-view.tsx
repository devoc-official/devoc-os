'use client';

import React, { useState } from 'react';
import { useFounderAdmin } from '../hooks/use-founder-admin';
import { useAuth } from '../../../auth/use-auth';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { OrganizationMember, FeatureConfiguration, AdminAuditLog } from '../../../api/admin.api';
import { ShieldCheck, Settings, Users, Sliders, FileText, Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';

export function FounderAdminView() {
  const { settings, members, features, auditLogs, isLoading } = useFounderAdmin();
  const { currentOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'features' | 'audit'>('members');
  const [searchQuery, setSearchQuery] = useState('');

  const memberColumns: Column<OrganizationMember>[] = [
    {
      key: 'userId',
      header: 'Member Account',
      render: (m) => (
        <div>
          <div className="font-semibold text-xs text-devoc-text-primary">
            {m.fullName || `User #${m.userId.slice(0, 8)}`}
          </div>
          {m.email && <span className="text-[10px] text-devoc-text-muted">{m.email}</span>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      width: '140px',
      render: (m) => (
        <span className="text-xs font-mono font-medium text-devoc-accent uppercase">{m.role}</span>
      ),
    },
    {
      key: 'status',
      header: 'Membership Status',
      width: '140px',
      render: (m) => <StatusBadge status={m.status} />,
    },
    {
      key: 'joinedAt',
      header: 'Joined Date',
      width: '130px',
      render: (m) => (
        <span className="text-[11px] text-devoc-text-muted">
          {new Date(m.joinedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const featureColumns: Column<FeatureConfiguration>[] = [
    {
      key: 'featureKey',
      header: 'Feature Key',
      width: '200px',
      render: (f) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-primary">{f.featureKey}</span>
      ),
    },
    {
      key: 'description',
      header: 'Feature Description',
      render: (f) => (
        <span className="text-xs text-devoc-text-secondary">{f.description || 'System capability flag'}</span>
      ),
    },
    {
      key: 'isEnabled',
      header: 'State',
      width: '110px',
      render: (f) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
            f.isEnabled
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
          }`}
        >
          {f.isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
  ];

  const auditColumns: Column<AdminAuditLog>[] = [
    {
      key: 'action',
      header: 'Action',
      width: '160px',
      render: (l) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-primary">{l.action}</span>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity',
      width: '140px',
      render: (l) => (
        <span className="text-xs uppercase font-medium text-devoc-text-secondary">
          {l.entityType}
        </span>
      ),
    },
    {
      key: 'entityId',
      header: 'Entity Ref',
      render: (l) => (
        <span className="font-mono text-[11px] text-devoc-text-muted">
          {l.entityId ? `#${l.entityId.slice(0, 12)}` : 'System'}
        </span>
      ),
    },
    {
      key: 'actorUserId',
      header: 'Actor User',
      width: '140px',
      render: (l) => (
        <span className="font-mono text-[11px] text-devoc-text-secondary">
          {l.actorUserId ? `#${l.actorUserId.slice(0, 8)}` : 'System'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      width: '160px',
      render: (l) => (
        <span className="text-[11px] text-devoc-text-muted font-mono">
          {new Date(l.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = m.fullName.toLowerCase();
    const email = m.email.toLowerCase();
    return name.includes(q) || email.includes(q) || m.role.toLowerCase().includes(q);
  });

  const filteredFeatures = features.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return f.featureKey.toLowerCase().includes(q) || (f.description?.toLowerCase().includes(q) ?? false);
  });

  const filteredAuditLogs = auditLogs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.action.toLowerCase().includes(q) || l.entityType.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-devoc-accent" />
          Tenant Administration & Security Governance
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Tenant-isolated administrative governance, member credentialing, system feature configurations, and immutable audit trails.
        </p>
      </div>

      {/* Settings Overview Panel */}
      {settings && (
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3">
          <div className="flex items-center justify-between border-b border-devoc-border pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5 text-devoc-accent" />
              Tenant Configuration
            </span>
            <span className="text-xs font-mono text-devoc-text-muted">ID: {settings.organizationId}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Legal Name</span>
              <span className="font-semibold text-devoc-text-primary">{currentOrganization?.organizationName || 'DeVoc Organization'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Organization ID</span>
              <span className="font-mono text-devoc-text-primary">{settings.organizationId.slice(0, 12)}...</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Default Currency</span>
              <span className="font-mono text-devoc-text-primary">{settings.defaultCurrency || 'USD'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">Timezone</span>
              <span className="font-mono text-devoc-text-primary">{settings.timeZone || 'UTC'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 border-b sm:border-0 border-devoc-border w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'members'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Tenant Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'features'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Feature Flags ({features.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'audit'
                ? 'bg-devoc-accent text-white'
                : 'text-devoc-text-secondary hover:text-devoc-text-primary bg-devoc-surface border border-devoc-border'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search administration..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <DataTable
          columns={memberColumns}
          data={filteredMembers}
          keyField={(m) => m.userId}
          isLoading={isLoading}
          emptyTitle="No members found"
          emptyDescription="No tenant members match your query."
        />
      )}

      {activeTab === 'features' && (
        <DataTable
          columns={featureColumns}
          data={filteredFeatures}
          keyField={(f) => f.featureKey}
          isLoading={isLoading}
          emptyTitle="No features configured"
          emptyDescription="Standard platform features are active without tenant overrides."
        />
      )}

      {activeTab === 'audit' && (
        <DataTable
          columns={auditColumns}
          data={filteredAuditLogs}
          keyField={(l) => l.id}
          isLoading={isLoading}
          emptyTitle="No audit logs recorded"
          emptyDescription="Zero audit entries currently registered for this tenant."
        />
      )}
    </div>
  );
}
