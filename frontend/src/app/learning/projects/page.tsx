'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentProjectsView } from '../../../features/student/views/student-projects-view';

export default function ProjectsPage() {
  return (
    <AppShell>
      <StudentProjectsView />
    </AppShell>
  );
}
