'use client';

import React from 'react';
import { AppShell } from '../../../layouts/app-shell';
import { MentorMeetingsView } from '../../../features/mentor/views/mentor-meetings-view';

export default function MentorMeetingsPage() {
  return (
    <AppShell>
      <MentorMeetingsView />
    </AppShell>
  );
}
