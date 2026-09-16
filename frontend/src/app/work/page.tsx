'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeWorkView } from '../../features/employee/views/employee-work-view';
import { FounderWorkView } from '../../features/founder/views/founder-work-view';
import { useRole } from '../../roles/role.context';

export default function WorkPage() {
  const { currentRole } = useRole();

  return (
    <AppShell>
      {currentRole === 'founder' ? (
        <FounderWorkView />
      ) : (
        <EmployeeWorkView />
      )}
    </AppShell>
  );
}
