'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentAssessmentsView } from '../../../features/student/views/student-assessments-view';

export default function AssessmentsPage() {
  return (
    <AppShell>
      <StudentAssessmentsView />
    </AppShell>
  );
}
