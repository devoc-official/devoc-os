import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RoleCategory } from '../../roles/roles.types';

export interface RoleSummaryMetric {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface RoleOverviewCardProps {
  role: RoleCategory;
  title: string;
  description: string;
  icon: LucideIcon;
  isPrimary?: boolean;
  metrics: RoleSummaryMetric[];
  nextAction?: {
    label: string;
    description?: string;
  };
  onEnterWorkspace: (role: RoleCategory) => void;
  className?: string;
}

export function RoleOverviewCard({
  role,
  title,
  description,
  icon: Icon,
  isPrimary,
  metrics,
  nextAction,
  onEnterWorkspace,
  className,
}: RoleOverviewCardProps) {
  return (
    <Card className={cn('flex flex-col justify-between hover:border-devoc-border-strong transition-colors', className)}>
      <div>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-devoc-surface-secondary text-devoc-text-primary border border-devoc-border">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{title}</CardTitle>
                  {isPrimary && (
                    <Badge variant="brand" size="sm">
                      Primary
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-[11px] mt-0.5 line-clamp-1">
                  {description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-3">
          {/* Key metrics grid */}
          <div className="grid grid-cols-3 gap-2 border-y border-devoc-border/60 py-2.5 my-1">
            {metrics.map((m, idx) => (
              <div key={idx} className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-devoc-text-secondary font-medium truncate">
                  {m.label}
                </p>
                <p
                  className={cn(
                    'text-sm font-semibold tabular-nums mt-0.5',
                    m.highlight ? 'text-devoc-brand' : 'text-devoc-text-primary'
                  )}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {/* Next activity preview if available */}
          {nextAction && (
            <div className="bg-devoc-surface-secondary/70 rounded-sm p-2.5 border border-devoc-border text-xs">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-devoc-text-tertiary block mb-0.5">
                Next Action
              </span>
              <p className="font-medium text-devoc-text-primary truncate">{nextAction.label}</p>
              {nextAction.description && (
                <p className="text-[11px] text-devoc-text-secondary truncate mt-0.5">
                  {nextAction.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </div>

      <div className="p-4 pt-0">
        <Button
          size="sm"
          variant="secondary"
          className="w-full justify-between group text-xs h-8"
          onClick={() => onEnterWorkspace(role)}
        >
          <span>Enter {title} Workspace</span>
          <ArrowRight className="h-3.5 w-3.5 text-devoc-text-tertiary transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </Card>
  );
}
