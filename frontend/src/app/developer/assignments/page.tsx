'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { DeveloperAssignmentsView } from '../../../features/developer/views/developer-assignments-view';

export default function DeveloperAssignmentsPage() {
  return (
    <AppShell>
      <DeveloperAssignmentsView />
    </AppShell>
  );
}
