import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TimelineStep {
  id: string;
  title: string;
  description?: string;
  date?: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="relative flex items-start gap-3">
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-2.5 top-5 -ml-px w-0.5 h-full',
                    step.status === 'completed' ? 'bg-devoc-brand' : 'bg-devoc-border'
                  )}
                  aria-hidden="true"
                />
              )}

              <div className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-devoc-surface">
                {step.status === 'completed' && (
                  <CheckCircle2 className="h-4 w-4 text-devoc-brand" />
                )}
                {step.status === 'current' && (
                  <Clock className="h-4 w-4 text-devoc-status-warning-text" />
                )}
                {step.status === 'upcoming' && (
                  <Circle className="h-3.5 w-3.5 text-devoc-text-disabled" />
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      'font-medium',
                      step.status === 'current'
                        ? 'text-devoc-text-primary font-semibold'
                        : 'text-devoc-text-secondary'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.date && (
                    <span className="text-[11px] text-devoc-text-tertiary">{step.date}</span>
                  )}
                </div>
                {step.description && (
                  <p className="mt-0.5 text-[11px] text-devoc-text-tertiary">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
