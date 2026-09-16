'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminAuditView } from '../../../features/admin/views/admin-audit-view';

export default function AdminAuditPage() {
  return (
    <AppShell>
      <AdminAuditView />
    </AppShell>
  );
}
