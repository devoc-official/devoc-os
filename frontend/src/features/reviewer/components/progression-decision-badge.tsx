'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, RotateCcw, HelpCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { ProgressionDecision } from '../types/reviewer.types';

interface ProgressionDecisionBadgeProps {
  decision?: ProgressionDecision | string | null;
  className?: string;
}

export function ProgressionDecisionBadge({ decision, className = '' }: ProgressionDecisionBadgeProps) {
  if (!decision) {
    return (
      <Badge variant="outline" size="sm" className={`text-devoc-text-tertiary text-[10px] ${className}`}>
        <HelpCircle className="h-3 w-3 mr-1" /> Pending
      </Badge>
    );
  }

  const normalized = decision.toLowerCase();

  switch (normalized) {
    case 'advance':
      return (
        <Badge variant="brand" size="sm" className={`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-medium ${className}`}>
          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> Advance
        </Badge>
      );
    case 'continue':
      return (
        <Badge variant="outline" size="sm" className={`bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-medium ${className}`}>
          <ArrowRight className="h-3 w-3 mr-1 text-blue-500" /> Continue
        </Badge>
      );
    case 'improve':
      return (
        <Badge variant="outline" size="sm" className={`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium ${className}`}>
          <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" /> Improve
        </Badge>
      );
    case 'repeat':
      return (
        <Badge variant="outline" size="sm" className={`bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-medium ${className}`}>
          <RotateCcw className="h-3 w-3 mr-1 text-rose-500" /> Repeat
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" size="sm" className={`capitalize text-[10px] ${className}`}>
          {decision}
        </Badge>
      );
  }
}
