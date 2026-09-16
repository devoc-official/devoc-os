'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { AcademyAssessmentsView } from '../../features/academy-head/views/academy-assessments-view';

export default function AssessmentsPage() {
  return (
    <AppShell>
      <AcademyAssessmentsView />
    </AppShell>
  );
}
