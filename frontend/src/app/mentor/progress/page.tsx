'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { MentorProgressView } from '../../../features/mentor/views/mentor-progress-view';

export default function MentorProgressPage() {
  return (
    <AppShell>
      <MentorProgressView />
    </AppShell>
  );
}
