'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../../auth/use-auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert } from '../../components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('founder@devoc.io');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillPreset = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
  };

  return (
    <div className="flex min-h-screen flex-col justify-center items-center bg-devoc-bg p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-devoc-brand text-white font-mono font-bold text-base shadow-sm">
            DV
          </div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            DeVoc OS
          </h1>
          <p className="text-xs text-devoc-text-secondary max-w-sm">
            Enterprise Operating System for People, Learning, Evaluation, Work, Finance & Analytics.
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-dropdown">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your corporate credentials to access your authorized workspaces.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-0">
              {error && (
                <Alert variant="error" onDismiss={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Input
                label="Corporate Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@devoc.io"
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </CardContent>

            <CardFooter className="flex-col space-y-3 pt-0">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Credentials Quick Switcher */}
        <div className="rounded-md border border-devoc-border bg-devoc-surface p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-devoc-text-secondary">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Demo Role Profiles
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-devoc-brand" />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => fillPreset('founder@devoc.io')}
              className="px-2 py-1 text-[11px] font-medium rounded-xs border border-devoc-border bg-devoc-surface-secondary hover:bg-devoc-surface-tertiary transition-colors text-devoc-text-primary text-center truncate"
            >
              Founder
            </button>
            <button
              type="button"
              onClick={() => fillPreset('mentor@devoc.io')}
              className="px-2 py-1 text-[11px] font-medium rounded-xs border border-devoc-border bg-devoc-surface-secondary hover:bg-devoc-surface-tertiary transition-colors text-devoc-text-primary text-center truncate"
            >
              Mentor
            </button>
            <button
              type="button"
              onClick={() => fillPreset('student@devoc.io')}
              className="px-2 py-1 text-[11px] font-medium rounded-xs border border-devoc-border bg-devoc-surface-secondary hover:bg-devoc-surface-tertiary transition-colors text-devoc-text-primary text-center truncate"
            >
              Student
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-devoc-text-tertiary font-mono">
          Tenant Isolation Enforced • Multi-Tenant by Design
        </p>
      </div>
    </div>
  );
}
