import React from 'react';
import { AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

export interface AttentionItemProps {
  id: string;
  title: string;
  roleContext: string;
  urgency: 'high' | 'medium' | 'low';
  dueText?: string;
  actionUrl?: string;
  onClick?: () => void;
  className?: string;
}

export function AttentionItem({
  title,
  roleContext,
  urgency,
  dueText,
  onClick,
  className,
}: AttentionItemProps) {
  const urgencyVariants = {
    high: 'border-l-devoc-status-error-border',
    medium: 'border-l-devoc-status-warning-border',
    low: 'border-l-devoc-border-strong',
  };

  const badgeVariants = {
    high: 'error' as const,
    medium: 'warning' as const,
    low: 'neutral' as const,
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center justify-between rounded-sm border border-devoc-border bg-devoc-surface p-3 transition-colors',
        'border-l-4 hover:bg-devoc-surface-secondary/50',
        urgencyVariants[urgency],
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-devoc-text-primary truncate">
              {title}
            </span>
            <Badge variant={badgeVariants[urgency]} size="sm">
              {urgency.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-devoc-text-secondary">
            <span className="font-medium text-devoc-text-primary/80">{roleContext}</span>
            {dueText && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-devoc-text-tertiary">
                  <Clock className="h-3 w-3" />
                  {dueText}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-devoc-text-tertiary transition-transform group-hover:translate-x-0.5 shrink-0" />
    </div>
  );
}
