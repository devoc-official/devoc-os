'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { ReviewerStudentsView } from '../../../features/reviewer/views/reviewer-students-view';

export default function ReviewerStudentsPage() {
  return (
    <AppShell>
      <ReviewerStudentsView />
    </AppShell>
  );
}
