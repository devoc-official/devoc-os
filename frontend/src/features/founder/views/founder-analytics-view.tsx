'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { analyticsApi, AnalyticsMetric } from '../../../api/analytics.api';
import { useFounderDashboard } from '../hooks/use-founder-dashboard';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { BarChart3, TrendingUp, Users, FolderGit2, GraduationCap, DollarSign, Calculator } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export function FounderAnalyticsView() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';
  const {
    activePeople,
    activeProjects,
    totalContributionHours,
    activeEnrollments,
    totalRevenueInflow,
    outstandingReceivables,
  } = useFounderDashboard();

  const [computingMetricId, setComputingMetricId] = useState<string | null>(null);
  const [computedValues, setComputedValues] = useState<Record<string, number>>({});

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['founder', 'analytics-metrics', orgId],
    queryFn: () => analyticsApi.listMetrics(orgId),
    enabled: Boolean(orgId),
  });

  const handleCompute = async (metric: AnalyticsMetric) => {
    setComputingMetricId(metric.id);
    try {
      const res = await analyticsApi.computeMetric(orgId, metric.id);
      setComputedValues((prev) => ({ ...prev, [metric.id]: res.value }));
    } catch {
      // Fallback display if metric cannot be computed synchronously
    } finally {
      setComputingMetricId(null);
    }
  };

  const columns: Column<AnalyticsMetric>[] = [
    {
      key: 'code',
      header: 'Metric Code',
      width: '180px',
      render: (m) => (
        <span className="font-mono text-xs font-semibold text-devoc-text-secondary">{m.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Metric Definition',
      render: (m) => <span className="font-semibold text-xs text-devoc-text-primary">{m.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      width: '140px',
      render: (m) => (
        <span className="text-[11px] uppercase font-semibold text-devoc-text-secondary">
          {m.category}
        </span>
      ),
    },
    {
      key: 'aggregationType',
      header: 'Aggregation',
      width: '130px',
      render: (m) => (
        <span className="font-mono text-xs text-devoc-text-muted">{m.aggregationType}</span>
      ),
    },
    {
      key: 'value',
      header: 'Current Value',
      width: '160px',
      align: 'right',
      render: (m) => {
        const val = computedValues[m.id];
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono text-xs font-bold text-devoc-accent">
              {val !== undefined ? `${val} ${m.unit || ''}` : '—'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCompute(m)}
              disabled={computingMetricId === m.id}
              className="h-6 px-1.5 text-[10px]"
            >
              <Calculator className="h-2.5 w-2.5 mr-1" />
              {computingMetricId === m.id ? '...' : 'Compute'}
            </Button>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (m) => <StatusBadge status={m.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-devoc-accent" />
          Executive Analytics & Decision Support
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Quantitative analytics layer over domain transactions: engineering throughput, talent utilization, academy performance, and financial return.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Users className="h-3 w-3" /> Active Talent
          </span>
          <div className="text-lg font-bold font-mono text-devoc-text-primary">{activePeople.length}</div>
          <span className="text-[10px] text-devoc-text-muted">Total people under management</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <FolderGit2 className="h-3 w-3" /> Delivery Output
          </span>
          <div className="text-lg font-bold font-mono text-devoc-accent">{totalContributionHours}h</div>
          <span className="text-[10px] text-devoc-text-muted">Logged engineering hours</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <GraduationCap className="h-3 w-3" /> Academy Pipeline
          </span>
          <div className="text-lg font-bold font-mono text-devoc-text-primary">{activeEnrollments.length}</div>
          <span className="text-[10px] text-devoc-text-muted">Students actively progressing</span>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Revenue Inflow
          </span>
          <div className="text-lg font-bold font-mono text-emerald-600">
            ${totalRevenueInflow.toLocaleString()}
          </div>
          <span className="text-[10px] text-devoc-text-muted">Posted collections</span>
        </div>
      </div>

      {/* Analytics Notice */}
      <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface-secondary/40 text-xs text-devoc-text-secondary">
        <span className="font-semibold text-devoc-text-primary">Source of Truth Rule (AGENTS.md Section 4):</span>{' '}
        Analytics serves as a decision-support aggregation engine. It derives insights from transactional domains without overriding authoritative domain state.
      </div>

      {/* Metric Definitions & Computations */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
          Registered Performance Metrics ({metrics.length})
        </h2>

        <DataTable
          columns={columns}
          data={metrics}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No metrics registered"
          emptyDescription="No analytics metrics currently configured for this organization."
        />
      </div>
    </div>
  );
}
