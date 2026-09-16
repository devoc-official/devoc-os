'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderRecruitmentView } from '../../features/founder/views/founder-recruitment-view';

export default function RecruitmentPage() {
  return (
    <AppShell>
      <FounderRecruitmentView />
    </AppShell>
  );
}
