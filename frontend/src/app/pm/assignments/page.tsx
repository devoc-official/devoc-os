'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { PMAssignmentsView } from '../../../features/pm/views/pm-assignments-view';

export default function PMAssignmentsPage() {
  return (
    <AppShell>
      <PMAssignmentsView />
    </AppShell>
  );
}
