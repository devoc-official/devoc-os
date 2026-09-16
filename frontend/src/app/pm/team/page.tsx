'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMTeamView } from '../../../features/pm/views/pm-team-view';

export default function PMTeamPage() {
  return (
    <AppShell>
      <PMTeamView />
    </AppShell>
  );
}
