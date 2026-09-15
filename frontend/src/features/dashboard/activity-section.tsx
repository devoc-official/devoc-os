import React from 'react';
import { ActivityFeed, ActivityItem } from '../../components/data/activity-feed';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

export function ActivitySection() {
  const foundationActivities: ActivityItem[] = [
    {
      id: 'act-1',
      actorName: 'DeVoc System',
      action: 'verified work log entry for',
      target: 'Milestone F1.2 Frontend Foundation',
      timestamp: '15 minutes ago',
      detail: 'Assigned to Engineering BU with outcome delivered.',
    },
    {
      id: 'act-2',
      actorName: 'Sarah Jenkins',
      action: 'completed evaluation for',
      target: 'Backend Multi-Tenancy Review',
      timestamp: '2 hours ago',
      detail: 'Status approved with commendation for zero-bypass tenant isolation.',
    },
    {
      id: 'act-3',
      actorName: 'Alex Chen',
      action: 'submitted milestone deliverable',
      target: 'PostgreSQL Relational Schema & Indices',
      timestamp: '5 hours ago',
      detail: 'Submitted to review queue for mentor review.',
    },
    {
      id: 'act-4',
      actorName: 'DeVoc Finance',
      action: 'recorded payment schedule entry for',
      target: 'Academy Batch 2026',
      timestamp: 'Yesterday at 4:30 PM',
      detail: 'Append-oriented auditable financial entry.',
    },
  ];

  return (
    <section aria-labelledby="activity-section-heading" className="space-y-3">
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm" id="activity-section-heading">
              Recent Organizational Activity
            </CardTitle>
            <span className="text-[11px] font-mono text-devoc-text-tertiary">
              Append-Oriented Audit Feed
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <ActivityFeed items={foundationActivities} />
        </CardContent>
      </Card>
    </section>
  );
}
