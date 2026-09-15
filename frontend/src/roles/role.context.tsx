'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/use-auth';
import { peopleApi } from '../api/people.api';
import { ActiveRoleInfo, RoleCategory, RoleContextType } from './roles.types';
import { resolveRolesFromBackend } from './role-resolver';

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, activeOrganization } = useAuth();
  const [currentRole, setCurrentRole] = useState<RoleCategory | 'all'>('all');

  const orgId = activeOrganization?.organizationId;

  // Query Person for current user in active org
  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['people', orgId, 'for-user', user?.id],
    queryFn: async () => {
      if (!orgId || !user) return [];
      const list = await peopleApi.listPeople(orgId);
      return list.filter((p) => p.userId === user.id || p.email.toLowerCase() === user.email.toLowerCase());
    },
    enabled: Boolean(orgId && user),
  });

  const currentPerson = people[0] || null;

  // Query Person Roles
  const { data: personRoles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['people', orgId, currentPerson?.id, 'roles'],
    queryFn: async () => {
      if (!orgId || !currentPerson) return [];
      return peopleApi.listPersonRoles(orgId, currentPerson.id);
    },
    enabled: Boolean(orgId && currentPerson),
  });

  const activeRoles = useMemo<ActiveRoleInfo[]>(() => {
    return resolveRolesFromBackend(personRoles, activeOrganization);
  }, [personRoles, activeOrganization]);

  const switchRole = useCallback((role: RoleCategory | 'all') => {
    setCurrentRole(role);
  }, []);

  const getRoleDetails = useCallback(
    (category: RoleCategory): ActiveRoleInfo | undefined => {
      return activeRoles.find((r) => r.category === category);
    },
    [activeRoles]
  );

  const contextValue: RoleContextType = useMemo(
    () => ({
      activeRoles,
      currentRole,
      isMultiRole: activeRoles.length > 1,
      isLoading: isPeopleLoading || isRolesLoading,
      switchRole,
      getRoleDetails,
    }),
    [activeRoles, currentRole, isPeopleLoading, isRolesLoading, switchRole, getRoleDetails]
  );

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
