'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { DeveloperEvidenceView } from '../../../features/developer/views/developer-evidence-view';

export default function DeveloperEvidencePage() {
  return (
    <AppShell>
      <DeveloperEvidenceView />
    </AppShell>
  );
}
