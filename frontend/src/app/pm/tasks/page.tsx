'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMTasksView } from '../../../features/pm/views/pm-tasks-view';

export default function PMTasksPage() {
  return (
    <AppShell>
      <PMTasksView />
    </AppShell>
  );
}
