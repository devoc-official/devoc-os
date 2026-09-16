'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AcademyProgramsView } from '../../../features/academy-head/views/academy-programs-view';

export default function LearningProgramsPage() {
  return (
    <AppShell>
      <AcademyProgramsView />
    </AppShell>
  );
}
