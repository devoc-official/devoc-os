'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentAchievementsView } from '../../../features/student/views/student-achievements-view';

export default function AchievementsPage() {
  return (
    <AppShell>
      <StudentAchievementsView />
    </AppShell>
  );
}
