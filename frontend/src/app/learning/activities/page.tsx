'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentActivitiesView } from '../../../features/student/views/student-activities-view';

export default function ActivitiesPage() {
  return (
    <AppShell>
      <StudentActivitiesView />
    </AppShell>
  );
}
