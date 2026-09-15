import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-devoc-brand-ring disabled:pointer-events-none disabled:opacity-50 select-none';

    const variants = {
      primary:
        'bg-devoc-brand text-white hover:bg-devoc-brand-hover shadow-sm active:translate-y-px',
      secondary:
        'bg-devoc-surface-secondary text-devoc-text-primary hover:bg-devoc-surface-tertiary border border-devoc-border',
      outline:
        'border border-devoc-border bg-transparent text-devoc-text-primary hover:bg-devoc-surface-secondary hover:border-devoc-border-strong',
      ghost:
        'bg-transparent text-devoc-text-secondary hover:text-devoc-text-primary hover:bg-devoc-surface-secondary',
      danger:
        'bg-devoc-status-error-bg text-devoc-status-error-text border border-devoc-status-error-border hover:opacity-90',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-sm gap-1.5',
      md: 'h-9 px-4 text-sm rounded-md gap-2',
      lg: 'h-10 px-5 text-base rounded-md gap-2.5',
      icon: 'h-9 w-9 p-0 rounded-md',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
