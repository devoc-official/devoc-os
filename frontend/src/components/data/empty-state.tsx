import React from 'react';
import { Inbox, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-md border border-dashed border-devoc-border bg-devoc-surface-secondary/40 p-8 text-center',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-devoc-surface-secondary text-devoc-text-tertiary border border-devoc-border">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-devoc-text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-devoc-text-secondary leading-normal">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-5 flex items-center gap-2">
          {actionLabel && onAction && (
            <Button size="sm" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button size="sm" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
