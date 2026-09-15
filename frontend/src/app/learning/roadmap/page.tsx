'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { StudentRoadmapView } from '../../../features/student/views/student-roadmap-view';

export default function RoadmapPage() {
  return (
    <AppShell>
      <StudentRoadmapView />
    </AppShell>
  );
}
