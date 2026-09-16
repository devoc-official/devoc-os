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

export interface LeaveType {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isPaid: boolean;
  defaultAllocationDays: number;
  colorHex?: string | null;
  isActive: boolean;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason?: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

  requestCorrection: async (organizationId: string, attendanceId: string, data: { requestedCheckInAt?: string; requestedCheckOutAt?: string; reason: string }): Promise<any> => {
    return apiClient.post<any>(`/organizations/${organizationId}/workforce-time/attendance/${attendanceId}/corrections`, data);
  },

  listTimesheets: async (organizationId: string, params?: { personId?: string; status?: string }): Promise<Timesheet[]> => {
    return apiClient.get<Timesheet[]>(`/organizations/${organizationId}/workforce-time/timesheets`, { params });
  },

  getTimesheet: async (organizationId: string, timesheetId: string): Promise<Timesheet> => {
    return apiClient.get<Timesheet>(`/organizations/${organizationId}/workforce-time/timesheets/${timesheetId}`);
  },

  createTimesheet: async (organizationId: string, data: Partial<Timesheet>): Promise<Timesheet> => {
    return apiClient.post<Timesheet>(`/organizations/${organizationId}/workforce-time/timesheets`, data);
  },

  submitTimesheet: async (organizationId: string, timesheetId: string): Promise<Timesheet> => {
    return apiClient.post<Timesheet>(`/organizations/${organizationId}/workforce-time/timesheets/${timesheetId}/submit`, {});
  },

  approveTimesheet: async (organizationId: string, timesheetId: string): Promise<Timesheet> => {
    return apiClient.post<Timesheet>(`/organizations/${organizationId}/workforce-time/timesheets/${timesheetId}/approve`, {});
  },

  rejectTimesheet: async (organizationId: string, timesheetId: string, reason?: string): Promise<Timesheet> => {
    return apiClient.post<Timesheet>(`/organizations/${organizationId}/workforce-time/timesheets/${timesheetId}/reject`, { reason });
  },

  cancelTimesheet: async (organizationId: string, timesheetId: string): Promise<Timesheet> => {
    return apiClient.post<Timesheet>(`/organizations/${organizationId}/workforce-time/timesheets/${timesheetId}/cancel`, {});
  },

  listLeaveBalances: async (organizationId: string, params?: { employmentId?: string; year?: number }): Promise<LeaveBalance[]> => {
    return apiClient.get<LeaveBalance[]>(`/organizations/${organizationId}/workforce-time/leave-balances`, { params });
  },

  listLeaveTypes: async (organizationId: string): Promise<LeaveType[]> => {
    return apiClient.get<LeaveType[]>(`/organizations/${organizationId}/workforce-time/leave-types`);
  },

  listLeaveRequests: async (organizationId: string, params?: { personId?: string; status?: string; year?: number }): Promise<LeaveRequest[]> => {
    return apiClient.get<LeaveRequest[]>(`/organizations/${organizationId}/workforce-time/leave-requests`, { params });
  },

  getLeaveRequest: async (organizationId: string, requestId: string): Promise<LeaveRequest> => {
    return apiClient.get<LeaveRequest>(`/organizations/${organizationId}/workforce-time/leave-requests/${requestId}`);
  },

  createLeaveRequest: async (organizationId: string, data: Partial<LeaveRequest>): Promise<LeaveRequest> => {
    return apiClient.post<LeaveRequest>(`/organizations/${organizationId}/workforce-time/leave-requests`, data);
  },

  submitLeaveRequest: async (organizationId: string, requestId: string): Promise<LeaveRequest> => {
    return apiClient.post<LeaveRequest>(`/organizations/${organizationId}/workforce-time/leave-requests/${requestId}/submit`, {});
  },

  approveLeaveRequest: async (organizationId: string, requestId: string): Promise<LeaveRequest> => {
    return apiClient.post<LeaveRequest>(`/organizations/${organizationId}/workforce-time/leave-requests/${requestId}/approve`, {});
  },

  rejectLeaveRequest: async (organizationId: string, requestId: string, reason?: string): Promise<LeaveRequest> => {
    return apiClient.post<LeaveRequest>(`/organizations/${organizationId}/workforce-time/leave-requests/${requestId}/reject`, { reason });
  },

  cancelLeaveRequest: async (organizationId: string, requestId: string): Promise<LeaveRequest> => {
    return apiClient.post<LeaveRequest>(`/organizations/${organizationId}/workforce-time/leave-requests/${requestId}/cancel`, {});
  },

  getAvailability: async (organizationId: string, params: { employmentId: string; startDate: string; endDate: string }): Promise<AvailabilityProjection> => {
    return apiClient.get<AvailabilityProjection>(`/organizations/${organizationId}/workforce-time/availability`, { params });
  },
};
