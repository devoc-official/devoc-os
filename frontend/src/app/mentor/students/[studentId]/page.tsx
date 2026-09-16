'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../../layouts/app-shell';
import { MentorStudentDetailView } from '../../../../features/mentor/views/mentor-student-detail-view';

export default function MentorStudentDetailPage() {
  const params = useParams();
  const studentId = (params?.studentId as string) || '';

  return (
    <AppShell>
      <MentorStudentDetailView studentId={studentId} />
    </AppShell>
  );
}
