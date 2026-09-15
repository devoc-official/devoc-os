import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export interface FoundationPlaceholderProps {
  moduleName: string;
  milestoneTarget: string;
  description: string;
  backendEngines: string[];
}

export function FoundationPlaceholder({
  moduleName,
  milestoneTarget,
  description,
  backendEngines,
}: FoundationPlaceholderProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Back to Dashboard
        </Button>
      </Link>

      <Card className="border-dashed border-devoc-border-strong">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-devoc-surface-secondary text-devoc-text-primary border border-devoc-border">
                <Compass className="h-4 w-4 text-devoc-brand" />
              </div>
              <CardTitle className="text-base">{moduleName}</CardTitle>
            </div>
            <Badge variant="brand" size="sm">
              Target: {milestoneTarget}
            </Badge>
          </div>
          <CardDescription className="mt-2 text-xs leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="rounded-sm bg-devoc-surface-secondary/70 p-3 border border-devoc-border text-xs space-y-1.5">
            <p className="font-semibold text-devoc-text-primary">
              What is established in F1.2:
            </p>
            <p className="text-devoc-text-secondary">
              The frontend navigation architecture, role perspective routing, and tenant headers are active. The full operational screen for {moduleName} will be implemented in {milestoneTarget}.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-devoc-text-tertiary">
              Connected Backend Engines:
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {backendEngines.map((engine) => (
                <Badge key={engine} variant="neutral" size="sm">
                  {engine}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
