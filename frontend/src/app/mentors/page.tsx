'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { AcademyMentorsView } from '../../features/academy-head/views/academy-mentors-view';

export default function MentorsPage() {
  return (
    <AppShell>
      <AcademyMentorsView />
    </AppShell>
  );
}
