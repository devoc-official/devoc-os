'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentProgressView } from '../../../features/student/views/student-progress-view';
import { AcademyProgressView } from '../../../features/academy-head/views/academy-progress-view';
import { useRole } from '../../../roles/role.context';

export default function ProgressPage() {
  const { currentRole } = useRole();

  return (
    <AppShell>
      {currentRole === 'academy_head' || currentRole === 'founder' ? (
        <AcademyProgressView />
      ) : (
        <StudentProgressView />
      )}
    </AppShell>
  );
}
