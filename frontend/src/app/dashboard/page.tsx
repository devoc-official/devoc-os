'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/use-auth';
import { AppShell } from '../../layouts/app-shell';
import { UnifiedDashboardView } from '../../features/dashboard/unified-dashboard-view';
import { Skeleton } from '../../components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-devoc-bg p-4">
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="h-10 w-10 rounded-sm" />
          <p className="text-xs font-mono text-devoc-text-tertiary">Authenticating workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <UnifiedDashboardView />
    </AppShell>
  );
}
