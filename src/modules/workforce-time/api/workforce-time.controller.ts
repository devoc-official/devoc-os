// ============================================================================
// API Controller — M15 Attendance, Leave & Workforce Time Engine
// ============================================================================

import { Request, Response } from 'express';
import { WorkforceTimeService } from '../application/workforce-time.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { TenantAccessDeniedError } from '../../../shared/errors/index.js';

export class WorkforceTimeController {
  private static validateTenant(req: Request): string {
    const { organizationId } = req.tenantContext!;
    const pathOrgId = req.params.orgId || req.params.organizationId;
    if (pathOrgId && pathOrgId !== organizationId) {
      throw new TenantAccessDeniedError('URL organization does not match authorized tenant context');
    }
    return organizationId;
  }

  // ==========================================================================
  // 1. SCHEDULES
  // ==========================================================================

  public static async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const schedule = await WorkforceTimeService.createSchedule(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, schedule, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const schedule = await WorkforceTimeService.updateSchedule(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, schedule, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const schedule = await WorkforceTimeService.getSchedule(orgId, id);
      sendSuccess(res, schedule, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listSchedules(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const schedules = await WorkforceTimeService.listSchedules(orgId, { branchId, isActive });
      sendSuccess(res, schedules, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async assignSchedule(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const assignment = await WorkforceTimeService.assignSchedule(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, assignment, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listScheduleAssignments(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const employmentId = String(req.query.employmentId || '');
      const status = req.query.status ? String(req.query.status) : undefined;
      const assignments = await WorkforceTimeService.listScheduleAssignments(orgId, employmentId, status);
      sendSuccess(res, assignments, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================================================
  // 2. ATTENDANCE & MULTI-SESSION
  // ==========================================================================

  public static async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const result = await WorkforceTimeService.checkIn(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, result, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async checkOut(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const result = await WorkforceTimeService.checkOut(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async requestCorrection(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const userId = req.user?.id || '';
      const correction = await WorkforceTimeService.requestCorrection(
        orgId,
        id,
        req.body,
        userId,
        req.requestId
      );
      sendSuccess(res, correction, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async reviewCorrection(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const correction = await WorkforceTimeService.reviewCorrection(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, correction, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const record = await WorkforceTimeService.getAttendanceRecord(orgId, id);
      sendSuccess(res, record, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const employmentId = req.query.employmentId ? String(req.query.employmentId) : undefined;
      const personId = req.query.personId ? String(req.query.personId) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;

      const records = await WorkforceTimeService.listAttendanceRecords(orgId, {
        employmentId,
        personId,
        startDate,
        endDate,
        status,
      });
      sendSuccess(res, records, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================================================
  // 3. WORKFORCE TIME RECORDS
  // ==========================================================================

  public static async createTimeRecord(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const record = await WorkforceTimeService.createTimeRecord(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, record, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateTimeRecord(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const record = await WorkforceTimeService.updateTimeRecord(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, record, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async reviewOvertime(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const record = await WorkforceTimeService.reviewOvertime(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, record, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getTimeRecord(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const record = await WorkforceTimeService.getTimeRecord(orgId, id);
      sendSuccess(res, record, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listTimeRecords(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const employmentId = req.query.employmentId ? String(req.query.employmentId) : undefined;
      const personId = req.query.personId ? String(req.query.personId) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
      const timeType = req.query.timeType ? String(req.query.timeType) : undefined;
      const isOvertime = req.query.isOvertime !== undefined ? req.query.isOvertime === 'true' : undefined;
      const overtimeStatus = req.query.overtimeStatus ? String(req.query.overtimeStatus) : undefined;

      const records = await WorkforceTimeService.listTimeRecords(orgId, {
        employmentId,
        personId,
        startDate,
        endDate,
        timeType,
        isOvertime,
        overtimeStatus,
      });
      sendSuccess(res, records, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================================================
  // 4. TIMESHEETS
  // ==========================================================================

  public static async createTimesheet(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const timesheet = await WorkforceTimeService.createTimesheet(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, timesheet, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async submitTimesheet(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const timesheet = await WorkforceTimeService.submitTimesheet(
        orgId,
        id,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, timesheet, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async approveTimesheet(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const timesheet = await WorkforceTimeService.approveTimesheet(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, timesheet, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async rejectTimesheet(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const timesheet = await WorkforceTimeService.rejectTimesheet(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, timesheet, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async cancelTimesheet(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const timesheet = await WorkforceTimeService.cancelTimesheet(
        orgId,
        id,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, timesheet, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getTimesheet(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const timesheet = await WorkforceTimeService.getTimesheet(orgId, id);
      sendSuccess(res, timesheet, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listTimesheets(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const employmentId = req.query.employmentId ? String(req.query.employmentId) : undefined;
      const personId = req.query.personId ? String(req.query.personId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

      const timesheets = await WorkforceTimeService.listTimesheets(orgId, {
        employmentId,
        personId,
        status,
        startDate,
        endDate,
      });
      sendSuccess(res, timesheets, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================================================
  // 5. LEAVE ENGINE & BALANCES
  // ==========================================================================

  public static async createLeaveType(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const leaveType = await WorkforceTimeService.createLeaveType(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, leaveType, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listLeaveTypes(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const isActiveOnly = req.query.isActive === 'true';
      const leaveTypes = await WorkforceTimeService.listLeaveTypes(orgId, isActiveOnly);
      sendSuccess(res, leaveTypes, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createLeavePolicy(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const policy = await WorkforceTimeService.createLeavePolicy(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, policy, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listLeavePolicies(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const leaveTypeId = req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined;
      const policies = await WorkforceTimeService.listLeavePolicies(orgId, leaveTypeId);
      sendSuccess(res, policies, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async adjustLeaveBalance(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const balance = await WorkforceTimeService.adjustLeaveBalance(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, balance, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listLeaveBalances(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const employmentId = String(req.query.employmentId || '');
      const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
      const balances = await WorkforceTimeService.listLeaveBalances(orgId, employmentId, year);
      sendSuccess(res, balances, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const request = await WorkforceTimeService.createLeaveRequest(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, request, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async submitLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const request = await WorkforceTimeService.submitLeaveRequest(
        orgId,
        id,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, request, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async approveLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const request = await WorkforceTimeService.approveLeaveRequest(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, request, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async rejectLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const request = await WorkforceTimeService.rejectLeaveRequest(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, request, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async cancelLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const request = await WorkforceTimeService.cancelLeaveRequest(
        orgId,
        id,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, request, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      const request = await WorkforceTimeService.getLeaveRequest(orgId, id);
      sendSuccess(res, request, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const employmentId = req.query.employmentId ? String(req.query.employmentId) : undefined;
      const personId = req.query.personId ? String(req.query.personId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

      const requests = await WorkforceTimeService.listLeaveRequests(orgId, {
        employmentId,
        personId,
        status,
        startDate,
        endDate,
      });
      sendSuccess(res, requests, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================================================
  // 6. HOLIDAYS
  // ==========================================================================

  public static async createHoliday(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const holiday = await WorkforceTimeService.createHoliday(
        orgId,
        req.body,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, holiday, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async deleteHoliday(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const id = String(req.params.id);
      await WorkforceTimeService.deleteHoliday(orgId, id, req.user?.id, req.requestId);
      sendSuccess(res, { deleted: true }, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listHolidays(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;

      const holidays = await WorkforceTimeService.listHolidays(orgId, { startDate, endDate, branchId });
      sendSuccess(res, holidays, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================================================
  // 7. AVAILABILITY PROJECTION
  // ==========================================================================

  public static async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const orgId = WorkforceTimeController.validateTenant(req);
      const employmentId = String(req.query.employmentId || '');
      const startDate = String(req.query.startDate || '');
      const endDate = String(req.query.endDate || '');

      const availability = await WorkforceTimeService.getAvailability(orgId, employmentId, startDate, endDate);
      sendSuccess(res, availability, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
