'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderAcademyView } from '../../features/founder/views/founder-academy-view';

export default function AcademyPage() {
  return (
    <AppShell>
      <FounderAcademyView />
    </AppShell>
  );
}
