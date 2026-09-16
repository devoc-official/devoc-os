'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { ReviewerHistoryView } from '../../../features/reviewer/views/reviewer-history-view';

export default function ReviewerHistoryPage() {
  return (
    <AppShell>
      <ReviewerHistoryView />
    </AppShell>
  );
}
