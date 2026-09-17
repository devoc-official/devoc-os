// ============================================================================
// Domain Types & Enums — M15 Attendance, Leave & Workforce Time Engine
// ============================================================================

export type ScheduleType = 'fixed' | 'flexible' | 'shift' | 'seasonal';
export type ScheduleAssignmentStatus = 'active' | 'superseded' | 'cancelled';
export type AttendanceStatus = 'present' | 'partial' | 'absent' | 'leave' | 'holiday' | 'rest_day' | 'wfh';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TimeType = 'regular' | 'break' | 'overtime' | 'other';
export type OvertimeStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
export type HolidayType = 'public' | 'regional' | 'company' | 'religious' | 'optional';
export type LeaveRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | 'all';
export type AccrualFrequency = 'annual' | 'monthly' | 'quarterly' | 'none';
export type HalfDayPeriod = 'morning' | 'afternoon';

export interface WorkforceSchedule {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  code: string;
  description: string | null;
  scheduleType: ScheduleType;
  timezone: string;
  expectedWeeklyHours: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  workingDays?: WorkforceScheduleDay[];
}

export interface WorkforceScheduleDay {
  id: string;
  organizationId: string;
  scheduleId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isWorkingDay: boolean;
  startTime: string | null; // e.g. "09:00:00"
  endTime: string | null;   // e.g. "17:00:00"
  breakDurationMinutes: number;
  expectedHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforceScheduleAssignment {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  scheduleId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null; // YYYY-MM-DD
  status: ScheduleAssignmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforceHoliday {
  id: string;
  organizationId: string;
  branchId: string | null;
  holidayDate: string; // YYYY-MM-DD
  name: string;
  description: string | null;
  holidayType: HolidayType;
  isHalfDay: boolean;
  isOptional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  attendanceDate: string; // YYYY-MM-DD
  status: AttendanceStatus;
  totalPresenceMinutes: number;
  totalBreakMinutes: number;
  totalWorkMinutes: number;
  isPunctual: boolean;
  hasMissingCheckout: boolean;
  hasCorrection: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  sessions?: AttendanceSession[];
}

export interface AttendanceSession {
  id: string;
  organizationId: string;
  attendanceRecordId: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  durationMinutes: number | null;
  checkInIp: string | null;
  checkOutIp: string | null;
  deviceMetadata: Record<string, unknown>;
  isManualEntry: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceCorrection {
  id: string;
  organizationId: string;
  attendanceRecordId: string;
  attendanceSessionId: string | null;
  originalCheckInAt: Date | null;
  originalCheckOutAt: Date | null;
  correctedCheckInAt: Date;
  correctedCheckOutAt: Date;
  status: CorrectionStatus;
  reason: string;
  requestedByUserId: string;
  reviewedByPersonId: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforceTimeRecord {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  attendanceRecordId: string | null;
  attendanceSessionId: string | null;
  timeType: TimeType;
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  isOvertime: boolean;
  overtimeStatus: OvertimeStatus;
  overtimeApprovedByPersonId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforceTimesheet {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string;   // YYYY-MM-DD
  status: TimesheetStatus;
  totalRegularHours: number;
  totalBreakHours: number;
  totalOvertimeHours: number;
  totalBillableHours: number;
  submittedAt: Date | null;
  approvedByPersonId: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  entries?: WorkforceTimesheetEntry[];
}

export interface WorkforceTimesheetEntry {
  id: string;
  organizationId: string;
  timesheetId: string;
  timeRecordId: string | null;
  entryDate: string; // YYYY-MM-DD
  timeType: TimeType;
  durationMinutes: number;
  hours: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveType {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  allowNegativeBalance: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicy {
  id: string;
  organizationId: string;
  leaveTypeId: string;
  name: string;
  employmentType: EmploymentType;
  accrualFrequency: AccrualFrequency;
  annualAllowanceDays: number;
  maxCarryForwardDays: number;
  minServiceDaysRequired: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicyRule {
  id: string;
  organizationId: string;
  leavePolicyId: string;
  ruleName: string;
  minDaysNotice: number;
  maxConsecutiveDays: number | null;
  documentationThresholdDays: number | null;
  ruleConfiguration: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  leaveTypeId: string;
  year: number;
  openingBalance: number;
  accruedBalance: number;
  adjustedBalance: number;
  usedBalance: number;
  reservedBalance: number;
  availableBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isHalfDay: boolean;
  halfDayPeriod: HalfDayPeriod | null;
  totalDays: number;
  status: LeaveRequestStatus;
  reason: string;
  attachmentUrl: string | null;
  approvedByPersonId: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequestHistory {
  id: string;
  organizationId: string;
  leaveRequestId: string;
  fromStatus: LeaveRequestStatus | null;
  toStatus: LeaveRequestStatus;
  actorPersonId: string | null;
  actorUserId: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface WorkforceAvailabilityProjection {
  employmentId: string;
  startDate: string;
  endDate: string;
  totalCalendarDays: number;
  scheduledWorkingDays: number;
  scheduledWorkingHours: number;
  holidayDays: number;
  holidayHours: number;
  approvedLeaveDays: number;
  approvedLeaveHours: number;
  netAvailableDays: number;
  netAvailableHours: number;
}
