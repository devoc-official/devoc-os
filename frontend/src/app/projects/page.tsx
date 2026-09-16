'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeProjectsView } from '../../features/employee/views/employee-projects-view';
import { FounderProjectsView } from '../../features/founder/views/founder-projects-view';
import { AcademyProjectsView } from '../../features/academy-head/views/academy-projects-view';
import { useRole } from '../../roles/role.context';

export default function ProjectsPage() {
  const { currentRole } = useRole();

  return (
    <AppShell>
      {currentRole === 'founder' ? (
        <FounderProjectsView />
      ) : currentRole === 'academy_head' ? (
        <AcademyProjectsView />
      ) : (
        <EmployeeProjectsView />
      )}
    </AppShell>
  );
}
