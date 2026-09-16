'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../../layouts/app-shell';
import { PMCockpitView } from '../../../../features/pm/views/pm-cockpit-view';

export default function PMProjectCockpitPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <AppShell>
      <PMCockpitView projectId={projectId} />
    </AppShell>
  );
}
