'use client';

import React from 'react';
import { useEmployeeAttendance } from '../hooks/use-employee-attendance';
import { AttendanceSummary } from '../../shared/components/attendance-summary';
import { Clock } from 'lucide-react';

export function EmployeeAttendanceView() {
  const { attendanceRecords, todayRecord, isLoading, checkIn, checkOut } = useEmployeeAttendance();

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Attendance Tracking
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Daily attendance sessions, live clock-in/out tracking, and historical presence records.
        </p>
      </div>

      <AttendanceSummary
        todayRecord={todayRecord}
        recentRecords={attendanceRecords}
        isLoading={isLoading}
        onCheckIn={async () => { await checkIn(); }}
        onCheckOut={async () => { await checkOut(); }}
      />
    </div>
  );
}
