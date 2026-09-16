'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminRolesView } from '../../../features/admin/views/admin-roles-view';

export default function AdminRolesPage() {
  return (
    <AppShell>
      <AdminRolesView />
    </AppShell>
  );
}
