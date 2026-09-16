'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderFinanceView } from '../../features/founder/views/founder-finance-view';

export default function FinancePage() {
  return (
    <AppShell>
      <FounderFinanceView />
    </AppShell>
  );
}
