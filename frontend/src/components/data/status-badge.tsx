import React from 'react';
import { Badge, BadgeProps } from '../ui/badge';

export type EntityStatus =
  | 'active'
  | 'completed'
  | 'paused'
  | 'scheduled'
  | 'cancelled'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_review'
  | 'draft'
  | 'archived';

export interface StatusBadgeProps {
  status: EntityStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');

  let variant: BadgeProps['variant'] = 'neutral';

  switch (normalized) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'passed':
      variant = 'success';
      break;
    case 'pending':
    case 'scheduled':
    case 'in_review':
    case 'draft':
      variant = 'warning';
      break;
    case 'rejected':
    case 'cancelled':
    case 'failed':
      variant = 'error';
      break;
    case 'paused':
    case 'archived':
      variant = 'neutral';
      break;
    default:
      variant = 'outline';
      break;
  }

  const formatLabel = (str?: string) => {
    return (str || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <Badge variant={variant} size={size} className={className}>
      {formatLabel(status)}
    </Badge>
  );
}
