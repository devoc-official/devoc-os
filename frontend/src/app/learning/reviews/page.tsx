'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentReviewsView } from '../../../features/student/views/student-reviews-view';

export default function ReviewsPage() {
  return (
    <AppShell>
      <StudentReviewsView />
    </AppShell>
  );
}
