'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeTasksView } from '../../features/employee/views/employee-tasks-view';

export default function TasksPage() {
  return (
    <AppShell>
      <EmployeeTasksView />
    </AppShell>
  );
}
