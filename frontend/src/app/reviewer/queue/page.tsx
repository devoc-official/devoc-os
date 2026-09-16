'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { ReviewerQueueView } from '../../../features/reviewer/views/reviewer-queue-view';

export default function ReviewerQueuePage() {
  return (
    <AppShell>
      <ReviewerQueueView />
    </AppShell>
  );
}
