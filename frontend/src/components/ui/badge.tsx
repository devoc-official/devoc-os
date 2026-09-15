import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'error' | 'brand' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-devoc-surface-secondary text-devoc-text-primary border-devoc-border',
    neutral: 'bg-devoc-surface-tertiary text-devoc-text-secondary border-devoc-border',
    success: 'bg-devoc-status-success-bg text-devoc-status-success-text border-devoc-status-success-border',
    warning: 'bg-devoc-status-warning-bg text-devoc-status-warning-text border-devoc-status-warning-border',
    error: 'bg-devoc-status-error-bg text-devoc-status-error-text border-devoc-status-error-border',
    brand: 'bg-devoc-brand-subtle text-devoc-brand border-devoc-border',
    outline: 'bg-transparent text-devoc-text-secondary border-devoc-border',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5 font-medium',
    md: 'text-xs px-2 py-0.5 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs border font-mono tracking-tight',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
