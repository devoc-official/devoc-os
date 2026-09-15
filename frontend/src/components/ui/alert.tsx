import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  onDismiss?: () => void;
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  onDismiss,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="h-4 w-4 text-devoc-status-info-text shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-devoc-status-warning-text shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-devoc-status-error-text shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-devoc-status-success-text shrink-0" />,
  };

  const variants = {
    info: 'bg-devoc-status-info-bg border-devoc-status-info-border text-devoc-status-info-text',
    warning: 'bg-devoc-status-warning-bg border-devoc-status-warning-border text-devoc-status-warning-text',
    error: 'bg-devoc-status-error-bg border-devoc-status-error-border text-devoc-status-error-text',
    success: 'bg-devoc-status-success-bg border-devoc-status-success-border text-devoc-status-success-text',
  };

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'relative flex items-start gap-3 rounded-md border p-3 text-xs leading-relaxed transition-all',
        variants[variant],
        className
      )}
      {...props}
    >
      <div className="mt-0.5">{icons[variant]}</div>
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div className="opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xs p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-devoc-brand-ring"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
