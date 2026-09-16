'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminUsersView } from '../../../features/admin/views/admin-users-view';

export default function AdminUsersPage() {
  return (
    <AppShell>
      <AdminUsersView />
    </AppShell>
  );
}
