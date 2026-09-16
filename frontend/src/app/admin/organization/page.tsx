'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminOrganizationView } from '../../../features/admin/views/admin-organization-view';

export default function AdminOrganizationPage() {
  return (
    <AppShell>
      <AdminOrganizationView />
    </AppShell>
  );
}
