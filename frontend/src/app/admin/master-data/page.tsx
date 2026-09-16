'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { AdminMasterDataView } from '../../../features/admin/views/admin-master-data-view';

export default function AdminMasterDataPage() {
  return (
    <AppShell>
      <AdminMasterDataView />
    </AppShell>
  );
}
