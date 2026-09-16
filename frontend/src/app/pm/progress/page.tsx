'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMProgressView } from '../../../features/pm/views/pm-progress-view';

export default function PMProgressPage() {
  return (
    <AppShell>
      <PMProgressView />
    </AppShell>
  );
}
