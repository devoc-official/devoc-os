'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { MentorFeedbackView } from '../../../features/mentor/views/mentor-feedback-view';

export default function MentorFeedbackPage() {
  return (
    <AppShell>
      <MentorFeedbackView />
    </AppShell>
  );
}
