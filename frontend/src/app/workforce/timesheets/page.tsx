'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { EmployeeTimesheetsView } from '../../../features/employee/views/employee-timesheets-view';

export default function TimesheetsPage() {
  return (
    <AppShell>
      <EmployeeTimesheetsView />
    </AppShell>
  );
}
