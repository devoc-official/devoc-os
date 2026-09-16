'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { MentorAssignmentsView } from '../../../features/mentor/views/mentor-assignments-view';

export default function MentorAssignmentsPage() {
  return (
    <AppShell>
      <MentorAssignmentsView />
    </AppShell>
  );
}
