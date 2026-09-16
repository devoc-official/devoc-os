'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMWorkView } from '../../../features/pm/views/pm-work-view';

export default function PMWorkPage() {
  return (
    <AppShell>
      <PMWorkView />
    </AppShell>
  );
}
