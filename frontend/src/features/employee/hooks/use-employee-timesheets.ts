'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { workforceTimeApi, Timesheet } from '../../../api/workforce-time.api';

export function useEmployeeTimesheets() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;
  const queryClient = useQueryClient();

  // 1. Timesheets list
  const {
    data: timesheets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['employee', 'timesheets-full', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listTimesheets(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const currentTimesheet = timesheets.find((t) => t.status === 'draft' || t.status === 'submitted') || timesheets[0] || null;

  // 2. Submit timesheet
  const submitMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      if (!orgId) throw new Error('Missing organization context');
      return await workforceTimeApi.submitTimesheet(orgId, timesheetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'timesheets-full'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'timesheets'] });
    },
  });

  return {
    timesheets,
    currentTimesheet,
    isLoading,
    submitTimesheet: submitMutation.mutateAsync,
    refetch,
  };
}
