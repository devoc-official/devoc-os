'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMMeetingsView } from '../../../features/pm/views/pm-meetings-view';

export default function PMMeetingsPage() {
  return (
    <AppShell>
      <PMMeetingsView />
    </AppShell>
  );
}
