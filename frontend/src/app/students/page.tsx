'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { AcademyStudentsView } from '../../features/academy-head/views/academy-students-view';

export default function StudentsPage() {
  return (
    <AppShell>
      <AcademyStudentsView />
    </AppShell>
  );
}
