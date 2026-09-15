import React from 'react';
import { Layers, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface ContextBannerProps {
  roleName: string;
  scopeName?: string;
  onResetToUnified: () => void;
  className?: string;
}

export function ContextBanner({
  roleName,
  scopeName,
  onResetToUnified,
  className,
}: ContextBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border border-devoc-border bg-devoc-surface-secondary px-3.5 py-2 text-xs text-devoc-text-primary mb-6',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-devoc-brand shrink-0" />
        <div>
          <span>Filtered to </span>
          <span className="font-semibold text-devoc-text-primary">{roleName} Workspace</span>
          {scopeName && (
            <span className="text-devoc-text-secondary"> (Context: {scopeName})</span>
          )}
          <span className="text-devoc-text-tertiary ml-2 hidden sm:inline">
            — Operational perspective active; permissions unchanged.
          </span>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs gap-1 text-devoc-text-secondary hover:text-devoc-text-primary"
        leftIcon={<RotateCcw className="h-3 w-3" />}
        onClick={onResetToUnified}
      >
        Return to Unified
      </Button>
    </div>
  );
}
