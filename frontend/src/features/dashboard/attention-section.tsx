import React from 'react';
import { useRole } from '../../roles/role.context';
import { AttentionItem, AttentionItemProps } from '../../components/devoc/attention-item';

export function AttentionSection() {
  const { currentRole, activeRoles } = useRole();

  // Foundation action items synthesized across active roles
  const allItems: (AttentionItemProps & { targetRole: string })[] = [
    {
      id: 'att-1',
      title: 'Weekly Attendance & Timesheet Verification',
      roleContext: 'Role: Employee • Period: Current Week',
      urgency: 'medium',
      dueText: 'Due today at 6:00 PM',
      targetRole: 'employee',
    },
    {
      id: 'att-2',
      title: 'Roadmap Milestone Deliverable Review',
      roleContext: 'Role: Mentor • Mentee: Alex Chen',
      urgency: 'high',
      dueText: 'Due today at 5:00 PM',
      targetRole: 'mentor',
    },
    {
      id: 'att-3',
      title: 'Architecture Review for Distributed Outbox',
      roleContext: 'Role: Developer • Project: DeVoc OS Core',
      urgency: 'high',
      dueText: 'Action needed',
      targetRole: 'developer',
    },
    {
      id: 'att-4',
      title: 'Quarterly Placement KPI Review',
      roleContext: 'Role: Founder • BU: DeVoc Academy',
      urgency: 'low',
      dueText: 'Due Friday',
      targetRole: 'founder',
    },
    {
      id: 'att-5',
      title: 'Milestone Assessment PR Review',
      roleContext: 'Role: Reviewer • PR #104',
      urgency: 'high',
      dueText: 'Action needed',
      targetRole: 'reviewer',
    },
  ];

  // Filter if scoped to a specific role workspace, otherwise show items matching any active role
  const filteredItems = allItems.filter((item) => {
    if (currentRole === 'all') {
      return activeRoles.some((r) => r.category === item.targetRole);
    }
    return item.targetRole === currentRole;
  });

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="attention-section-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="attention-section-heading" className="text-sm font-semibold text-devoc-text-primary">
          Requires Your Attention ({filteredItems.length})
        </h2>
        <span className="text-xs text-devoc-text-tertiary">Synthesized action items</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <AttentionItem
            key={item.id}
            id={item.id}
            title={item.title}
            roleContext={item.roleContext}
            urgency={item.urgency}
            dueText={item.dueText}
            onClick={() => {
              console.log('Action selected:', item.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}
