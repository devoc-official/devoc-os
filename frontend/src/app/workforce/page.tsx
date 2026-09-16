'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderWorkforceView } from '../../features/founder/views/founder-workforce-view';

export default function WorkforcePage() {
  return (
    <AppShell>
      <FounderWorkforceView />
    </AppShell>
  );
}
