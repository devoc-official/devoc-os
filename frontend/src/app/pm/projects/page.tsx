'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMProjectsView } from '../../../features/pm/views/pm-projects-view';

export default function PMProjectsPage() {
  return (
    <AppShell>
      <PMProjectsView />
    </AppShell>
  );
}
