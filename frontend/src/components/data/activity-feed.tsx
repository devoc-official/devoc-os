import React from 'react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/avatar';

export interface ActivityItem {
  id: string;
  actorName: string;
  actorAvatar?: string;
  action: string;
  target: string;
  timestamp: string;
  detail?: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-devoc-text-tertiary">
        No recent activity recorded.
      </div>
    );
  }

  return (
    <div className={cn('flow-root', className)}>
      <ul className="-mb-6">
        {items.map((item, itemIdx) => {
          const isLast = itemIdx === items.length - 1;

          return (
            <li key={item.id}>
              <div className="relative pb-6">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-devoc-border"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <Avatar name={item.actorName} src={item.actorAvatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="text-xs">
                        <span className="font-semibold text-devoc-text-primary">
                          {item.actorName}
                        </span>{' '}
                        <span className="text-devoc-text-secondary">{item.action}</span>{' '}
                        <span className="font-medium text-devoc-text-primary">
                          {item.target}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-devoc-text-tertiary">
                        {item.timestamp}
                      </p>
                    </div>
                    {item.detail && (
                      <div className="mt-2 text-xs text-devoc-text-secondary bg-devoc-surface-secondary/60 rounded-sm p-2 border border-devoc-border">
                        {item.detail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
