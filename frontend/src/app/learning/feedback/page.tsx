'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentFeedbackView } from '../../../features/student/views/student-feedback-view';

export default function FeedbackPage() {
  return (
    <AppShell>
      <StudentFeedbackView />
    </AppShell>
  );
}
