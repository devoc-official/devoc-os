'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/use-auth';
import { Skeleton } from '../components/ui/skeleton';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-devoc-bg p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-devoc-brand text-white font-mono font-bold text-sm">
          DV
        </div>
        <p className="text-xs font-mono text-devoc-text-tertiary">Resolving session...</p>
      </div>
    </div>
  );
}
