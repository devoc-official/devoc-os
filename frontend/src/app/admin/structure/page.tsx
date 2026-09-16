'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminStructureView } from '../../../features/admin/views/admin-structure-view';

export default function AdminStructurePage() {
  return (
    <AppShell>
      <AdminStructureView />
    </AppShell>
  );
}
