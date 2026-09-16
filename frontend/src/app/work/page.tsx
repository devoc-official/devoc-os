'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeWorkView } from '../../features/employee/views/employee-work-view';

export default function WorkPage() {
  return (
    <AppShell>
      <EmployeeWorkView />
    </AppShell>
  );
}
