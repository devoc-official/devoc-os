'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { FounderPeopleView } from '../../features/founder/views/founder-people-view';

export default function PeoplePage() {
  return (
    <AppShell>
      <FounderPeopleView />
    </AppShell>
  );
}
