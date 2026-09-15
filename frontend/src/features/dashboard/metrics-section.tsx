import React from 'react';
import { Clock, Briefcase, GraduationCap, Award } from 'lucide-react';
import { MetricCard } from '../../components/data/metric-card';
import { useRole } from '../../roles/role.context';

export function MetricsSection() {
  const { currentRole } = useRole();

  return (
    <section aria-labelledby="metrics-section-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="metrics-section-heading" className="text-sm font-semibold text-devoc-text-primary">
          Key Performance Indicators
        </h2>
        <span className="text-xs text-devoc-text-tertiary">Live operational snapshot</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Hours Logged (Week)"
          value="38.5h"
          subtext="Target: 40h/week (96% on track)"
          trend={{ value: '+4.2h vs last wk', direction: 'up', isPositive: true }}
          icon={Clock}
        />

        <MetricCard
          label="Active Assignments"
          value="3"
          subtext="2 Projects • 1 Mentorship"
          trend={{ value: 'Within capacity limits', direction: 'neutral' }}
          icon={Briefcase}
        />

        <MetricCard
          label="Milestones Completed"
          value="18"
          subtext="Across 2 learning programs"
          trend={{ value: '+2 this month', direction: 'up', isPositive: true }}
          icon={GraduationCap}
        />

        <MetricCard
          label="Contribution Score"
          value="94.2"
          subtext="Evaluation index across BUs"
          trend={{ value: 'Top 10th percentile', direction: 'up', isPositive: true }}
          icon={Award}
        />
      </div>
    </section>
  );
}
