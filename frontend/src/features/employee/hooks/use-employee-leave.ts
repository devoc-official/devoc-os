'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { workforceTimeApi, LeaveBalance, LeaveType, LeaveRequest } from '../../../api/workforce-time.api';

export function useEmployeeLeave() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;
  const queryClient = useQueryClient();

  // 1. Leave balances
  const {
    data: balances = [],
    isLoading: isBalancesLoading,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: ['employee', 'leave-balances-full', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listLeaveBalances(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 2. Leave types
  const { data: leaveTypes = [], isLoading: isTypesLoading } = useQuery({
    queryKey: ['employee', 'leave-types', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listLeaveTypes(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 3. Leave requests
  const {
    data: requests = [],
    isLoading: isRequestsLoading,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['employee', 'leave-requests-full', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listLeaveRequests(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  // 4. Request leave
  const requestMutation = useMutation({
    mutationFn: async (payload: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      requestedDays: number;
      reason?: string;
    }) => {
      if (!orgId || !personId) throw new Error('Missing tenant or identity context');
      const req = await workforceTimeApi.createLeaveRequest(orgId, {
        employmentId: personId,
        personId,
        leaveTypeId: payload.leaveTypeId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        requestedDays: payload.requestedDays,
        reason: payload.reason,
      });

      // Submit immediately
      return await workforceTimeApi.submitLeaveRequest(orgId, req.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'leave-requests-full'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'leave-balances-full'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'leave-balances'] });
    },
  });

  return {
    balances,
    leaveTypes,
    requests,
    isLoading: isBalancesLoading || isTypesLoading || isRequestsLoading,
    requestLeave: requestMutation.mutateAsync,
    refetch: () => {
      refetchBalances();
      refetchRequests();
    },
  };
}
