'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMRisksView } from '../../../features/pm/views/pm-risks-view';

export default function PMRisksPage() {
  return (
    <AppShell>
      <PMRisksView />
    </AppShell>
  );
}
