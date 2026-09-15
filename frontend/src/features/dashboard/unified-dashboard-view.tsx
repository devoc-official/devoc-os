import React from 'react';
import { DashboardHeader } from './dashboard-header';
import { RoleOverviewSection } from './role-overview-section';
import { AttentionSection } from './attention-section';
import { MetricsSection } from './metrics-section';
import { ActivitySection } from './activity-section';
import { ContextBanner } from '../../components/devoc/context-banner';
import { useRole } from '../../roles/role.context';
import { useAuth } from '../../auth/use-auth';
import { Skeleton } from '../../components/ui/skeleton';

import { StudentHomeView } from '../student/views/student-home-view';

export function UnifiedDashboardView() {
  const { currentRole, switchRole, activeRoles, isLoading } = useRole();
  const { currentOrganization } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const activeRoleName =
    activeRoles.find((r) => r.category === currentRole)?.name || currentRole;

  if (currentRole === 'student') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <StudentHomeView />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Context Banner shown when user switched into a specific role workspace */}
      {currentRole !== 'all' && (
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
      )}

      {/* Main Header */}
      <DashboardHeader />

      {/* Priority Action Items */}
      <AttentionSection />

      {/* Composable Multi-Role Overview Cards */}
      <RoleOverviewSection />

      {/* Numerical Operational Metrics */}
      <MetricsSection />

      {/* Live Operational Activity Log */}
      <ActivitySection />
    </div>
  );
}
