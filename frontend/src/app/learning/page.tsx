'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { StudentLearningView } from '../../features/student/views/student-learning-view';

export default function LearningPage() {
  return (
    <AppShell>
      <StudentLearningView />
    </AppShell>
  );
}
