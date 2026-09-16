'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminPeopleView } from '../../../features/admin/views/admin-people-view';

export default function AdminPeoplePage() {
  return (
    <AppShell>
      <AdminPeopleView />
    </AppShell>
  );
}
