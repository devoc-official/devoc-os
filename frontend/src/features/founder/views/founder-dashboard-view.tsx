'use client';

import React from 'react';
import { useFounderDashboard } from '../hooks/use-founder-dashboard';
import { StatusBadge } from '../../../components/data/status-badge';
import {
  Building2,
  Users,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Clock,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';

export function FounderDashboardView() {
  const {
    activePeople,
    roles,
    businessUnits,
    activeProjects,
    blockedTasks,
    pendingWorkApprovals,
    totalContributionHours,
    activeEnrollments,
    programs,
    openPositions,
    applications,
    totalRevenueInflow,
    outstandingReceivables,
    pendingTimesheets,
    attentionItems,
    isLoading,
  } = useFounderDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <Building2 className="h-5 w-5 text-devoc-accent" />
          Founder Executive Command Center
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Holistic organizational oversight, talent allocation, strategic delivery, and operational business position.
        </p>
      </div>

      {/* Executive Attention Section (High-signal decision support) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Executive Attention & Operational Signals ({attentionItems.length})
          </h2>
        </div>

        {attentionItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface flex flex-col justify-between space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-semibold text-devoc-text-muted">
                      {item.category}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        item.severity === 'critical'
                          ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                          : item.severity === 'warning'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-devoc-text-primary line-clamp-1">{item.title}</h3>
                  <p className="text-[11px] text-devoc-text-secondary line-clamp-2">{item.description}</p>
                </div>
                <Link
                  href={item.actionHref}
                  className="inline-flex items-center text-[11px] font-medium text-devoc-accent hover:underline pt-1"
                >
                  {item.actionLabel}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface text-xs text-devoc-text-muted flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Zero operational bottlenecks or overdue obligations currently require executive intervention.
          </div>
        )}
      </div>

      {/* Primary KPI Grid (M1–M15 Verified Grounded Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Users className="h-3 w-3" /> People & BUs
          </span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">
            {activePeople.length} <span className="text-xs font-normal text-devoc-text-muted">across {businessUnits.length} BUs</span>
          </div>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <FolderGit2 className="h-3 w-3" /> Projects
          </span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">
            {activeProjects.length} <span className="text-xs font-normal text-devoc-text-muted">({blockedTasks.length} blocked)</span>
          </div>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> Logged Work
          </span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">
            {totalContributionHours}h
          </div>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <GraduationCap className="h-3 w-3" /> Academy
          </span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">
            {activeEnrollments.length} <span className="text-xs font-normal text-devoc-text-muted">students</span>
          </div>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <Search className="h-3 w-3" /> Recruitment
          </span>
          <div className="text-base font-bold font-mono text-devoc-text-primary">
            {openPositions.length} <span className="text-xs font-normal text-devoc-text-muted">open roles</span>
          </div>
        </div>

        <div className="p-3 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
          <span className="text-[10px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Cash Inflow
          </span>
          <div className="text-base font-bold font-mono text-emerald-600">
            ₹{totalRevenueInflow.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Executive Workspaces Navigation Quick-Links */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
          Executive Operations Directory
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <Link
            href="/organization"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <Building2 className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Organization</div>
            <p className="text-[10px] text-devoc-text-muted">Branches, BUs, Teams</p>
          </Link>

          <Link
            href="/people"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <Users className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">People & Roles</div>
            <p className="text-[10px] text-devoc-text-muted">Talent, assignments, BUs</p>
          </Link>

          <Link
            href="/academy"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <GraduationCap className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Academy Operations</div>
            <p className="text-[10px] text-devoc-text-muted">Students, fees, reviews</p>
          </Link>

          <Link
            href="/projects"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <FolderGit2 className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Project Portfolio</div>
            <p className="text-[10px] text-devoc-text-muted">Cross-BU deliverables</p>
          </Link>

          <Link
            href="/finance"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <TrendingUp className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Finance Position</div>
            <p className="text-[10px] text-devoc-text-muted">Obligations, cash flow</p>
          </Link>

          <Link
            href="/recruitment"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <Search className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Recruitment</div>
            <p className="text-[10px] text-devoc-text-muted">Hiring pipeline & stages</p>
          </Link>

          <Link
            href="/workforce"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <Clock className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Workforce & Time</div>
            <p className="text-[10px] text-devoc-text-muted">Timesheets & attendance</p>
          </Link>

          <Link
            href="/work"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <Briefcase className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Work Contributions</div>
            <p className="text-[10px] text-devoc-text-muted">Cross-team ledger</p>
          </Link>

          <Link
            href="/meetings"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <Calendar className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Meetings</div>
            <p className="text-[10px] text-devoc-text-muted">Agendas & action items</p>
          </Link>

          <Link
            href="/analytics"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <TrendingUp className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Analytics BI</div>
            <p className="text-[10px] text-devoc-text-muted">M11 metric catalog</p>
          </Link>

          <Link
            href="/administration"
            className="p-3 rounded border border-devoc-border bg-devoc-surface hover:border-devoc-accent/50 transition-colors space-y-1 block"
          >
            <Sliders className="h-4 w-4 text-devoc-accent" />
            <div className="text-xs font-semibold text-devoc-text-primary">Administration</div>
            <p className="text-[10px] text-devoc-text-muted">Settings, features, audit</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
