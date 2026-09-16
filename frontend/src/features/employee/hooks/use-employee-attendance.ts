'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { workforceTimeApi, AttendanceRecord } from '../../../api/workforce-time.api';

export function useEmployeeAttendance() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Attendance records
  const {
    data: attendanceRecords = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['employee', 'attendance-full', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workforceTimeApi.listAttendance(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const todayRecord = attendanceRecords.find((a) => a.attendanceDate === todayStr) || null;

  // 2. Check in
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !personId) throw new Error('Missing tenant or identity context');
      // Resolve employmentId or use personId fallback
      return await workforceTimeApi.checkIn(orgId, {
        employmentId: personId,
        personId,
        checkInAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'attendance-full'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'attendance'] });
    },
  });

  // 3. Check out
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !personId) throw new Error('Missing tenant or identity context');
      return await workforceTimeApi.checkOut(orgId, {
        employmentId: personId,
        personId,
        checkOutAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'attendance-full'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'attendance'] });
    },
  });

  // 4. Request correction
  const correctionMutation = useMutation({
    mutationFn: async ({
      attendanceId,
      requestedCheckInAt,
      requestedCheckOutAt,
      reason,
    }: {
      attendanceId: string;
      requestedCheckInAt?: string;
      requestedCheckOutAt?: string;
      reason: string;
    }) => {
      if (!orgId) throw new Error('Missing organization context');
      return await workforceTimeApi.requestCorrection(orgId, attendanceId, {
        requestedCheckInAt,
        requestedCheckOutAt,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'attendance-full'] });
    },
  });

  return {
    attendanceRecords,
    todayRecord,
    isLoading,
    checkIn: checkInMutation.mutateAsync,
    checkOut: checkOutMutation.mutateAsync,
    requestCorrection: correctionMutation.mutateAsync,
    refetch,
  };
}
