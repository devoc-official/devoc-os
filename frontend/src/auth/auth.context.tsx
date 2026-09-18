'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { apiClient } from '../api/client';
import { AuthContextType, UserIdentity, UserMembershipInfo } from './auth.types';

const TOKEN_KEY = 'devoc_access_token';
const ORG_KEY = 'devoc_active_org_id';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [memberships, setMemberships] = useState<UserMembershipInfo[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync token and org with apiClient
  useEffect(() => {
    apiClient.configure({
      getToken: () => token,
      getOrganizationId: () => activeOrgId,
    });
  }, [token, activeOrgId]);

  const activeOrganization = useMemo(() => {
    if (!memberships.length) return null;
    return memberships.find((m) => m.organizationId === activeOrgId) || memberships[0];
  }, [memberships, activeOrgId]);

  // Load initial token from storage
  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem(ORG_KEY) : null;

    if (savedToken) {
      apiClient.setToken(savedToken);
      setToken(savedToken);
      if (savedOrgId) {
        apiClient.setTenantId(savedOrgId);
        setActiveOrgId(savedOrgId);
      }
      authApi
        .me(savedToken)
        .then((res) => {
          setUser(res.user);
          setMemberships(res.memberships);
          if (!savedOrgId && res.memberships.length > 0) {
            const firstOrg = res.memberships[0].organizationId;
            apiClient.setTenantId(firstOrg);
            setActiveOrgId(firstOrg);
            if (typeof window !== 'undefined') {
              localStorage.setItem(ORG_KEY, firstOrg);
            }
          }
        })
        .catch(() => {
          // Token invalid or expired
          apiClient.setToken(null);
          apiClient.setTenantId(null);
          setToken(null);
          setUser(null);
          setMemberships([]);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(ORG_KEY);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (credentialsOrEmail: { email: string; password: string } | string, maybePassword?: string) => {
      setIsLoading(true);
      try {
        const credentials =
          typeof credentialsOrEmail === 'string'
            ? { email: credentialsOrEmail, password: maybePassword || '' }
            : credentialsOrEmail;

        const res = await authApi.login(credentials);
        apiClient.setToken(res.accessToken);
        setToken(res.accessToken);
        setUser(res.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
        }

        // Fetch memberships passing the fresh accessToken explicitly
        const meRes = await authApi.me(res.accessToken);
        setMemberships(meRes.memberships);

        if (meRes.memberships.length > 0) {
          const initialOrg = meRes.memberships[0].organizationId;
          apiClient.setTenantId(initialOrg);
          setActiveOrgId(initialOrg);
          if (typeof window !== 'undefined') {
            localStorage.setItem(ORG_KEY, initialOrg);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout().catch(() => {});
      }
    } finally {
      apiClient.setToken(null);
      apiClient.setTenantId(null);
      setToken(null);
      setUser(null);
      setMemberships([]);
      setActiveOrgId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ORG_KEY);
      }
    }
  }, [token]);

  const switchOrganization = useCallback((orgId: string) => {
    apiClient.setTenantId(orgId);
    setActiveOrgId(orgId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ORG_KEY, orgId);
    }
  }, []);

  const contextValue: AuthContextType = useMemo(
    () => ({
      token,
      user,
      person: user ? { id: user.id } : null,
      memberships,
      activeOrganization,
      currentOrganization: activeOrganization,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      switchOrganization,
    }),
    [token, user, memberships, activeOrganization, isLoading, login, logout, switchOrganization]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
