'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderOrganizationView } from '../../features/founder/views/founder-organization-view';

export default function OrganizationPage() {
  return (
    <AppShell>
      <FounderOrganizationView />
    </AppShell>
  );
}
