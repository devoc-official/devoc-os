'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FoundationPlaceholder } from '../../components/devoc/foundation-placeholder';

export default function LearningPage() {
  return (
    <AppShell>
      <FoundationPlaceholder
        moduleName="Learning & Academy Engine"
        milestoneTarget="Milestone F2 (Student) & F3 (Mentor/Reviewer)"
        description="Self-paced learning journey, milestone deliverables, competency rubrics, mentor sessions, and review approvals."
        backendEngines={['Learning Engine (M7)', 'Evaluation Engine (M8)', 'People & Mentorship (M2)']}
      />
    </AppShell>
  );
}
