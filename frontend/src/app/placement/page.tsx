'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { AcademyPlacementView } from '../../features/academy-head/views/academy-placement-view';

export default function PlacementPage() {
  return (
    <AppShell>
      <AcademyPlacementView />
    </AppShell>
  );
}
