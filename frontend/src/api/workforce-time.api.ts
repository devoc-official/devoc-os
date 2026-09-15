import { apiClient } from './client';

export interface WorkforceSchedule {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  scheduleType: 'fixed' | 'flexible';
  expectedWeeklyHours: number;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  attendanceDate: string;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
  totalPresenceMinutes: number;
  totalBreakMinutes: number;
  totalWorkMinutes: number;
  hasMissingCheckout: boolean;
}

export interface Timesheet {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  periodStartDate: string;
  periodEndDate: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  totalRegularHours: number;
  totalBreakHours: number;
  totalOvertimeHours: number;
  totalBillableHours: number;
  submittedAt?: string | null;
  approvedAt?: string | null;
}

export interface LeaveBalance {
  id: string;
  organizationId: string;
  employmentId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  reservedDays: number;
  availableDays: number;
}

export interface AvailabilityProjection {
  organizationId: string;
  employmentId: string;
  startDate: string;
  endDate: string;
  totalCalendarDays: number;
  scheduledWorkingDays: number;
  holidayDays: number;
  approvedLeaveDays: number;
  netAvailableDays: number;
  netAvailableHours: number;
}

export const workforceTimeApi = {
  listSchedules: async (organizationId: string): Promise<WorkforceSchedule[]> => {
    return apiClient.get<WorkforceSchedule[]>(`/organizations/${organizationId}/workforce-time/schedules`);
  },

  listAttendance: async (organizationId: string, params?: { personId?: string; date?: string }): Promise<AttendanceRecord[]> => {
    return apiClient.get<AttendanceRecord[]>(`/organizations/${organizationId}/workforce-time/attendance`, { params });
  },

  checkIn: async (organizationId: string, data: { employmentId: string; personId: string; checkInAt?: string }): Promise<{ attendanceRecord: AttendanceRecord }> => {
    return apiClient.post<{ attendanceRecord: AttendanceRecord }>(`/organizations/${organizationId}/workforce-time/attendance/check-in`, data);
  },

  checkOut: async (organizationId: string, data: { employmentId: string; personId: string; checkOutAt?: string }): Promise<{ attendanceRecord: AttendanceRecord }> => {
    return apiClient.post<{ attendanceRecord: AttendanceRecord }>(`/organizations/${organizationId}/workforce-time/attendance/check-out`, data);
  },

  listTimesheets: async (organizationId: string, params?: { personId?: string; status?: string }): Promise<Timesheet[]> => {
    return apiClient.get<Timesheet[]>(`/organizations/${organizationId}/workforce-time/timesheets`, { params });
  },

  listLeaveBalances: async (organizationId: string, params?: { employmentId?: string; year?: number }): Promise<LeaveBalance[]> => {
    return apiClient.get<LeaveBalance[]>(`/organizations/${organizationId}/workforce-time/leave-balances`, { params });
  },

  getAvailability: async (organizationId: string, params: { employmentId: string; startDate: string; endDate: string }): Promise<AvailabilityProjection> => {
    return apiClient.get<AvailabilityProjection>(`/organizations/${organizationId}/workforce-time/availability`, { params });
  },
};
