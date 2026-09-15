import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    isPositive?: boolean;
  };
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  trend,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-devoc-text-secondary uppercase tracking-wider">
            {label}
          </span>
          {Icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-devoc-surface-secondary text-devoc-text-tertiary border border-devoc-border">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-semibold tracking-tight text-devoc-text-primary tabular-nums">
            {value}
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center text-xs font-medium tabular-nums',
                trend.isPositive === true
                  ? 'text-devoc-status-success-text'
                  : trend.isPositive === false
                  ? 'text-devoc-status-error-text'
                  : 'text-devoc-text-tertiary'
              )}
            >
              {trend.direction === 'up' && <TrendingUp className="mr-0.5 h-3 w-3" />}
              {trend.direction === 'down' && <TrendingDown className="mr-0.5 h-3 w-3" />}
              {trend.direction === 'neutral' && <Minus className="mr-0.5 h-3 w-3" />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        {subtext && (
          <p className="mt-1 text-[11px] text-devoc-text-tertiary leading-normal">
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
