'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeMeetingsView } from '../../features/employee/views/employee-meetings-view';

export default function MeetingsPage() {
  return (
    <AppShell>
      <EmployeeMeetingsView />
    </AppShell>
  );
}
