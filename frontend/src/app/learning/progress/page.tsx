'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentProgressView } from '../../../features/student/views/student-progress-view';

export default function ProgressPage() {
  return (
    <AppShell>
      <StudentProgressView />
    </AppShell>
  );
}
