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
import { MentorDashboardView } from '../mentor/views/mentor-dashboard-view';
import { ReviewerDashboardView } from '../reviewer/views/reviewer-dashboard-view';
import { EmployeeDashboardView } from '../employee/views/employee-dashboard-view';
import { DeveloperDashboardView } from '../developer/views/developer-dashboard-view';
import { PMDashboardView } from '../pm/views/pm-dashboard-view';
import { FounderDashboardView } from '../founder/views/founder-dashboard-view';
import { AcademyHeadDashboardView } from '../academy-head/views/academy-head-dashboard-view';
import { AdminDashboardView } from '../admin/views/admin-dashboard-view';

export function UnifiedDashboardView() {
  const { currentRole, switchRole, activeRoles, isLoading } = useRole();
  const { currentOrganization } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
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

  if (currentRole === 'mentor') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <MentorDashboardView />
      </div>
    );
  }

  if (currentRole === 'reviewer') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <ReviewerDashboardView />
      </div>
    );
  }

  if (currentRole === 'employee') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <EmployeeDashboardView />
      </div>
    );
  }

  if (currentRole === 'developer') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <DeveloperDashboardView />
      </div>
    );
  }

  if (currentRole === 'project_manager') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <PMDashboardView />
      </div>
    );
  }

  if (currentRole === 'founder') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <FounderDashboardView />
      </div>
    );
  }

  if (currentRole === 'academy_head') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <AcademyHeadDashboardView />
      </div>
    );
  }

  if (currentRole === 'admin') {
    return (
      <div className="space-y-6">
        <ContextBanner
          roleName={activeRoleName}
          scopeName={currentOrganization?.organizationName}
          onResetToUnified={() => switchRole('all')}
        />
        <AdminDashboardView />
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
