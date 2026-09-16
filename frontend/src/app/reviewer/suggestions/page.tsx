'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { ReviewerFeedbackView } from '../../../features/reviewer/views/reviewer-feedback-view';

export default function ReviewerSuggestionsPage() {
  return (
    <AppShell>
      <ReviewerFeedbackView />
    </AppShell>
  );
}
