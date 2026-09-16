'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { DeveloperWorkspaceView } from '../../features/developer/views/developer-workspace-view';

export default function DeveloperPage() {
  return (
    <AppShell>
      <DeveloperWorkspaceView />
    </AppShell>
  );
}
