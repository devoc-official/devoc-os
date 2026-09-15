import { useMemo, useCallback } from 'react';
import { useAuth } from '../auth/use-auth';
import { Capability, ROLE_CAPABILITY_MAP } from './permissions.types';

export function usePermissions() {
  const auth = useAuth();
  const user = auth?.user;
  const activeOrg = auth?.activeOrganization;

  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const isOrgAdmin = activeOrg?.role === 'org_admin';

  const capabilities = useMemo<Set<Capability>>(() => {
    if (isPlatformAdmin) {
      // Platform admin has all capabilities
      return new Set(ROLE_CAPABILITY_MAP.org_admin);
    }
    if (!activeOrg || !activeOrg.role) {
      return new Set();
    }
    const roleKey = activeOrg.role as 'org_admin' | 'org_member';
    const roleCaps = ROLE_CAPABILITY_MAP[roleKey] || [];
    return new Set(roleCaps);
  }, [isPlatformAdmin, activeOrg]);

  const can = useCallback(
    (capability?: Capability | null): boolean => {
      if (!capability) return true;
      if (isPlatformAdmin) return true;
      return capabilities.has(capability);
    },
    [isPlatformAdmin, capabilities]
  );

  return {
    can,
    hasCapability: can,
    isPlatformAdmin,
    isOrgAdmin,
    capabilities,
  };
}
