'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AppShell } from '../../../../layouts/app-shell';
import { ReviewerWorkspaceView } from '../../../../features/reviewer/views/reviewer-workspace-view';

export default function ReviewerWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const paramId = (params?.reviewId as string) || '';
  const isNew = paramId === 'new';

  const reviewId = isNew ? undefined : paramId;
  const enrollmentId = searchParams.get('enrollmentId') || (isNew ? undefined : paramId);

  return (
    <AppShell>
      <ReviewerWorkspaceView enrollmentId={enrollmentId} reviewId={reviewId} />
    </AppShell>
  );
}
