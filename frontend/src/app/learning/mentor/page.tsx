'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentMentorView } from '../../../features/student/views/student-mentor-view';

export default function MentorPage() {
  return (
    <AppShell>
      <StudentMentorView />
    </AppShell>
  );
}
