'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../../layouts/app-shell';
import { StudentActivityDetailView } from '../../../../features/student/views/student-activity-detail-view';

export default function ActivityDetailPage() {
  const params = useParams();
  const activityId = (params?.activityId as string) || '';

  return (
    <AppShell>
      <StudentActivityDetailView activityId={activityId} />
    </AppShell>
  );
}
