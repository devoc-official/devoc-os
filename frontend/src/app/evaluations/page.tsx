'use client';

import React from 'react';
import { AppShell } from '../../layouts/app-shell';
import { EmployeeEvaluationsView } from '../../features/employee/views/employee-evaluations-view';

export default function EvaluationsPage() {
  return (
    <AppShell>
      <EmployeeEvaluationsView />
    </AppShell>
  );
}
