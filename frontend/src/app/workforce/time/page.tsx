'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { EmployeeAttendanceView } from '../../../features/employee/views/employee-attendance-view';

export default function WorkforceTimePage() {
  return (
    <AppShell>
      <EmployeeAttendanceView />
    </AppShell>
  );
}
