'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { AcademyReviewsView } from '../../features/academy-head/views/academy-reviews-view';

export default function ReviewsPage() {
  return (
    <AppShell>
      <AcademyReviewsView />
    </AppShell>
  );
}
