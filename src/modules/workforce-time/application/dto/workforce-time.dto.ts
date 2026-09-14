// ============================================================================
// Application DTOs — M15 Attendance, Leave & Workforce Time Engine
// ============================================================================

import {
  ScheduleType,
  TimeType,
  HolidayType,
  EmploymentType,
  AccrualFrequency,
  HalfDayPeriod,
} from '../../domain/workforce-time.types.js';

export interface ScheduleDayInput {
  dayOfWeek: number;
  isWorkingDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  breakDurationMinutes?: number;
  expectedHours?: number;
}

export interface CreateScheduleDto {
  name: string;
  code: string;
  description?: string | null;
  scheduleType?: ScheduleType;
  timezone?: string;
  expectedWeeklyHours?: number;
  branchId?: string | null;
  isDefault?: boolean;
  workingDays?: ScheduleDayInput[];
}

export interface UpdateScheduleDto {
  name?: string;
  description?: string | null;
  scheduleType?: ScheduleType;
  timezone?: string;
  expectedWeeklyHours?: number;
  branchId?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  workingDays?: ScheduleDayInput[];
}

export interface AssignScheduleDto {
  employmentId: string;
  personId: string;
  scheduleId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null; // YYYY-MM-DD
  notes?: string | null;
}

export interface CheckInDto {
  employmentId: string;
  personId: string;
  checkInAt?: string; // ISO8601 UTC
  isWfh?: boolean;
  checkInIp?: string;
  deviceMetadata?: Record<string, unknown>;
}

export interface CheckOutDto {
  employmentId: string;
  personId: string;
  checkOutAt?: string; // ISO8601 UTC
  checkOutIp?: string;
}

export interface RequestCorrectionDto {
  attendanceSessionId?: string | null;
  correctedCheckInAt: string; // ISO8601 UTC
  correctedCheckOutAt: string; // ISO8601 UTC
  reason: string;
}

export interface ReviewCorrectionDto {
  action: 'approve' | 'reject';
  reviewNotes?: string;
  reviewedByPersonId?: string;
}

export interface CreateTimeRecordDto {
  employmentId: string;
  personId: string;
  attendanceRecordId?: string | null;
  attendanceSessionId?: string | null;
  timeType: TimeType;
  startedAt: string; // ISO8601 UTC
  endedAt: string;   // ISO8601 UTC
  isOvertime?: boolean;
  description?: string | null;
}

export interface UpdateTimeRecordDto {
  timeType?: TimeType;
  startedAt?: string;
  endedAt?: string;
  description?: string | null;
}

export interface ReviewOvertimeDto {
  action: 'approve' | 'reject';
  reviewedByPersonId?: string;
}

export interface CreateTimesheetDto {
  employmentId: string;
  personId: string;
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string;   // YYYY-MM-DD
  notes?: string | null;
}

export interface ApproveTimesheetDto {
  approvedByPersonId?: string;
  notes?: string;
}

export interface RejectTimesheetDto {
  rejectionReason: string;
}

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  description?: string | null;
  isPaid?: boolean;
  requiresApproval?: boolean;
  requiresDocumentation?: boolean;
  allowNegativeBalance?: boolean;
}

export interface CreateLeavePolicyDto {
  leaveTypeId: string;
  name: string;
  employmentType: EmploymentType;
  accrualFrequency?: AccrualFrequency;
  annualAllowanceDays: number;
  maxCarryForwardDays?: number;
  minServiceDaysRequired?: number;
}

export interface AdjustLeaveBalanceDto {
  employmentId: string;
  personId: string;
  leaveTypeId: string;
  year: number;
  adjustmentDays: number; // positive or negative
  reason: string;
}

export interface CreateLeaveRequestDto {
  employmentId: string;
  personId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isHalfDay?: boolean;
  halfDayPeriod?: HalfDayPeriod | null;
  totalDays: number;
  reason: string;
  attachmentUrl?: string | null;
  autoSubmit?: boolean;
}

export interface ApproveLeaveRequestDto {
  approvedByPersonId?: string;
  notes?: string;
}

export interface RejectLeaveRequestDto {
  rejectionReason: string;
}

export interface CancelLeaveRequestDto {
  cancellationReason?: string;
}

export interface CreateHolidayDto {
  branchId?: string | null;
  holidayDate: string; // YYYY-MM-DD
  name: string;
  description?: string | null;
  holidayType?: HolidayType;
  isHalfDay?: boolean;
  isOptional?: boolean;
}

export interface AvailabilityQueryDto {
  employmentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}
