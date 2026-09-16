import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Dialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  title,
  description,
  children,
  className,
  maxWidth = 'md',
}: DialogProps) {
  const isVisible = open ?? isOpen ?? false;
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };
    if (isVisible) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-none transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog Body */}
      <div
        ref={dialogRef}
        className={cn(
          'relative z-50 w-full rounded-lg border border-devoc-border bg-devoc-surface p-6 shadow-modal dark:shadow-modal-dark transition-all',
          maxWidths[maxWidth],
          className
        )}
      >
        {(title || description) ? (
          <div className="flex items-start justify-between pb-4 border-b border-devoc-border">
            <div>
              {title && (
                <h2 id="dialog-title" className="text-base font-semibold text-devoc-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-description" className="mt-1 text-xs text-devoc-text-secondary">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-sm p-1 text-devoc-text-tertiary hover:bg-devoc-surface-secondary hover:text-devoc-text-primary focus:outline-none focus:ring-2 focus:ring-devoc-brand-ring"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 rounded-sm p-1 text-devoc-text-tertiary hover:bg-devoc-surface-secondary hover:text-devoc-text-primary focus:outline-none focus:ring-2 focus:ring-devoc-brand-ring z-10"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className={title || description ? 'mt-4' : ''}>{children}</div>
      </div>
    </div>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 pb-3 border-b border-devoc-border', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-base font-semibold text-devoc-text-primary', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-devoc-text-secondary', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function DialogFooter({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-devoc-border',
        className
      )}
    >
      {children}
    </div>
  );
}

