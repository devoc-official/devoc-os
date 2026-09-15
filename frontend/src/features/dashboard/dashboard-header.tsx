import React from 'react';
import { useAuth } from '../../auth/use-auth';
import { useRole } from '../../roles/role.context';
import { Badge } from '../../components/ui/badge';

export function DashboardHeader() {
  const { user } = useAuth();
  const { activeRoles, currentRole } = useRole();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-devoc-border">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            {getGreeting()}, {user?.fullName?.split(' ')[0] || 'Member'}
          </h1>
          <Badge variant="neutral" size="sm">
            {activeRoles.length} Active {activeRoles.length === 1 ? 'Role' : 'Roles'}
          </Badge>
        </div>
        <p className="text-xs text-devoc-text-secondary mt-1">
          {currentRole === 'all'
            ? 'Unified overview across your organizational assignments, learning milestones, and deliverables.'
            : `Operational workspace perspective for ${activeRoles.find((r) => r.category === currentRole)?.name || currentRole}.`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-mono text-devoc-text-tertiary uppercase mr-1">
          Active roles:
        </span>
        {activeRoles.map((role) => (
          <Badge
            key={role.category}
            variant={role.isPrimary ? 'brand' : 'default'}
            size="sm"
            className="capitalize"
          >
            {role.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
