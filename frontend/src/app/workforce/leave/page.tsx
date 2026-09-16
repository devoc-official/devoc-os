'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { EmployeeLeaveView } from '../../../features/employee/views/employee-leave-view';

export default function LeavePage() {
  return (
    <AppShell>
      <EmployeeLeaveView />
    </AppShell>
  );
}
