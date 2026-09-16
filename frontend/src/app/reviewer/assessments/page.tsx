'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { ReviewerAssessmentsView } from '../../../features/reviewer/views/reviewer-assessments-view';

export default function ReviewerAssessmentsPage() {
  return (
    <AppShell>
      <ReviewerAssessmentsView />
    </AppShell>
  );
}
