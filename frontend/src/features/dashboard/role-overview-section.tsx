import React from 'react';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Briefcase,
  Code2,
  Building2,
  FolderGit2,
  Sliders,
  LucideIcon,
} from 'lucide-react';
import { useRole } from '../../roles/role.context';
import { RoleOverviewCard } from '../../components/devoc/role-overview-card';
import { RoleCategory } from '../../roles/roles.types';

const ROLE_ICON_MAP: Record<RoleCategory, LucideIcon> = {
  student: GraduationCap,
  mentor: Users,
  reviewer: CheckCircle2,
  employee: Briefcase,
  developer: Code2,
  founder: Building2,
  academy_head: GraduationCap,
  project_manager: FolderGit2,
  admin: Sliders,
};

// Default foundation metrics by role (grounded in real domain capabilities)
const ROLE_METRICS_MAP: Record<
  RoleCategory,
  {
    metrics: { label: string; value: string | number; highlight?: boolean }[];
    nextAction: { label: string; description: string };
  }
> = {
  student: {
    metrics: [
      { label: 'Progress', value: '68%', highlight: true },
      { label: 'Milestones', value: '5/8' },
      { label: 'Upcoming', value: '1 Review' },
    ],
    nextAction: {
      label: 'Submit Milestone Deliverable',
      description: 'System Architecture & ERD review due in 2 days',
    },
  },
  mentor: {
    metrics: [
      { label: 'Mentees', value: '4' },
      { label: 'Needs Review', value: '2', highlight: true },
      { label: 'Hours', value: '6h/wk' },
    ],
    nextAction: {
      label: 'Conduct Milestone Review',
      description: 'Review roadmap progress for Student John Doe',
    },
  },
  reviewer: {
    metrics: [
      { label: 'Queue', value: '3 Pending', highlight: true },
      { label: 'Approved', value: '14' },
      { label: 'Avg Rating', value: '4.8' },
    ],
    nextAction: {
      label: 'Assess Evaluation Submission',
      description: 'PR review and competency evaluation for Project Titan',
    },
  },
  developer: {
    metrics: [
      { label: 'Open Tasks', value: '4' },
      { label: 'Hours Logged', value: '32.5h' },
      { label: 'PRs Active', value: '2', highlight: true },
    ],
    nextAction: {
      label: 'Implement Tenant Interceptor',
      description: 'Task #DEV-104 assigned in Project Athena',
    },
  },
  employee: {
    metrics: [
      { label: 'Timesheet', value: 'Submitted' },
      { label: 'Work Logs', value: '8 entries' },
      { label: 'Leave Bal', value: '14 days' },
    ],
    nextAction: {
      label: 'Submit Weekly Work Log',
      description: 'Summarize engineering deliverables and BU contribution',
    },
  },
  founder: {
    metrics: [
      { label: 'Active BUs', value: '3' },
      { label: 'Headcount', value: '28' },
      { label: 'Placement', value: '94%', highlight: true },
    ],
    nextAction: {
      label: 'Executive Strategy Review',
      description: 'Review quarterly KPIs and talent allocation across BUs',
    },
  },
  academy_head: {
    metrics: [
      { label: 'Programs', value: '3 Active' },
      { label: 'Enrollment', value: '42' },
      { label: 'Completion', value: '88%', highlight: true },
    ],
    nextAction: {
      label: 'Curriculum Roadmap Audit',
      description: 'Approve updated milestone sequencing for Batch 4',
    },
  },
  project_manager: {
    metrics: [
      { label: 'Projects', value: '2 Active' },
      { label: 'Sprint Tasks', value: '18' },
      { label: 'Blockers', value: '1', highlight: true },
    ],
    nextAction: {
      label: 'Sprint Backlog Grooming',
      description: 'Resolve dependency bottleneck on Task #ENG-42',
    },
  },
  admin: {
    metrics: [
      { label: 'Tenants', value: '1 Active' },
      { label: 'Users', value: '32' },
      { label: 'Audit Log', value: 'Clean' },
    ],
    nextAction: {
      label: 'Review Access Permissions',
      description: 'Verify role-to-capability bindings in Security matrix',
    },
  },
};

export function RoleOverviewSection() {
  const { activeRoles, switchRole } = useRole();

  return (
    <section aria-labelledby="roles-overview-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="roles-overview-heading" className="text-sm font-semibold text-devoc-text-primary">
            Active Role Workspaces
          </h2>
          <p className="text-xs text-devoc-text-secondary">
            Synthesized overview of responsibilities across your active roles. Select any role to focus your workspace perspective.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeRoles.map((role) => {
          const config = ROLE_METRICS_MAP[role.category] || {
            metrics: [{ label: 'Status', value: 'Active' }],
            nextAction: { label: 'Explore Workspace', description: 'Review recent assignments' },
          };
          const Icon = ROLE_ICON_MAP[role.category] || Briefcase;

          return (
            <RoleOverviewCard
              key={role.category}
              role={role.category}
              title={role.name}
              description={role.description}
              icon={Icon}
              isPrimary={role.isPrimary}
              metrics={config.metrics}
              nextAction={config.nextAction}
              onEnterWorkspace={switchRole}
            />
          );
        })}
      </div>
    </section>
  );
}
