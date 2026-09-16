'use client';

import React from 'react';
import { useEmployeeTimesheets } from '../hooks/use-employee-timesheets';
import { TimesheetSummary } from '../../shared/components/timesheet-summary';

export function EmployeeTimesheetsView() {
  const { timesheets, currentTimesheet, isLoading, submitTimesheet } = useEmployeeTimesheets();

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Weekly Timesheets
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Verification and submission of weekly presence, regular hours, overtime, and manager approvals.
        </p>
      </div>

      <TimesheetSummary
        currentTimesheet={currentTimesheet}
        timesheetHistory={timesheets}
        isLoading={isLoading}
        onSubmitTimesheet={async (id) => { await submitTimesheet(id); }}
      />
    </div>
  );
}
