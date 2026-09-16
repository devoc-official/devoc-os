'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { MentorStudentsView } from '../../../features/mentor/views/mentor-students-view';

export default function MentorStudentsPage() {
  return (
    <AppShell>
      <MentorStudentsView />
    </AppShell>
  );
}
