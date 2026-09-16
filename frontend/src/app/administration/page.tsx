'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderAdminView } from '../../features/founder/views/founder-admin-view';

export default function AdministrationPage() {
  return (
    <AppShell>
      <FounderAdminView />
    </AppShell>
  );
}
