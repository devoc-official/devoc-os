'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminFeaturesView } from '../../../features/admin/views/admin-features-view';

export default function AdminFeaturesPage() {
  return (
    <AppShell>
      <AdminFeaturesView />
    </AppShell>
  );
}
