'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeProjectsView } from '../../features/employee/views/employee-projects-view';

export default function ProjectsPage() {
  return (
    <AppShell>
      <EmployeeProjectsView />
    </AppShell>
  );
}
