'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { MentorReviewsView } from '../../../features/mentor/views/mentor-reviews-view';

export default function MentorReviewsPage() {
  return (
    <AppShell>
      <MentorReviewsView />
    </AppShell>
  );
}
