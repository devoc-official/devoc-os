import React from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../auth/use-auth';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { UserMembershipInfo } from '../api/auth.api';

export function ContextSwitcher() {
  const { activeOrganization, memberships, switchOrganization } = useAuth();

  const organizations: UserMembershipInfo[] = memberships || [];

  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-sm bg-devoc-surface border border-devoc-border text-xs">
        <Building2 className="h-3.5 w-3.5 text-devoc-brand shrink-0" />
        <span className="font-semibold text-devoc-text-primary truncate max-w-[130px]">
          {activeOrganization?.organizationName || 'DeVoc Primary'}
        </span>
      </div>
    );
  }

  const menuItems: DropdownMenuItem[] = organizations.map((org) => ({
    id: org.organizationId,
    label: (
      <div className="flex items-center justify-between w-full pr-1">
        <span className="font-medium truncate">{org.organizationName}</span>
        {activeOrganization?.organizationId === org.organizationId && (
          <Check className="h-3.5 w-3.5 text-devoc-brand shrink-0 ml-2" />
        )}
      </div>
    ),
    onClick: () => switchOrganization(org.organizationId),
  }));

  return (
    <DropdownMenu
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal border-devoc-border bg-devoc-surface hover:bg-devoc-surface-secondary"
          aria-label={`Current tenant organization: ${activeOrganization?.organizationName || 'DeVoc'}. Click to switch.`}
        >
          <Building2 className="h-3.5 w-3.5 text-devoc-brand shrink-0" />
          <span className="font-semibold text-devoc-text-primary truncate max-w-[120px]">
            {activeOrganization?.organizationName || 'DeVoc Primary'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-devoc-text-tertiary ml-0.5" />
        </Button>
      }
      items={menuItems}
      align="left"
      className="w-56"
    />
  );
}
