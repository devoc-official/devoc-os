'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { AuthProvider } from '../auth/auth.context';
import { RoleProvider } from '../roles/role.context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>{children}</RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
