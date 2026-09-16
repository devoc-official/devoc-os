'use client';

import React from 'react';
import { useEmployeeLeave } from '../hooks/use-employee-leave';
import { LeaveBalanceCard } from '../../shared/components/leave-balance-card';

export function EmployeeLeaveView() {
  const { balances, leaveTypes, requests, isLoading, requestLeave } = useEmployeeLeave();

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Leave Management
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Review available annual leave allocations, apply for time off, and track approval states.
        </p>
      </div>

      <LeaveBalanceCard
        balances={balances}
        leaveTypes={leaveTypes}
        requests={requests}
        isLoading={isLoading}
        onRequestLeave={async (payload) => { await requestLeave(payload); }}
      />
    </div>
  );
}
