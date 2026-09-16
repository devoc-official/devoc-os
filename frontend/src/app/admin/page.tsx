'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { AdminDashboardView } from '../../features/admin/views/admin-dashboard-view';

export default function AdminDashboardPage() {
  return (
    <AppShell>
      <AdminDashboardView />
    </AppShell>
  );
}
