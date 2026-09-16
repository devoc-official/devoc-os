'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderAnalyticsView } from '../../features/founder/views/founder-analytics-view';
import { AcademyAnalyticsView } from '../../features/academy-head/views/academy-analytics-view';
import { useRole } from '../../roles/role.context';

export default function AnalyticsPage() {
  const { currentRole } = useRole();

  return (
    <AppShell>
      {currentRole === 'academy_head' ? (
        <AcademyAnalyticsView />
      ) : (
        <FounderAnalyticsView />
      )}
    </AppShell>
  );
}
