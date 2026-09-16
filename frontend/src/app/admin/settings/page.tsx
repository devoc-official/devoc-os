'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminSettingsView } from '../../../features/admin/views/admin-settings-view';

export default function AdminSettingsPage() {
  return (
    <AppShell>
      <AdminSettingsView />
    </AppShell>
  );
}
