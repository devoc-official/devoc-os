'use client';

import React, { useState } from 'react';
import { useFounderOrganization } from '../hooks/use-founder-organization';
import { StatusBadge } from '../../../components/data/status-badge';
import { Tabs, TabList, TabTrigger, TabContent } from '../../../components/ui/tabs';
import { Building2, MapPin, Briefcase, Layers, Users, FolderGit2 } from 'lucide-react';

export function FounderOrganizationView() {
  const {
    organization,
    branches,
    businessUnits,
    departments,
    teams,
    peopleMap,
    projects,
    isLoading,
  } = useFounderOrganization();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <Building2 className="h-5 w-5 text-devoc-accent" />
          Organizational Architecture
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          High-level operational hierarchy: physical Branches, configurable Business Units, Departments, and Teams.
        </p>
      </div>

      {/* Organization Root Info */}
      {organization && (
        <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-devoc-text-primary">{organization.name}</div>
            <div className="text-xs font-mono text-devoc-text-muted">Slug: {organization.slug}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={organization.status} />
          </div>
        </div>
      )}

      {/* Structural Distinction Alert */}
      <div className="p-3.5 rounded border border-devoc-border bg-devoc-surface-secondary/40 text-xs text-devoc-text-secondary space-y-1">
        <span className="font-semibold text-devoc-text-primary flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-devoc-accent" />
          Structural Tenancy Principle
        </span>
        <p className="text-[11px] text-devoc-text-muted">
          A physical Branch does not necessarily contain every Business Unit. Projects may span multiple BUs simultaneously, and individual contributors maintain contextual roles rather than rigid single-department locks.
        </p>
      </div>

      {/* Tabbed Structure Views */}
      <Tabs defaultValue="bus" className="space-y-4">
        <TabList>
          <TabTrigger value="bus">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Business Units ({businessUnits.length})
          </TabTrigger>
          <TabTrigger value="branches">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Physical Branches ({branches.length})
          </TabTrigger>
          <TabTrigger value="departments">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Departments ({departments.length})
          </TabTrigger>
          <TabTrigger value="teams">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Teams ({teams.length})
          </TabTrigger>
        </TabList>

        {/* Business Units Tab */}
        <TabContent value="bus" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {businessUnits.map((bu) => {
              const headName = bu.headPersonId ? peopleMap.get(bu.headPersonId) : null;
              const buDepts = departments.filter((d) => d.businessUnitId === bu.id);
              const buTeams = teams.filter((t) => t.businessUnitId === bu.id);

              return (
                <div
                  key={bu.id}
                  className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-devoc-text-primary">{bu.name}</h3>
                      <span className="text-[10px] font-mono text-devoc-text-muted">{bu.code}</span>
                    </div>
                    <StatusBadge status={bu.status} />
                  </div>

                  <div className="space-y-1.5 text-xs text-devoc-text-secondary pt-1 border-t border-devoc-border/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-devoc-text-muted">Unit Head:</span>
                      <span className="font-medium text-devoc-text-primary">
                        {headName || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-devoc-text-muted">Departments:</span>
                      <span className="font-mono">{buDepts.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-devoc-text-muted">Teams:</span>
                      <span className="font-mono">{buTeams.length}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabContent>

        {/* Branches Tab */}
        <TabContent value="branches" className="space-y-3">
          {branches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {branches.map((b) => (
                <div key={b.id} className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-devoc-text-primary">{b.name}</h3>
                      <span className="text-[10px] font-mono text-devoc-text-muted">{b.code}</span>
                    </div>
                    <StatusBadge status={b.status || 'active'} />
                  </div>
                  {b.location && (
                    <div className="text-[11px] text-devoc-text-muted flex items-center gap-1 pt-1">
                      <MapPin className="h-3 w-3" />
                      {b.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded border border-dashed border-devoc-border bg-devoc-surface text-center text-xs text-devoc-text-muted">
              No physical branches registered. All operations mapped to primary organization location.
            </div>
          )}
        </TabContent>

        {/* Departments Tab */}
        <TabContent value="departments" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((d) => (
              <div key={d.id} className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
                <div className="text-xs font-bold text-devoc-text-primary">{d.name}</div>
                <span className="text-[10px] font-mono text-devoc-text-muted">{d.code}</span>
              </div>
            ))}
          </div>
        </TabContent>

        {/* Teams Tab */}
        <TabContent value="teams" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map((t) => (
              <div key={t.id} className="p-3.5 rounded-md border border-devoc-border bg-devoc-surface space-y-1">
                <div className="text-xs font-bold text-devoc-text-primary">{t.name}</div>
                <span className="text-[10px] font-mono text-devoc-text-muted">{t.code}</span>
              </div>
            ))}
          </div>
        </TabContent>
      </Tabs>
    </div>
  );
}
