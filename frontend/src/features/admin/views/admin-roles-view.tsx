'use client';

import React from 'react';
import { ShieldCheck, Lock, Users, Key, Info } from 'lucide-react';
import { useAdminRoles } from '../hooks/use-admin-roles';
import { StatusBadge } from '../../../components/data/status-badge';

export function AdminRolesView() {
  const { roles, capabilities, members, isLoading } = useAdminRoles();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-devoc-surface-muted animate-pulse rounded" />
        <div className="h-64 bg-devoc-surface-muted animate-pulse rounded border border-devoc-border" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Roles & Capability Governance
          </h1>
          <p className="text-xs text-devoc-text-muted mt-1">
            System role directory, contextual capability boundaries, and enterprise authorization matrix
          </p>
        </div>
      </div>

      {/* Contextual Authorization Architecture Banner */}
      <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-devoc-text-primary">
          <Info className="h-4 w-4 text-devoc-accent" />
          Effective Authorization Principle (AGENTS.md Section 6)
        </div>
        <p className="text-xs text-devoc-text-muted">
          Authorization in DeVoc OS is strictly contextual. An operational role does not grant global unrestricted access. The effective permission model evaluates:
        </p>
        <div className="flex items-center gap-2 pt-1 font-mono text-xs text-devoc-text-primary flex-wrap">
          <span className="px-2 py-1 rounded bg-devoc-surface-muted border border-devoc-border font-semibold">
            Role
          </span>
          <span>+</span>
          <span className="px-2 py-1 rounded bg-devoc-surface-muted border border-devoc-border font-semibold">
            Business Unit
          </span>
          <span>+</span>
          <span className="px-2 py-1 rounded bg-devoc-surface-muted border border-devoc-border font-semibold">
            Team
          </span>
          <span>+</span>
          <span className="px-2 py-1 rounded bg-devoc-surface-muted border border-devoc-border font-semibold">
            Project Context
          </span>
        </div>
      </div>

      {/* Role Directory */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-devoc-text-primary uppercase tracking-wider">
          Registered Roles ({roles.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((r) => (
            <div key={r.id} className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-devoc-text-primary">{r.name}</h4>
                  <span className="text-[10px] font-mono text-devoc-text-muted">{r.code}</span>
                </div>
                <StatusBadge status="active" />
              </div>
              <p className="text-[11px] text-devoc-text-muted">
                {r.description || 'System-defined operational role profile.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* System Capabilities Matrix */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-devoc-text-primary uppercase tracking-wider">
          Platform Capability Matrix ({capabilities.length})
        </h3>
        <div className="border border-devoc-border rounded-md overflow-hidden bg-devoc-surface">
          <table className="w-full text-left text-xs">
            <thead className="bg-devoc-surface-muted border-b border-devoc-border font-medium text-devoc-text-secondary">
              <tr>
                <th className="py-2.5 px-3">Capability Code</th>
                <th className="py-2.5 px-3">Capability Name</th>
                <th className="py-2.5 px-3">Enforcement Scope</th>
                <th className="py-2.5 px-3">Domain Engine</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-devoc-border text-devoc-text-primary font-mono text-[11px]">
              {capabilities.map((c) => (
                <tr key={c.code} className="hover:bg-devoc-surface-hover transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-devoc-accent">{c.code}</td>
                  <td className="py-2.5 px-3 font-sans font-medium text-devoc-text-primary">{c.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-devoc-surface-muted border border-devoc-border text-devoc-text-secondary uppercase">
                      {c.scope}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 uppercase text-devoc-text-muted">{c.module}</td>
                  <td className="py-2.5 px-3 font-sans text-devoc-text-muted">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
