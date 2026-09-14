// ============================================================================
// REST Router — M15 Attendance, Leave & Workforce Time Engine
// ============================================================================

import { Router } from 'express';
import { WorkforceTimeController } from './workforce-time.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireCapability } from '../../../permissions/permissions.middleware.js';

export const workforceTimeRouter = Router();

const tenantProtected = Router({ mergeParams: true });
tenantProtected.use(authenticate, resolveTenant);

const BASE = '/organizations/:orgId/workforce-time';

// --- SCHEDULES ---
tenantProtected.post(
  `${BASE}/schedules`,
  requireCapability('workforce_time:manage'),
  WorkforceTimeController.createSchedule
);
tenantProtected.get(
  `${BASE}/schedules`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listSchedules
);
tenantProtected.get(
  `${BASE}/schedules/assignments`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listScheduleAssignments
);
tenantProtected.post(
  `${BASE}/schedules/assignments`,
  requireCapability('workforce_time:manage'),
  WorkforceTimeController.assignSchedule
);
tenantProtected.get(
  `${BASE}/schedules/:id`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.getSchedule
);
tenantProtected.put(
  `${BASE}/schedules/:id`,
  requireCapability('workforce_time:manage'),
  WorkforceTimeController.updateSchedule
);

// --- ATTENDANCE & MULTI-SESSION ---
tenantProtected.post(
  `${BASE}/attendance/check-in`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.checkIn
);
tenantProtected.post(
  `${BASE}/attendance/check-out`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.checkOut
);
tenantProtected.patch(
  `${BASE}/attendance/corrections/:id/review`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.reviewCorrection
);
tenantProtected.post(
  `${BASE}/attendance/corrections/:id/review`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.reviewCorrection
);
tenantProtected.post(
  `${BASE}/attendance/:id/corrections`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.requestCorrection
);
tenantProtected.get(
  `${BASE}/attendance/:id`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.getAttendanceRecord
);
tenantProtected.get(
  `${BASE}/attendance`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listAttendanceRecords
);

// --- WORKFORCE TIME RECORDS ---
tenantProtected.post(
  `${BASE}/time-records`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.createTimeRecord
);
tenantProtected.get(
  `${BASE}/time-records`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listTimeRecords
);
tenantProtected.get(
  `${BASE}/time-records/:id`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.getTimeRecord
);
tenantProtected.patch(
  `${BASE}/time-records/:id`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.updateTimeRecord
);
tenantProtected.patch(
  `${BASE}/time-records/:id/overtime/review`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.reviewOvertime
);
tenantProtected.post(
  `${BASE}/time-records/:id/overtime/review`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.reviewOvertime
);

// --- TIMESHEETS ---
tenantProtected.post(
  `${BASE}/timesheets`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.createTimesheet
);
tenantProtected.get(
  `${BASE}/timesheets`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listTimesheets
);
tenantProtected.get(
  `${BASE}/timesheets/:id`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.getTimesheet
);
tenantProtected.patch(
  `${BASE}/timesheets/:id/submit`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.submitTimesheet
);
tenantProtected.post(
  `${BASE}/timesheets/:id/submit`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.submitTimesheet
);
tenantProtected.patch(
  `${BASE}/timesheets/:id/approve`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.approveTimesheet
);
tenantProtected.post(
  `${BASE}/timesheets/:id/approve`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.approveTimesheet
);
tenantProtected.patch(
  `${BASE}/timesheets/:id/reject`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.rejectTimesheet
);
tenantProtected.post(
  `${BASE}/timesheets/:id/reject`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.rejectTimesheet
);
tenantProtected.patch(
  `${BASE}/timesheets/:id/cancel`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.cancelTimesheet
);
tenantProtected.post(
  `${BASE}/timesheets/:id/cancel`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.cancelTimesheet
);

// --- LEAVE ENGINE & BALANCES ---
tenantProtected.post(
  `${BASE}/leave-types`,
  requireCapability('workforce_time:admin'),
  WorkforceTimeController.createLeaveType
);
tenantProtected.get(
  `${BASE}/leave-types`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listLeaveTypes
);
tenantProtected.post(
  `${BASE}/leave-policies`,
  requireCapability('workforce_time:admin'),
  WorkforceTimeController.createLeavePolicy
);
tenantProtected.get(
  `${BASE}/leave-policies`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listLeavePolicies
);
tenantProtected.post(
  `${BASE}/leave-balances/adjust`,
  requireCapability('workforce_time:manage'),
  WorkforceTimeController.adjustLeaveBalance
);
tenantProtected.get(
  `${BASE}/leave-balances`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listLeaveBalances
);
tenantProtected.post(
  `${BASE}/leave-requests`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.createLeaveRequest
);
tenantProtected.get(
  `${BASE}/leave-requests`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listLeaveRequests
);
tenantProtected.get(
  `${BASE}/leave-requests/:id`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.getLeaveRequest
);
tenantProtected.patch(
  `${BASE}/leave-requests/:id/submit`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.submitLeaveRequest
);
tenantProtected.post(
  `${BASE}/leave-requests/:id/submit`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.submitLeaveRequest
);
tenantProtected.patch(
  `${BASE}/leave-requests/:id/approve`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.approveLeaveRequest
);
tenantProtected.post(
  `${BASE}/leave-requests/:id/approve`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.approveLeaveRequest
);
tenantProtected.patch(
  `${BASE}/leave-requests/:id/reject`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.rejectLeaveRequest
);
tenantProtected.post(
  `${BASE}/leave-requests/:id/reject`,
  requireCapability('workforce_time:approve'),
  WorkforceTimeController.rejectLeaveRequest
);
tenantProtected.patch(
  `${BASE}/leave-requests/:id/cancel`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.cancelLeaveRequest
);
tenantProtected.post(
  `${BASE}/leave-requests/:id/cancel`,
  requireCapability('workforce_time:create'),
  WorkforceTimeController.cancelLeaveRequest
);

// --- HOLIDAYS ---
tenantProtected.post(
  `${BASE}/holidays`,
  requireCapability('workforce_time:manage'),
  WorkforceTimeController.createHoliday
);
tenantProtected.get(
  `${BASE}/holidays`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.listHolidays
);
tenantProtected.delete(
  `${BASE}/holidays/:id`,
  requireCapability('workforce_time:manage'),
  WorkforceTimeController.deleteHoliday
);

// --- AVAILABILITY PROJECTION ---
tenantProtected.get(
  `${BASE}/availability`,
  requireCapability('workforce_time:view'),
  WorkforceTimeController.getAvailability
);

workforceTimeRouter.use(tenantProtected);
