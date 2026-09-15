import React from 'react';
import { Check, ChevronDown, Layers, Sparkles } from 'lucide-react';
import { useRole } from '../roles/role.context';
import { RoleCategory } from '../roles/roles.types';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export function RoleSwitcher() {
  const { activeRoles, currentRole, switchRole, isMultiRole } = useRole();

  if (!isMultiRole && activeRoles.length <= 1) {
    // Single role user
    const singleRole = activeRoles[0];
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-devoc-surface-secondary border border-devoc-border text-xs">
        <span className="text-[11px] text-devoc-text-secondary uppercase font-mono font-medium">
          Role:
        </span>
        <span className="font-semibold text-devoc-text-primary">
          {singleRole ? singleRole.name : 'Standard'}
        </span>
      </div>
    );
  }

  const currentRoleLabel =
    currentRole === 'all'
      ? 'Unified View'
      : activeRoles.find((r) => r.category === currentRole)?.name || currentRole;

  const menuItems: DropdownMenuItem[] = [
    {
      id: 'unified-view',
      label: (
        <div className="flex items-center justify-between w-full pr-1">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-devoc-brand" />
            <span className="font-medium">Unified View (All Roles)</span>
          </div>
          {currentRole === 'all' && <Check className="h-3.5 w-3.5 text-devoc-brand" />}
        </div>
      ),
      onClick: () => switchRole('all'),
    },
    {
      id: 'divider-1',
      label: '',
      divider: true,
    },
    ...activeRoles.map((role) => ({
      id: `role-${role.category}`,
      label: (
        <div className="flex items-center justify-between w-full pr-1">
          <div className="flex flex-col">
            <span className="font-medium">{role.name}</span>
            <span className="text-[10px] text-devoc-text-tertiary">{role.description}</span>
          </div>
          {currentRole === role.category && (
            <Check className="h-3.5 w-3.5 text-devoc-brand shrink-0 ml-2" />
          )}
        </div>
      ),
      onClick: () => switchRole(role.category),
    })),
  ];

  return (
    <DropdownMenu
      trigger={
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal border-devoc-border hover:border-devoc-border-strong"
          aria-label={`Current role perspective: ${currentRoleLabel}. Click to switch role perspective.`}
        >
          <span className="text-[11px] text-devoc-text-secondary font-mono">Role:</span>
          <span className="font-semibold text-devoc-text-primary">{currentRoleLabel}</span>
          <Badge variant={currentRole === 'all' ? 'brand' : 'neutral'} size="sm" className="ml-1 text-[10px]">
            {currentRole === 'all' ? 'Multi' : 'Scope'}
          </Badge>
          <ChevronDown className="h-3.5 w-3.5 text-devoc-text-tertiary ml-0.5" />
        </Button>
      }
      items={menuItems}
      align="right"
      className="w-64"
    />
  );
}
