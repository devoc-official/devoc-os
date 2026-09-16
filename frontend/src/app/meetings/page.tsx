'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeMeetingsView } from '../../features/employee/views/employee-meetings-view';
import { FounderMeetingsView } from '../../features/founder/views/founder-meetings-view';
import { useRole } from '../../roles/role.context';

export default function MeetingsPage() {
  const { currentRole } = useRole();

  return (
    <AppShell>
      {currentRole === 'founder' ? (
        <FounderMeetingsView />
      ) : (
        <EmployeeMeetingsView />
      )}
    </AppShell>
  );
}
