'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../../layouts/app-shell';
import { MentorReviewDetailView } from '../../../../features/mentor/views/mentor-review-detail-view';

export default function MentorReviewDetailPage() {
  const params = useParams();
  const reviewId = (params?.reviewId as string) || '';

  return (
    <AppShell>
      <MentorReviewDetailView reviewId={reviewId} />
    </AppShell>
  );
}
