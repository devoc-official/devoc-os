// ============================================================================
// Application Service — M15 Attendance, Leave & Workforce Time Engine
// ============================================================================

import { withTransaction, DbClient, getDbClient } from '../../../database/index.js';
import { WorkforceTimeRepository } from '../infrastructure/workforce-time.repository.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import {
  WorkforceSchedule,
  WorkforceScheduleAssignment,
  WorkforceHoliday,
  AttendanceRecord,
  AttendanceSession,
  AttendanceCorrection,
  WorkforceTimeRecord,
  WorkforceTimesheet,
  LeaveType,
  LeavePolicy,
  LeaveBalance,
  LeaveRequest,
  WorkforceAvailabilityProjection,
} from '../domain/workforce-time.types.js';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  AssignScheduleDto,
  CheckInDto,
  CheckOutDto,
  RequestCorrectionDto,
  ReviewCorrectionDto,
  CreateTimeRecordDto,
  UpdateTimeRecordDto,
  ReviewOvertimeDto,
  CreateTimesheetDto,
  ApproveTimesheetDto,
  RejectTimesheetDto,
  CreateLeaveTypeDto,
  CreateLeavePolicyDto,
  AdjustLeaveBalanceDto,
  CreateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  CancelLeaveRequestDto,
  CreateHolidayDto,
} from './dto/workforce-time.dto.js';
import {
  WorkforceTimeNotFoundError,
  WorkforceTimeCrossTenantAccessError,
  WorkforceTimeScheduleCollisionError,
  WorkforceTimeOverlappingTimeRecordError,
  WorkforceTimeInvalidTimestampsError,
  WorkforceTimeMissingCheckoutError,
  WorkforceTimeInsufficientLeaveBalanceError,
  WorkforceTimeInvalidStateTransitionError,
} from '../domain/workforce-time.errors.js';
import { ConflictError } from '../../../shared/errors/index.js';

export class WorkforceTimeService {
  // ==========================================================================
  // Cross-Domain Validation & Security Helpers
  // ==========================================================================

  private static isUuid(id?: string | null): boolean {
    return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  }

  private static async resolveActor(
    organizationId: string,
    actor?: string | null,
    tx?: DbClient
  ): Promise<{ userId?: string; personId?: string }> {
    if (!actor || !this.isUuid(actor)) {
      return {};
    }
    const db = tx || getDbClient();
    try {
      const userRes = await db.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [actor]);
      if (userRes.rows.length > 0) {
        const pRes = await db.query<{ id: string }>('SELECT id FROM people WHERE organization_id = $1 AND user_id = $2', [organizationId, actor]);
        return { userId: actor, personId: pRes.rows[0]?.id };
      }
      const personRes = await db.query<{ id: string; user_id: string | null }>('SELECT id, user_id FROM people WHERE organization_id = $1 AND id = $2', [organizationId, actor]);
      if (personRes.rows.length > 0) {
        return { personId: personRes.rows[0].id, userId: personRes.rows[0].user_id || undefined };
      }
    } catch {
      // Ignore resolution failures
    }
    return {};
  }

  public static async verifyEmploymentInTenant(
    client: DbClient,
    organizationId: string,
    employmentId: string
  ): Promise<{ id: string; personId: string; organizationId: string; branchId: string | null; employmentType: string }> {
    const res = await client.query<any>(
      `SELECT id, person_id, organization_id, branch_id, employment_type FROM employments WHERE organization_id = $1 AND id = $2;`,
      [organizationId, employmentId]
    );
    if (res.rows.length === 0) {
      throw new WorkforceTimeCrossTenantAccessError(`Employment '${employmentId}' not found in organization`);
    }
    return {
      id: res.rows[0].id,
      personId: res.rows[0].person_id,
      organizationId: res.rows[0].organization_id,
      branchId: res.rows[0].branch_id,
      employmentType: res.rows[0].employment_type,
    };
  }

  public static async verifyPersonInTenant(
    client: DbClient,
    organizationId: string,
    personId: string
  ): Promise<{ id: string; organizationId: string }> {
    const res = await client.query<any>(
      `SELECT id, organization_id FROM people WHERE organization_id = $1 AND id = $2;`,
      [organizationId, personId]
    );
    if (res.rows.length === 0) {
      throw new WorkforceTimeCrossTenantAccessError(`Person '${personId}' not found in organization`);
    }
    return { id: res.rows[0].id, organizationId: res.rows[0].organization_id };
  }

  public static async verifyBranchInTenant(
    client: DbClient,
    organizationId: string,
    branchId: string
  ): Promise<void> {
    const res = await client.query<any>(
      `SELECT id FROM branches WHERE organization_id = $1 AND id = $2;`,
      [organizationId, branchId]
    );
    if (res.rows.length === 0) {
      throw new WorkforceTimeCrossTenantAccessError(`Branch '${branchId}' not found in organization`);
    }
  }

  // ==========================================================================
  // 1. WORKFORCE SCHEDULES & ASSIGNMENTS
  // ==========================================================================

  public static async createSchedule(
    organizationId: string,
    dto: CreateScheduleDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceSchedule> {
    const db = getDbClient();

    if (dto.branchId) {
      await this.verifyBranchInTenant(db, organizationId, dto.branchId);
    }

    const existingCode = await WorkforceTimeRepository.findScheduleByCode(db, organizationId, dto.code);
    if (existingCode) {
      throw new ConflictError(`Schedule with code '${dto.code}' already exists in organization`);
    }

    const txResult = await withTransaction(async (tx) => {
      const schedule = await WorkforceTimeRepository.createSchedule(
        tx,
        {
          organizationId,
          branchId: dto.branchId || null,
          name: dto.name,
          code: dto.code,
          description: dto.description || null,
          scheduleType: dto.scheduleType || 'fixed',
          timezone: dto.timezone || 'UTC',
          expectedWeeklyHours: dto.expectedWeeklyHours ?? 40.0,
          isDefault: dto.isDefault ?? false,
          isActive: true,
        },
        (dto.workingDays || []).map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isWorkingDay: d.isWorkingDay,
          startTime: d.startTime || null,
          endTime: d.endTime || null,
          breakDurationMinutes: d.breakDurationMinutes ?? 60,
          expectedHours: d.expectedHours ?? 8.0,
        }))
      );

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.schedule.created',
        entityType: 'WorkforceSchedule',
        entityId: schedule.id,
        afterState: schedule as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'workforce.schedule.created',
        entityType: 'WorkforceSchedule',
        entityId: schedule.id,
        payload: { scheduleId: schedule.id, code: schedule.code, name: schedule.name },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { schedule, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.schedule;
  }

  public static async updateSchedule(
    organizationId: string,
    id: string,
    dto: UpdateScheduleDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceSchedule> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findScheduleById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Schedule '${id}' not found in organization`);
    }

    if (dto.branchId) {
      await this.verifyBranchInTenant(db, organizationId, dto.branchId);
    }

    const txResult = await withTransaction(async (tx) => {
      const updated = await WorkforceTimeRepository.updateSchedule(
        tx,
        organizationId,
        id,
        {
          name: dto.name,
          description: dto.description,
          branchId: dto.branchId,
          scheduleType: dto.scheduleType,
          timezone: dto.timezone,
          expectedWeeklyHours: dto.expectedWeeklyHours,
          isDefault: dto.isDefault,
          isActive: dto.isActive,
        },
        dto.workingDays
          ? dto.workingDays.map((d) => ({
              dayOfWeek: d.dayOfWeek,
              isWorkingDay: d.isWorkingDay,
              startTime: d.startTime || null,
              endTime: d.endTime || null,
              breakDurationMinutes: d.breakDurationMinutes ?? 60,
              expectedHours: d.expectedHours ?? 8.0,
            }))
          : undefined
      );

      if (!updated) {
        throw new WorkforceTimeNotFoundError(`Schedule '${id}' not found in organization`);
      }

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.schedule.updated',
        entityType: 'WorkforceSchedule',
        entityId: updated.id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'workforce.schedule.updated',
        entityType: 'WorkforceSchedule',
        entityId: updated.id,
        payload: { scheduleId: updated.id, name: updated.name },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { schedule: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.schedule;
  }

  public static async getSchedule(organizationId: string, id: string): Promise<WorkforceSchedule> {
    const db = getDbClient();
    const schedule = await WorkforceTimeRepository.findScheduleById(db, organizationId, id);
    if (!schedule) {
      throw new WorkforceTimeNotFoundError(`Schedule '${id}' not found in organization`);
    }
    return schedule;
  }

  public static async listSchedules(
    organizationId: string,
    filters: { branchId?: string | null; isActive?: boolean } = {}
  ): Promise<WorkforceSchedule[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listSchedules(db, organizationId, filters);
  }

  public static async assignSchedule(
    organizationId: string,
    dto: AssignScheduleDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceScheduleAssignment> {
    const db = getDbClient();

    // Strict Tenant Validation
    await this.verifyEmploymentInTenant(db, organizationId, dto.employmentId);
    await this.verifyPersonInTenant(db, organizationId, dto.personId);
    const schedule = await WorkforceTimeRepository.findScheduleById(db, organizationId, dto.scheduleId);
    if (!schedule) {
      throw new WorkforceTimeNotFoundError(`Schedule '${dto.scheduleId}' not found in organization`);
    }

    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) {
      throw new WorkforceTimeInvalidTimestampsError('effectiveTo must be on or after effectiveFrom');
    }

    // Check Schedule Assignment Collision
    const hasCollision = await WorkforceTimeRepository.checkScheduleAssignmentCollision(
      db,
      organizationId,
      dto.employmentId,
      dto.effectiveFrom,
      dto.effectiveTo || null
    );
    if (hasCollision) {
      throw new WorkforceTimeScheduleCollisionError(
        `Active schedule assignment already exists for employment '${dto.employmentId}' in specified date range`
      );
    }

    const txResult = await withTransaction(async (tx) => {
      const assignment = await WorkforceTimeRepository.assignSchedule(tx, {
        organizationId,
        employmentId: dto.employmentId,
        personId: dto.personId,
        scheduleId: dto.scheduleId,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo || null,
        status: 'active',
        notes: dto.notes || null,
      });

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.schedule_assignment.created',
        entityType: 'WorkforceScheduleAssignment',
        entityId: assignment.id,
        afterState: assignment as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'workforce.schedule_assignment.created',
        entityType: 'WorkforceScheduleAssignment',
        entityId: assignment.id,
        payload: {
          assignmentId: assignment.id,
          employmentId: assignment.employmentId,
          scheduleId: assignment.scheduleId,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { assignment, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.assignment;
  }

  public static async listScheduleAssignments(
    organizationId: string,
    employmentId: string,
    status?: string
  ): Promise<WorkforceScheduleAssignment[]> {
    const db = getDbClient();
    await this.verifyEmploymentInTenant(db, organizationId, employmentId);
    return WorkforceTimeRepository.findScheduleAssignments(db, organizationId, employmentId, status);
  }

  // ==========================================================================
  // 2. HOLIDAYS
  // ==========================================================================

  public static async createHoliday(
    organizationId: string,
    dto: CreateHolidayDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceHoliday> {
    const db = getDbClient();

    if (dto.branchId) {
      await this.verifyBranchInTenant(db, organizationId, dto.branchId);
    }

    const txResult = await withTransaction(async (tx) => {
      const holiday = await WorkforceTimeRepository.createHoliday(tx, {
        organizationId,
        branchId: dto.branchId || null,
        holidayDate: dto.holidayDate,
        name: dto.name,
        description: dto.description || null,
        holidayType: dto.holidayType || 'public',
        isHalfDay: dto.isHalfDay ?? false,
        isOptional: dto.isOptional ?? false,
      });

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'holiday.created',
        entityType: 'WorkforceHoliday',
        entityId: holiday.id,
        afterState: holiday as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'holiday.created',
        entityType: 'WorkforceHoliday',
        entityId: holiday.id,
        payload: { holidayId: holiday.id, name: holiday.name, holidayDate: holiday.holidayDate },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { holiday, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.holiday;
  }

  public static async deleteHoliday(
    organizationId: string,
    id: string,
    actorId?: string,
    requestId?: string
  ): Promise<boolean> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findHolidayById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Holiday '${id}' not found in organization`);
    }

    return withTransaction(async (tx) => {
      const deleted = await WorkforceTimeRepository.deleteHoliday(tx, organizationId, id);
      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'holiday.deleted',
        entityType: 'WorkforceHoliday',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });
      return deleted;
    });
  }

  public static async listHolidays(
    organizationId: string,
    filters: { startDate?: string; endDate?: string; branchId?: string | null } = {}
  ): Promise<WorkforceHoliday[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listHolidays(db, organizationId, filters);
  }

  // ==========================================================================
  // 3. ATTENDANCE & MULTI-SESSION TRACKING
  // ==========================================================================

  public static async checkIn(
    organizationId: string,
    dto: CheckInDto,
    actorId?: string,
    requestId?: string
  ): Promise<{ attendanceRecord: AttendanceRecord; session: AttendanceSession }> {
    const db = getDbClient();

    // Strict Tenant Validation
    await this.verifyEmploymentInTenant(db, organizationId, dto.employmentId);
    await this.verifyPersonInTenant(db, organizationId, dto.personId);

    const checkInTime = dto.checkInAt ? new Date(dto.checkInAt) : new Date();
    const attendanceDate = checkInTime.toISOString().split('T')[0];

    const txResult = await withTransaction(async (tx) => {
      // 1. Get or create daily attendance record
      let record = await WorkforceTimeRepository.findAttendanceRecordByDate(
        tx,
        organizationId,
        dto.employmentId,
        attendanceDate
      );

      if (!record) {
        // Evaluate default status on calendar date
        let initialStatus: AttendanceRecord['status'] = 'present';
        const approvedLeave = await WorkforceTimeRepository.findApprovedLeaveDays(
          tx,
          organizationId,
          dto.employmentId,
          attendanceDate,
          attendanceDate
        );
        if (approvedLeave.length > 0) {
          initialStatus = 'leave';
        }

        record = await WorkforceTimeRepository.createAttendanceRecord(tx, {
          organizationId,
          employmentId: dto.employmentId,
          personId: dto.personId,
          attendanceDate,
          status: dto.isWfh ? 'wfh' : initialStatus,
          totalPresenceMinutes: 0,
          totalBreakMinutes: 0,
          totalWorkMinutes: 0,
          isPunctual: true,
          hasMissingCheckout: true,
          hasCorrection: false,
          notes: null,
        });
      }

      // 2. Check for open session without checkout
      const openSession = await WorkforceTimeRepository.findOpenAttendanceSession(tx, organizationId, record.id);
      if (openSession) {
        throw new WorkforceTimeMissingCheckoutError(
          `Cannot check in: an active session '${openSession.id}' is already open without checkout for date '${attendanceDate}'`
        );
      }

      // 3. Create new attendance session
      const session = await WorkforceTimeRepository.createAttendanceSession(tx, {
        organizationId,
        attendanceRecordId: record.id,
        checkInAt: checkInTime,
        checkOutAt: null,
        durationMinutes: null,
        checkInIp: dto.checkInIp || null,
        checkOutIp: null,
        deviceMetadata: dto.deviceMetadata || {},
        isManualEntry: false,
      });

      // 4. Update attendance record flags
      const updatedRecord = await WorkforceTimeRepository.updateAttendanceRecord(tx, organizationId, record.id, {
        hasMissingCheckout: true,
        status: dto.isWfh ? 'wfh' : 'present',
      });

      const actor = await this.resolveActor(organizationId, actorId || dto.personId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'attendance.session.checkin',
        entityType: 'AttendanceSession',
        entityId: session.id,
        afterState: session as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'attendance.session.checkin',
        entityType: 'AttendanceSession',
        entityId: session.id,
        payload: {
          sessionId: session.id,
          attendanceRecordId: record.id,
          employmentId: dto.employmentId,
          checkInAt: session.checkInAt.toISOString(),
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { attendanceRecord: updatedRecord || record, session, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return { attendanceRecord: txResult.attendanceRecord, session: txResult.session };
  }

  public static async checkOut(
    organizationId: string,
    dto: CheckOutDto,
    actorId?: string,
    requestId?: string
  ): Promise<{ attendanceRecord: AttendanceRecord; session: AttendanceSession }> {
    const db = getDbClient();

    // Strict Tenant Validation
    await this.verifyEmploymentInTenant(db, organizationId, dto.employmentId);
    await this.verifyPersonInTenant(db, organizationId, dto.personId);

    const checkOutTime = dto.checkOutAt ? new Date(dto.checkOutAt) : new Date();
    const attendanceDate = checkOutTime.toISOString().split('T')[0];

    const txResult = await withTransaction(async (tx) => {
      // Find today's record or latest active record with missing checkout
      let record = await WorkforceTimeRepository.findAttendanceRecordByDate(
        tx,
        organizationId,
        dto.employmentId,
        attendanceDate
      );

      if (!record) {
        // Check previous day if clocking out after midnight
        const prevRecords = await WorkforceTimeRepository.listAttendanceRecords(tx, organizationId, {
          employmentId: dto.employmentId,
        });
        const openPrev = prevRecords.find((r) => r.hasMissingCheckout);
        if (openPrev) {
          record = openPrev;
        } else {
          throw new WorkforceTimeNotFoundError(`No active attendance record found to clock out`);
        }
      }

      const openSession = await WorkforceTimeRepository.findOpenAttendanceSession(tx, organizationId, record.id);
      if (!openSession) {
        throw new WorkforceTimeNotFoundError(`No open session found to clock out for employment '${dto.employmentId}'`);
      }

      if (checkOutTime < openSession.checkInAt) {
        throw new WorkforceTimeInvalidTimestampsError('checkOutAt must be on or after checkInAt');
      }

      const sessionDuration = Math.max(
        0,
        Math.round((checkOutTime.getTime() - openSession.checkInAt.getTime()) / 60000)
      );

      // Close session
      const closedSession = await WorkforceTimeRepository.updateAttendanceSession(
        tx,
        organizationId,
        openSession.id,
        {
          checkOutAt: checkOutTime,
          durationMinutes: sessionDuration,
          checkOutIp: dto.checkOutIp || null,
        }
      );

      // Recalculate daily totals
      const allSessions = await WorkforceTimeRepository.findAttendanceSessions(tx, organizationId, record.id);
      let totalPresence = 0;
      let hasOtherOpen = false;

      for (const s of allSessions) {
        if (s.id === openSession.id) {
          totalPresence += sessionDuration;
        } else if (s.checkOutAt && s.durationMinutes) {
          totalPresence += s.durationMinutes;
        } else if (!s.checkOutAt) {
          hasOtherOpen = true;
        }
      }

      const totalWork = Math.max(0, totalPresence - record.totalBreakMinutes);
      const isPartial = totalWork > 0 && totalWork < 240; // < 4 hours is partial
      const finalStatus = record.status === 'wfh' ? 'wfh' : (isPartial ? 'partial' : 'present');

      const updatedRecord = await WorkforceTimeRepository.updateAttendanceRecord(tx, organizationId, record.id, {
        totalPresenceMinutes: totalPresence,
        totalWorkMinutes: totalWork,
        hasMissingCheckout: hasOtherOpen,
        status: finalStatus,
      });

      const actor = await this.resolveActor(organizationId, actorId || dto.personId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'attendance.session.checkout',
        entityType: 'AttendanceSession',
        entityId: openSession.id,
        beforeState: openSession as unknown as Record<string, unknown>,
        afterState: closedSession as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'attendance.session.checkout',
        entityType: 'AttendanceSession',
        entityId: openSession.id,
        payload: {
          sessionId: openSession.id,
          attendanceRecordId: record.id,
          checkOutAt: checkOutTime.toISOString(),
          durationMinutes: sessionDuration,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { attendanceRecord: updatedRecord || record, session: closedSession || openSession, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return { attendanceRecord: txResult.attendanceRecord, session: txResult.session };
  }

  public static async requestCorrection(
    organizationId: string,
    attendanceRecordId: string,
    dto: RequestCorrectionDto,
    userId: string,
    requestId?: string
  ): Promise<AttendanceCorrection> {
    const db = getDbClient();
    const record = await WorkforceTimeRepository.findAttendanceRecordById(db, organizationId, attendanceRecordId);
    if (!record) {
      throw new WorkforceTimeNotFoundError(`Attendance record '${attendanceRecordId}' not found in organization`);
    }

    const correctedCheckIn = new Date(dto.correctedCheckInAt);
    const correctedCheckOut = new Date(dto.correctedCheckOutAt);
    if (correctedCheckOut < correctedCheckIn) {
      throw new WorkforceTimeInvalidTimestampsError('correctedCheckOutAt must be on or after correctedCheckInAt');
    }

    let originalCheckIn: Date | null = null;
    let originalCheckOut: Date | null = null;
    if (dto.attendanceSessionId) {
      const session = await WorkforceTimeRepository.findAttendanceSessionById(db, organizationId, dto.attendanceSessionId);
      if (session) {
        originalCheckIn = session.checkInAt;
        originalCheckOut = session.checkOutAt;
      }
    }

    const txResult = await withTransaction(async (tx) => {
      const correction = await WorkforceTimeRepository.createAttendanceCorrection(tx, {
        organizationId,
        attendanceRecordId,
        attendanceSessionId: dto.attendanceSessionId || null,
        originalCheckInAt: originalCheckIn,
        originalCheckOutAt: originalCheckOut,
        correctedCheckInAt: correctedCheckIn,
        correctedCheckOutAt: correctedCheckOut,
        status: 'pending',
        reason: dto.reason,
        requestedByUserId: userId,
      });

      await WorkforceTimeRepository.updateAttendanceRecord(tx, organizationId, attendanceRecordId, {
        hasCorrection: true,
      });

      const actor = await this.resolveActor(organizationId, userId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'attendance.correction.requested',
        entityType: 'AttendanceCorrection',
        entityId: correction.id,
        afterState: correction as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'attendance.correction.requested',
        entityType: 'AttendanceCorrection',
        entityId: correction.id,
        payload: {
          correctionId: correction.id,
          attendanceRecordId,
          requestedByUserId: userId,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { correction, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.correction;
  }

  public static async reviewCorrection(
    organizationId: string,
    correctionId: string,
    dto: ReviewCorrectionDto,
    actorId?: string,
    requestId?: string
  ): Promise<AttendanceCorrection> {
    const db = getDbClient();
    const correction = await WorkforceTimeRepository.findAttendanceCorrectionById(db, organizationId, correctionId);
    if (!correction) {
      throw new WorkforceTimeNotFoundError(`Attendance correction '${correctionId}' not found in organization`);
    }

    if (correction.status !== 'pending') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Attendance correction '${correctionId}' is in '${correction.status}' status and cannot be reviewed`
      );
    }

    const txResult = await withTransaction(async (tx) => {
      const isApproved = dto.action === 'approve';
      const reviewedAt = new Date();
      const actor = await this.resolveActor(organizationId, actorId || dto.reviewedByPersonId, tx);

      const updated = await WorkforceTimeRepository.updateAttendanceCorrection(tx, organizationId, correctionId, {
        status: isApproved ? 'approved' : 'rejected',
        reviewedByPersonId: actor.personId || dto.reviewedByPersonId || null,
        reviewedAt,
        reviewNotes: dto.reviewNotes || null,
      });

      if (isApproved) {
        // Apply correction to attendance session or create corrected session
        const sessionDuration = Math.max(
          0,
          Math.round((correction.correctedCheckOutAt.getTime() - correction.correctedCheckInAt.getTime()) / 60000)
        );

        if (correction.attendanceSessionId) {
          await WorkforceTimeRepository.updateAttendanceSession(tx, organizationId, correction.attendanceSessionId, {
            checkInAt: correction.correctedCheckInAt,
            checkOutAt: correction.correctedCheckOutAt,
            durationMinutes: sessionDuration,
          });
        } else {
          await WorkforceTimeRepository.createAttendanceSession(tx, {
            organizationId,
            attendanceRecordId: correction.attendanceRecordId,
            checkInAt: correction.correctedCheckInAt,
            checkOutAt: correction.correctedCheckOutAt,
            durationMinutes: sessionDuration,
            checkInIp: null,
            checkOutIp: null,
            deviceMetadata: { correctionId: correction.id },
            isManualEntry: true,
          });
        }

        // Recalculate record totals
        const allSessions = await WorkforceTimeRepository.findAttendanceSessions(tx, organizationId, correction.attendanceRecordId);
        const totalPresence = allSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        const record = await WorkforceTimeRepository.findAttendanceRecordById(tx, organizationId, correction.attendanceRecordId);
        const totalBreak = record?.totalBreakMinutes || 0;
        const totalWork = Math.max(0, totalPresence - totalBreak);

        await WorkforceTimeRepository.updateAttendanceRecord(tx, organizationId, correction.attendanceRecordId, {
          totalPresenceMinutes: totalPresence,
          totalWorkMinutes: totalWork,
          hasMissingCheckout: false,
          status: totalWork > 0 && totalWork < 240 ? 'partial' : 'present',
        });
      }

      const eventName = isApproved ? 'attendance.correction.approved' : 'attendance.correction.rejected';
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: eventName,
        entityType: 'AttendanceCorrection',
        entityId: correctionId,
        beforeState: correction as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName,
        entityType: 'AttendanceCorrection',
        entityId: correctionId,
        payload: {
          correctionId,
          attendanceRecordId: correction.attendanceRecordId,
          status: updated?.status,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { correction: updated || correction, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.correction;
  }

  public static async getAttendanceRecord(organizationId: string, id: string): Promise<AttendanceRecord> {
    const db = getDbClient();
    const record = await WorkforceTimeRepository.findAttendanceRecordById(db, organizationId, id);
    if (!record) {
      throw new WorkforceTimeNotFoundError(`Attendance record '${id}' not found in organization`);
    }
    return record;
  }

  public static async listAttendanceRecords(
    organizationId: string,
    filters: {
      employmentId?: string;
      personId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    } = {}
  ): Promise<AttendanceRecord[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listAttendanceRecords(db, organizationId, filters);
  }

  // ==========================================================================
  // 4. WORKFORCE TIME RECORDS
  // ==========================================================================

  public static async createTimeRecord(
    organizationId: string,
    dto: CreateTimeRecordDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimeRecord> {
    const db = getDbClient();

    // Strict Tenant Validation
    await this.verifyEmploymentInTenant(db, organizationId, dto.employmentId);
    await this.verifyPersonInTenant(db, organizationId, dto.personId);

    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    if (endedAt <= startedAt) {
      throw new WorkforceTimeInvalidTimestampsError('endedAt must be greater than startedAt');
    }

    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    if (durationMinutes <= 0) {
      throw new WorkforceTimeInvalidTimestampsError('durationMinutes must be greater than 0');
    }

    if (dto.timeType === 'regular') {
      const hasOverlap = await WorkforceTimeRepository.checkOverlappingRegularTime(
        db,
        organizationId,
        dto.employmentId,
        startedAt,
        endedAt
      );
      if (hasOverlap) {
        throw new WorkforceTimeOverlappingTimeRecordError(
          `Regular time record overlaps with an existing time record for employment '${dto.employmentId}'`
        );
      }
    }

    const txResult = await withTransaction(async (tx) => {
      const record = await WorkforceTimeRepository.createTimeRecord(tx, {
        organizationId,
        employmentId: dto.employmentId,
        personId: dto.personId,
        attendanceRecordId: dto.attendanceRecordId || null,
        attendanceSessionId: dto.attendanceSessionId || null,
        timeType: dto.timeType,
        startedAt,
        endedAt,
        durationMinutes,
        isOvertime: dto.isOvertime ?? false,
        overtimeStatus: dto.isOvertime ? 'pending' : 'none',
        description: dto.description || null,
      });

      // If explicit break recorded, update daily attendance break total if attendanceRecordId present
      if (dto.timeType === 'break' && dto.attendanceRecordId) {
        const att = await WorkforceTimeRepository.findAttendanceRecordById(tx, organizationId, dto.attendanceRecordId);
        if (att) {
          const newBreak = att.totalBreakMinutes + durationMinutes;
          const newWork = Math.max(0, att.totalPresenceMinutes - newBreak);
          await WorkforceTimeRepository.updateAttendanceRecord(tx, organizationId, att.id, {
            totalBreakMinutes: newBreak,
            totalWorkMinutes: newWork,
          });
        }
      }

      const actor = await this.resolveActor(organizationId, actorId || dto.personId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.time.started',
        entityType: 'WorkforceTimeRecord',
        entityId: record.id,
        afterState: record as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'workforce.time.completed',
        entityType: 'WorkforceTimeRecord',
        entityId: record.id,
        payload: {
          timeRecordId: record.id,
          employmentId: record.employmentId,
          timeType: record.timeType,
          durationMinutes: record.durationMinutes,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { record, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.record;
  }

  public static async updateTimeRecord(
    organizationId: string,
    id: string,
    dto: UpdateTimeRecordDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimeRecord> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findTimeRecordById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Time record '${id}' not found in organization`);
    }

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : existing.startedAt;
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : existing.endedAt;
    if (endedAt <= startedAt) {
      throw new WorkforceTimeInvalidTimestampsError('endedAt must be greater than startedAt');
    }
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    const txResult = await withTransaction(async (tx) => {
      const updated = await WorkforceTimeRepository.updateTimeRecord(tx, organizationId, id, {
        timeType: dto.timeType,
        startedAt,
        endedAt,
        durationMinutes,
        description: dto.description,
      });

      if (!updated) {
        throw new WorkforceTimeNotFoundError(`Time record '${id}' not found in organization`);
      }

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.time.updated',
        entityType: 'WorkforceTimeRecord',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'workforce.time.updated',
        entityType: 'WorkforceTimeRecord',
        entityId: id,
        payload: { timeRecordId: id, durationMinutes },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { record: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.record;
  }

  public static async reviewOvertime(
    organizationId: string,
    id: string,
    dto: ReviewOvertimeDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimeRecord> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findTimeRecordById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Time record '${id}' not found in organization`);
    }

    if (!existing.isOvertime) {
      throw new WorkforceTimeInvalidStateTransitionError(`Time record '${id}' is not marked as overtime`);
    }

    const txResult = await withTransaction(async (tx) => {
      const actor = await this.resolveActor(organizationId, actorId || dto.reviewedByPersonId, tx);
      const isApproved = dto.action === 'approve';

      const updated = await WorkforceTimeRepository.updateTimeRecord(tx, organizationId, id, {
        overtimeStatus: isApproved ? 'approved' : 'rejected',
        overtimeApprovedByPersonId: actor.personId || dto.reviewedByPersonId || null,
      });

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: isApproved ? 'workforce.time.overtime_approved' : 'workforce.time.overtime_rejected',
        entityType: 'WorkforceTimeRecord',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      return { record: updated || existing, outbox: null };
    });

    return txResult.record;
  }

  public static async getTimeRecord(organizationId: string, id: string): Promise<WorkforceTimeRecord> {
    const db = getDbClient();
    const record = await WorkforceTimeRepository.findTimeRecordById(db, organizationId, id);
    if (!record) {
      throw new WorkforceTimeNotFoundError(`Time record '${id}' not found in organization`);
    }
    return record;
  }

  public static async listTimeRecords(
    organizationId: string,
    filters: {
      employmentId?: string;
      personId?: string;
      startDate?: string;
      endDate?: string;
      timeType?: string;
      isOvertime?: boolean;
      overtimeStatus?: string;
    } = {}
  ): Promise<WorkforceTimeRecord[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listTimeRecords(db, organizationId, filters);
  }

  // ==========================================================================
  // 5. TIMESHEETS
  // ==========================================================================

  public static async createTimesheet(
    organizationId: string,
    dto: CreateTimesheetDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimesheet> {
    const db = getDbClient();

    // Strict Tenant Validation
    await this.verifyEmploymentInTenant(db, organizationId, dto.employmentId);
    await this.verifyPersonInTenant(db, organizationId, dto.personId);

    if (dto.periodEndDate < dto.periodStartDate) {
      throw new WorkforceTimeInvalidTimestampsError('periodEndDate must be on or after periodStartDate');
    }

    const existing = await WorkforceTimeRepository.findTimesheetByPeriod(
      db,
      organizationId,
      dto.employmentId,
      dto.periodStartDate,
      dto.periodEndDate
    );
    if (existing) {
      throw new ConflictError(
        `Timesheet already exists for employment '${dto.employmentId}' in period ${dto.periodStartDate} to ${dto.periodEndDate}`
      );
    }

    // Query time records in period to aggregate hours and entries
    const timeRecords = await WorkforceTimeRepository.listTimeRecords(db, organizationId, {
      employmentId: dto.employmentId,
      startDate: dto.periodStartDate,
      endDate: dto.periodEndDate + 'T23:59:59.999Z',
    });

    let totalRegHours = 0;
    let totalBreakHours = 0;
    let totalOtHours = 0;

    const entries = timeRecords.map((tr) => {
      const hrs = Number((tr.durationMinutes / 60.0).toFixed(2));
      if (tr.timeType === 'break') {
        totalBreakHours += hrs;
      } else if (tr.isOvertime && tr.overtimeStatus === 'approved') {
        totalOtHours += hrs;
      } else {
        totalRegHours += hrs;
      }

      return {
        timeRecordId: tr.id,
        entryDate: tr.startedAt.toISOString().split('T')[0],
        timeType: tr.timeType,
        durationMinutes: tr.durationMinutes,
        hours: hrs,
        notes: tr.description,
      };
    });

    const totalBillable = totalRegHours + totalOtHours;

    const txResult = await withTransaction(async (tx) => {
      const timesheet = await WorkforceTimeRepository.createTimesheet(
        tx,
        {
          organizationId,
          employmentId: dto.employmentId,
          personId: dto.personId,
          periodStartDate: dto.periodStartDate,
          periodEndDate: dto.periodEndDate,
          status: 'draft',
          totalRegularHours: Number(totalRegHours.toFixed(2)),
          totalBreakHours: Number(totalBreakHours.toFixed(2)),
          totalOvertimeHours: Number(totalOtHours.toFixed(2)),
          totalBillableHours: Number(totalBillable.toFixed(2)),
          submittedAt: null,
          approvedByPersonId: null,
          approvedAt: null,
          rejectionReason: null,
          notes: dto.notes || null,
        },
        entries
      );

      const actor = await this.resolveActor(organizationId, actorId || dto.personId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'timesheet.created',
        entityType: 'WorkforceTimesheet',
        entityId: timesheet.id,
        afterState: timesheet as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'timesheet.created',
        entityType: 'WorkforceTimesheet',
        entityId: timesheet.id,
        payload: {
          timesheetId: timesheet.id,
          employmentId: timesheet.employmentId,
          periodStartDate: timesheet.periodStartDate,
          periodEndDate: timesheet.periodEndDate,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { timesheet, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.timesheet;
  }

  public static async submitTimesheet(
    organizationId: string,
    id: string,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimesheet> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findTimesheetById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
    }

    if (existing.status === 'approved') {
      throw new WorkforceTimeInvalidStateTransitionError("Cannot submit timesheet in 'approved' status");
    }

    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Timesheet '${id}' in '${existing.status}' status cannot be submitted`
      );
    }

    const txResult = await withTransaction(async (tx) => {
      const submittedAt = new Date();
      const updated = await WorkforceTimeRepository.updateTimesheet(tx, organizationId, id, {
        status: 'submitted',
        submittedAt,
      });

      if (!updated) {
        throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
      }

      const actor = await this.resolveActor(organizationId, actorId || existing.personId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'timesheet.submitted',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'timesheet.submitted',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        payload: { timesheetId: id, employmentId: existing.employmentId },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { timesheet: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.timesheet;
  }

  public static async approveTimesheet(
    organizationId: string,
    id: string,
    dto: ApproveTimesheetDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimesheet> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findTimesheetById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
    }

    if (existing.status !== 'submitted') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Timesheet '${id}' in '${existing.status}' status cannot be approved. Must be in 'submitted' status.`
      );
    }

    const txResult = await withTransaction(async (tx) => {
      const approvedAt = new Date();
      const actor = await this.resolveActor(organizationId, actorId || dto.approvedByPersonId, tx);

      const updated = await WorkforceTimeRepository.updateTimesheet(tx, organizationId, id, {
        status: 'approved',
        approvedByPersonId: actor.personId || dto.approvedByPersonId || null,
        approvedAt,
        notes: dto.notes ? (existing.notes ? `${existing.notes}; ${dto.notes}` : dto.notes) : existing.notes,
      });

      if (!updated) {
        throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
      }

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'timesheet.approved',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'timesheet.approved',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        payload: {
          timesheetId: id,
          employmentId: existing.employmentId,
          totalBillableHours: existing.totalBillableHours,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { timesheet: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.timesheet;
  }

  public static async rejectTimesheet(
    organizationId: string,
    id: string,
    dto: RejectTimesheetDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimesheet> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findTimesheetById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
    }

    if (existing.status !== 'submitted') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Timesheet '${id}' in '${existing.status}' status cannot be rejected. Must be in 'submitted' status.`
      );
    }

    const txResult = await withTransaction(async (tx) => {
      const actor = await this.resolveActor(organizationId, actorId, tx);
      const updated = await WorkforceTimeRepository.updateTimesheet(tx, organizationId, id, {
        status: 'rejected',
        rejectionReason: dto.rejectionReason,
      });

      if (!updated) {
        throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
      }

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'timesheet.rejected',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'timesheet.rejected',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        payload: { timesheetId: id, rejectionReason: dto.rejectionReason },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { timesheet: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.timesheet;
  }

  public static async cancelTimesheet(
    organizationId: string,
    id: string,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTimesheet> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findTimesheetById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
    }

    if (existing.status !== 'draft') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Timesheet '${id}' in '${existing.status}' status cannot be cancelled. Only draft timesheets can be cancelled.`
      );
    }

    const txResult = await withTransaction(async (tx) => {
      const actor = await this.resolveActor(organizationId, actorId, tx);
      const updated = await WorkforceTimeRepository.updateTimesheet(tx, organizationId, id, {
        status: 'cancelled',
      });

      if (!updated) {
        throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
      }

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'timesheet.cancelled',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'timesheet.cancelled',
        entityType: 'WorkforceTimesheet',
        entityId: id,
        payload: { timesheetId: id },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { timesheet: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.timesheet;
  }

  public static async getTimesheet(organizationId: string, id: string): Promise<WorkforceTimesheet> {
    const db = getDbClient();
    const timesheet = await WorkforceTimeRepository.findTimesheetById(db, organizationId, id);
    if (!timesheet) {
      throw new WorkforceTimeNotFoundError(`Timesheet '${id}' not found in organization`);
    }
    return timesheet;
  }

  public static async listTimesheets(
    organizationId: string,
    filters: {
      employmentId?: string;
      personId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<WorkforceTimesheet[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listTimesheets(db, organizationId, filters);
  }

  // ==========================================================================
  // 6. LEAVE ENGINE & BALANCES
  // ==========================================================================

  public static async createLeaveType(
    organizationId: string,
    dto: CreateLeaveTypeDto,
    actorId?: string,
    requestId?: string
  ): Promise<LeaveType> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findLeaveTypeByCode(db, organizationId, dto.code);
    if (existing) {
      throw new ConflictError(`Leave type with code '${dto.code}' already exists in organization`);
    }

    const txResult = await withTransaction(async (tx) => {
      const leaveType = await WorkforceTimeRepository.createLeaveType(tx, {
        organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description || null,
        isPaid: dto.isPaid ?? true,
        requiresApproval: dto.requiresApproval ?? true,
        requiresDocumentation: dto.requiresDocumentation ?? false,
        allowNegativeBalance: dto.allowNegativeBalance ?? false,
        isActive: true,
      });

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'leave.type.created',
        entityType: 'LeaveType',
        entityId: leaveType.id,
        afterState: leaveType as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'leave.type.created',
        entityType: 'LeaveType',
        entityId: leaveType.id,
        payload: { leaveTypeId: leaveType.id, code: leaveType.code, name: leaveType.name },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { leaveType, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.leaveType;
  }

  public static async listLeaveTypes(organizationId: string, isActiveOnly = false): Promise<LeaveType[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listLeaveTypes(db, organizationId, isActiveOnly);
  }

  public static async createLeavePolicy(
    organizationId: string,
    dto: CreateLeavePolicyDto,
    actorId?: string,
    requestId?: string
  ): Promise<LeavePolicy> {
    const db = getDbClient();
    const leaveType = await WorkforceTimeRepository.findLeaveTypeById(db, organizationId, dto.leaveTypeId);
    if (!leaveType) {
      throw new WorkforceTimeNotFoundError(`Leave type '${dto.leaveTypeId}' not found in organization`);
    }

    const txResult = await withTransaction(async (tx) => {
      const policy = await WorkforceTimeRepository.createLeavePolicy(tx, {
        organizationId,
        leaveTypeId: dto.leaveTypeId,
        name: dto.name,
        employmentType: dto.employmentType,
        accrualFrequency: dto.accrualFrequency || 'annual',
        annualAllowanceDays: dto.annualAllowanceDays,
        maxCarryForwardDays: dto.maxCarryForwardDays ?? 0,
        minServiceDaysRequired: dto.minServiceDaysRequired ?? 0,
        isActive: true,
      });

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'leave.policy.created',
        entityType: 'LeavePolicy',
        entityId: policy.id,
        afterState: policy as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'leave.policy.created',
        entityType: 'LeavePolicy',
        entityId: policy.id,
        payload: { policyId: policy.id, name: policy.name },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { policy, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.policy;
  }

  public static async listLeavePolicies(organizationId: string, leaveTypeId?: string): Promise<LeavePolicy[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listLeavePolicies(db, organizationId, leaveTypeId);
  }

  public static async adjustLeaveBalance(
    organizationId: string,
    dto: AdjustLeaveBalanceDto,
    actorId?: string,
    requestId?: string
  ): Promise<LeaveBalance> {
    const db = getDbClient();

    // Strict Tenant Validation
    await this.verifyEmploymentInTenant(db, organizationId, dto.employmentId);
    await this.verifyPersonInTenant(db, organizationId, dto.personId);
    const leaveType = await WorkforceTimeRepository.findLeaveTypeById(db, organizationId, dto.leaveTypeId);
    if (!leaveType) {
      throw new WorkforceTimeNotFoundError(`Leave type '${dto.leaveTypeId}' not found in organization`);
    }

    const txResult = await withTransaction(async (tx) => {
      let balance = await WorkforceTimeRepository.findLeaveBalance(
        tx,
        organizationId,
        dto.employmentId,
        dto.leaveTypeId,
        dto.year
      );

      if (!balance) {
        balance = await WorkforceTimeRepository.createLeaveBalance(tx, {
          organizationId,
          employmentId: dto.employmentId,
          personId: dto.personId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
          openingBalance: 0,
          accruedBalance: 0,
          adjustedBalance: dto.adjustmentDays,
          usedBalance: 0,
          reservedBalance: 0,
          availableBalance: dto.adjustmentDays,
        });
      } else {
        const newAdjusted = balance.adjustedBalance + dto.adjustmentDays;
        const newAvailable = balance.availableBalance + dto.adjustmentDays;

        balance = (await WorkforceTimeRepository.updateLeaveBalance(tx, organizationId, balance.id, {
          adjustedBalance: newAdjusted,
          availableBalance: newAvailable,
        })) || balance;
      }

      const actor = await this.resolveActor(organizationId, actorId, tx);
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'leave.balance.updated',
        entityType: 'LeaveBalance',
        entityId: balance.id,
        afterState: balance as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'leave.balance.updated',
        entityType: 'LeaveBalance',
        entityId: balance.id,
        payload: {
          balanceId: balance.id,
          employmentId: balance.employmentId,
          availableBalance: balance.availableBalance,
          reason: dto.reason,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { balance, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.balance;
  }

  public static async listLeaveBalances(
    organizationId: string,
    employmentId: string,
    year?: number
  ): Promise<LeaveBalance[]> {
    const db = getDbClient();
    await this.verifyEmploymentInTenant(db, organizationId, employmentId);
    return WorkforceTimeRepository.listLeaveBalances(db, organizationId, employmentId, year);
  }

  public static async createLeaveRequest(
    organizationId: string,
    dto: CreateLeaveRequestDto,
    actorId?: string,
    requestId?: string
  ): Promise<LeaveRequest> {
    const db = getDbClient();

    // Strict Tenant Validation
    const emp = await this.verifyEmploymentInTenant(db, organizationId, dto.employmentId);
    await this.verifyPersonInTenant(db, organizationId, dto.personId);
    const leaveType = await WorkforceTimeRepository.findLeaveTypeById(db, organizationId, dto.leaveTypeId);
    if (!leaveType) {
      throw new WorkforceTimeNotFoundError(`Leave type '${dto.leaveTypeId}' not found in organization`);
    }

    if (dto.endDate < dto.startDate) {
      throw new WorkforceTimeInvalidTimestampsError('endDate must be on or after startDate');
    }
    if (dto.totalDays <= 0) {
      throw new WorkforceTimeInvalidTimestampsError('totalDays must be greater than 0');
    }

    // Check Overlapping Leave
    const hasOverlap = await WorkforceTimeRepository.checkOverlappingApprovedLeave(
      db,
      organizationId,
      dto.employmentId,
      dto.startDate,
      dto.endDate
    );
    if (hasOverlap) {
      throw new ConflictError(`Active or submitted leave request already exists for this date range`);
    }

    const year = parseInt(dto.startDate.split('-')[0], 10);

    const txResult = await withTransaction(async (tx) => {
      // Find or initialize leave balance for this year
      let balance = await WorkforceTimeRepository.findLeaveBalance(
        tx,
        organizationId,
        dto.employmentId,
        dto.leaveTypeId,
        year
      );

      if (!balance) {
        // Look up policy for employment type
        const policy = await WorkforceTimeRepository.findLeavePolicy(
          tx,
          organizationId,
          dto.leaveTypeId,
          emp.employmentType
        );
        const allowance = policy?.annualAllowanceDays ?? 0;

        balance = await WorkforceTimeRepository.createLeaveBalance(tx, {
          organizationId,
          employmentId: dto.employmentId,
          personId: dto.personId,
          leaveTypeId: dto.leaveTypeId,
          year,
          openingBalance: allowance,
          accruedBalance: 0,
          adjustedBalance: 0,
          usedBalance: 0,
          reservedBalance: 0,
          availableBalance: allowance,
        });
      }

      const isSubmitting = Boolean(dto.autoSubmit);
      if (isSubmitting) {
        if (balance.availableBalance < dto.totalDays && !leaveType.allowNegativeBalance) {
          throw new WorkforceTimeInsufficientLeaveBalanceError(
            `Requested leave of ${dto.totalDays} days exceeds available balance of ${balance.availableBalance} days`
          );
        }

        // Reserve Balance
        await WorkforceTimeRepository.updateLeaveBalance(tx, organizationId, balance.id, {
          reservedBalance: balance.reservedBalance + dto.totalDays,
          availableBalance: balance.availableBalance - dto.totalDays,
        });
      }

      const request = await WorkforceTimeRepository.createLeaveRequest(tx, {
        organizationId,
        employmentId: dto.employmentId,
        personId: dto.personId,
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isHalfDay: dto.isHalfDay ?? false,
        halfDayPeriod: dto.halfDayPeriod || null,
        totalDays: dto.totalDays,
        status: isSubmitting ? 'submitted' : 'draft',
        reason: dto.reason,
        attachmentUrl: dto.attachmentUrl || null,
      });

      const actor = await this.resolveActor(organizationId, actorId || dto.personId, tx);
      await WorkforceTimeRepository.createLeaveRequestHistory(tx, {
        organizationId,
        leaveRequestId: request.id,
        fromStatus: null,
        toStatus: request.status,
        actorPersonId: actor.personId || null,
        actorUserId: actor.userId || null,
        notes: isSubmitting ? 'Auto-submitted on creation' : 'Created as draft',
      });

      const eventName = isSubmitting ? 'leave.request.submitted' : 'leave.request.created';
      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: eventName,
        entityType: 'LeaveRequest',
        entityId: request.id,
        afterState: request as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName,
        entityType: 'LeaveRequest',
        entityId: request.id,
        payload: {
          leaveRequestId: request.id,
          employmentId: request.employmentId,
          totalDays: request.totalDays,
          status: request.status,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { request, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.request;
  }

  public static async submitLeaveRequest(
    organizationId: string,
    id: string,
    actorId?: string,
    requestId?: string
  ): Promise<LeaveRequest> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findLeaveRequestById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Leave request '${id}' not found in organization`);
    }

    if (existing.status !== 'draft') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Leave request '${id}' is in '${existing.status}' status. Only draft requests can be submitted.`
      );
    }

    const leaveType = await WorkforceTimeRepository.findLeaveTypeById(db, organizationId, existing.leaveTypeId);
    const year = parseInt(existing.startDate.split('-')[0], 10);

    const txResult = await withTransaction(async (tx) => {
      let balance = await WorkforceTimeRepository.findLeaveBalance(
        tx,
        organizationId,
        existing.employmentId,
        existing.leaveTypeId,
        year
      );

      if (!balance) {
        balance = await WorkforceTimeRepository.createLeaveBalance(tx, {
          organizationId,
          employmentId: existing.employmentId,
          personId: existing.personId,
          leaveTypeId: existing.leaveTypeId,
          year,
          openingBalance: 0,
          accruedBalance: 0,
          adjustedBalance: 0,
          usedBalance: 0,
          reservedBalance: 0,
          availableBalance: 0,
        });
      }

      if (balance.availableBalance < existing.totalDays && !leaveType?.allowNegativeBalance) {
        throw new WorkforceTimeInsufficientLeaveBalanceError(
          `Requested leave of ${existing.totalDays} days exceeds available balance of ${balance.availableBalance} days`
        );
      }

      // Reserve balance
      await WorkforceTimeRepository.updateLeaveBalance(tx, organizationId, balance.id, {
        reservedBalance: balance.reservedBalance + existing.totalDays,
        availableBalance: balance.availableBalance - existing.totalDays,
      });

      const updated = await WorkforceTimeRepository.updateLeaveRequest(tx, organizationId, id, {
        status: 'submitted',
      });

      const actor = await this.resolveActor(organizationId, actorId || existing.personId, tx);
      await WorkforceTimeRepository.createLeaveRequestHistory(tx, {
        organizationId,
        leaveRequestId: id,
        fromStatus: 'draft',
        toStatus: 'submitted',
        actorPersonId: actor.personId || null,
        actorUserId: actor.userId || null,
        notes: 'Submitted for manager approval',
      });

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'leave.request.submitted',
        entityType: 'LeaveRequest',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'leave.request.submitted',
        entityType: 'LeaveRequest',
        entityId: id,
        payload: { leaveRequestId: id, employmentId: existing.employmentId },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { request: updated || existing, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.request;
  }

  public static async approveLeaveRequest(
    organizationId: string,
    id: string,
    dto: ApproveLeaveRequestDto,
    actorId?: string,
    requestId?: string
  ): Promise<LeaveRequest> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findLeaveRequestById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Leave request '${id}' not found in organization`);
    }

    if (existing.status !== 'submitted') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Leave request '${id}' is in '${existing.status}' status. Only submitted requests can be approved.`
      );
    }

    const year = parseInt(existing.startDate.split('-')[0], 10);

    const txResult = await withTransaction(async (tx) => {
      const balance = await WorkforceTimeRepository.findLeaveBalance(
        tx,
        organizationId,
        existing.employmentId,
        existing.leaveTypeId,
        year
      );

      if (balance) {
        // Commit reserved balance to used balance
        await WorkforceTimeRepository.updateLeaveBalance(tx, organizationId, balance.id, {
          reservedBalance: Math.max(0, balance.reservedBalance - existing.totalDays),
          usedBalance: balance.usedBalance + existing.totalDays,
        });
      }

      const approvedAt = new Date();
      const actor = await this.resolveActor(organizationId, actorId || dto.approvedByPersonId, tx);

      const updated = await WorkforceTimeRepository.updateLeaveRequest(tx, organizationId, id, {
        status: 'approved',
        approvedByPersonId: actor.personId || dto.approvedByPersonId || null,
        approvedAt,
      });

      await WorkforceTimeRepository.createLeaveRequestHistory(tx, {
        organizationId,
        leaveRequestId: id,
        fromStatus: 'submitted',
        toStatus: 'approved',
        actorPersonId: actor.personId || null,
        actorUserId: actor.userId || null,
        notes: dto.notes || 'Approved by supervisor',
      });

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'leave.request.approved',
        entityType: 'LeaveRequest',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'leave.request.approved',
        entityType: 'LeaveRequest',
        entityId: id,
        payload: { leaveRequestId: id, employmentId: existing.employmentId, totalDays: existing.totalDays },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { request: updated || existing, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.request;
  }

  public static async rejectLeaveRequest(
    organizationId: string,
    id: string,
    dto: RejectLeaveRequestDto,
    actorId?: string,
    requestId?: string
  ): Promise<LeaveRequest> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findLeaveRequestById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Leave request '${id}' not found in organization`);
    }

    if (existing.status !== 'submitted') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Leave request '${id}' is in '${existing.status}' status. Only submitted requests can be rejected.`
      );
    }

    const year = parseInt(existing.startDate.split('-')[0], 10);

    const txResult = await withTransaction(async (tx) => {
      const balance = await WorkforceTimeRepository.findLeaveBalance(
        tx,
        organizationId,
        existing.employmentId,
        existing.leaveTypeId,
        year
      );

      if (balance) {
        // Release reserved balance back to available
        await WorkforceTimeRepository.updateLeaveBalance(tx, organizationId, balance.id, {
          reservedBalance: Math.max(0, balance.reservedBalance - existing.totalDays),
          availableBalance: balance.availableBalance + existing.totalDays,
        });
      }

      const actor = await this.resolveActor(organizationId, actorId, tx);
      const updated = await WorkforceTimeRepository.updateLeaveRequest(tx, organizationId, id, {
        status: 'rejected',
        rejectionReason: dto.rejectionReason,
      });

      await WorkforceTimeRepository.createLeaveRequestHistory(tx, {
        organizationId,
        leaveRequestId: id,
        fromStatus: 'submitted',
        toStatus: 'rejected',
        actorPersonId: actor.personId || null,
        actorUserId: actor.userId || null,
        notes: dto.rejectionReason,
      });

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'leave.request.rejected',
        entityType: 'LeaveRequest',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'leave.request.rejected',
        entityType: 'LeaveRequest',
        entityId: id,
        payload: { leaveRequestId: id, rejectionReason: dto.rejectionReason },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { request: updated || existing, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.request;
  }

  public static async cancelLeaveRequest(
    organizationId: string,
    id: string,
    dto: CancelLeaveRequestDto,
    actorId?: string,
    requestId?: string
  ): Promise<LeaveRequest> {
    const db = getDbClient();
    const existing = await WorkforceTimeRepository.findLeaveRequestById(db, organizationId, id);
    if (!existing) {
      throw new WorkforceTimeNotFoundError(`Leave request '${id}' not found in organization`);
    }

    if (existing.status === 'cancelled' || existing.status === 'rejected') {
      throw new WorkforceTimeInvalidStateTransitionError(
        `Leave request '${id}' is already in terminal status '${existing.status}'`
      );
    }

    const year = parseInt(existing.startDate.split('-')[0], 10);

    const txResult = await withTransaction(async (tx) => {
      const balance = await WorkforceTimeRepository.findLeaveBalance(
        tx,
        organizationId,
        existing.employmentId,
        existing.leaveTypeId,
        year
      );

      if (balance) {
        if (existing.status === 'submitted') {
          // Release reserved balance
          await WorkforceTimeRepository.updateLeaveBalance(tx, organizationId, balance.id, {
            reservedBalance: Math.max(0, balance.reservedBalance - existing.totalDays),
            availableBalance: balance.availableBalance + existing.totalDays,
          });
        } else if (existing.status === 'approved') {
          // Re-credit used balance back to available
          await WorkforceTimeRepository.updateLeaveBalance(tx, organizationId, balance.id, {
            usedBalance: Math.max(0, balance.usedBalance - existing.totalDays),
            availableBalance: balance.availableBalance + existing.totalDays,
          });
        }
      }

      const actor = await this.resolveActor(organizationId, actorId, tx);
      const updated = await WorkforceTimeRepository.updateLeaveRequest(tx, organizationId, id, {
        status: 'cancelled',
        cancellationReason: dto.cancellationReason || null,
      });

      await WorkforceTimeRepository.createLeaveRequestHistory(tx, {
        organizationId,
        leaveRequestId: id,
        fromStatus: existing.status,
        toStatus: 'cancelled',
        actorPersonId: actor.personId || null,
        actorUserId: actor.userId || null,
        notes: dto.cancellationReason || 'Cancelled by requester',
      });

      await AuditService.recordLog({
        organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'leave.request.cancelled',
        entityType: 'LeaveRequest',
        entityId: id,
        beforeState: existing as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce-time',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'leave.request.cancelled',
        entityType: 'LeaveRequest',
        entityId: id,
        payload: { leaveRequestId: id, cancellationReason: dto.cancellationReason },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { request: updated || existing, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.request;
  }

  public static async getLeaveRequest(organizationId: string, id: string): Promise<LeaveRequest> {
    const db = getDbClient();
    const request = await WorkforceTimeRepository.findLeaveRequestById(db, organizationId, id);
    if (!request) {
      throw new WorkforceTimeNotFoundError(`Leave request '${id}' not found in organization`);
    }
    return request;
  }

  public static async listLeaveRequests(
    organizationId: string,
    filters: {
      employmentId?: string;
      personId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<LeaveRequest[]> {
    const db = getDbClient();
    return WorkforceTimeRepository.listLeaveRequests(db, organizationId, filters);
  }

  // ==========================================================================
  // 7. AVAILABILITY PROJECTION (FOR M3 ASSIGNMENT & M11 ANALYTICS)
  // ==========================================================================

  public static async getAvailability(
    organizationId: string,
    employmentId: string,
    startDate: string,
    endDate: string
  ): Promise<WorkforceAvailabilityProjection> {
    const db = getDbClient();

    // Verify employment exists in tenant
    const emp = await this.verifyEmploymentInTenant(db, organizationId, employmentId);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      throw new WorkforceTimeInvalidTimestampsError('endDate must be on or after startDate');
    }

    // 1. Calculate calendar days
    const msPerDay = 24 * 60 * 60 * 1000;
    const totalCalendarDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;

    // 2. Resolve active schedule assignment
    const assignment = await WorkforceTimeRepository.findActiveScheduleAssignmentForDate(
      db,
      organizationId,
      employmentId,
      startDate
    );

    let workingDaySet = new Set<number>([1, 2, 3, 4, 5]); // Default Mon-Fri
    let dailyHoursMap: Record<number, number> = { 1: 8.0, 2: 8.0, 3: 8.0, 4: 8.0, 5: 8.0 };

    if (assignment) {
      const scheduleDays = await WorkforceTimeRepository.findScheduleDays(db, organizationId, assignment.scheduleId);
      if (scheduleDays.length > 0) {
        workingDaySet = new Set<number>();
        dailyHoursMap = {};
        for (const sd of scheduleDays) {
          if (sd.isWorkingDay) {
            workingDaySet.add(sd.dayOfWeek);
            dailyHoursMap[sd.dayOfWeek] = sd.expectedHours;
          }
        }
      }
    }

    let scheduledWorkingDays = 0;
    let scheduledWorkingHours = 0;
    const workingDateStrings = new Set<string>();

    const curr = new Date(start);
    while (curr <= end) {
      const dayOfWeek = curr.getUTCDay();
      const dateStr = curr.toISOString().split('T')[0];
      if (workingDaySet.has(dayOfWeek)) {
        scheduledWorkingDays++;
        scheduledWorkingHours += dailyHoursMap[dayOfWeek] || 8.0;
        workingDateStrings.add(dateStr);
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // 3. Resolve holidays within range (Org wide or Branch specific)
    const holidays = await WorkforceTimeRepository.listHolidays(db, organizationId, {
      startDate,
      endDate,
      branchId: emp.branchId,
    });

    let holidayDays = 0;
    let holidayHours = 0;

    for (const h of holidays) {
      if (workingDateStrings.has(h.holidayDate)) {
        const factor = h.isHalfDay ? 0.5 : 1.0;
        holidayDays += factor;
        holidayHours += factor * 8.0;
      }
    }

    // 4. Resolve approved leaves in range
    const approvedLeaves = await WorkforceTimeRepository.findApprovedLeaveDays(
      db,
      organizationId,
      employmentId,
      startDate,
      endDate
    );

    let approvedLeaveDays = 0;
    let approvedLeaveHours = 0;

    for (const l of approvedLeaves) {
      approvedLeaveDays += l.totalDays;
      approvedLeaveHours += l.totalDays * 8.0;
    }

    const netAvailableDays = Math.max(0, scheduledWorkingDays - holidayDays - approvedLeaveDays);
    const netAvailableHours = Math.max(0, scheduledWorkingHours - holidayHours - approvedLeaveHours);

    return {
      employmentId,
      startDate,
      endDate,
      totalCalendarDays,
      scheduledWorkingDays,
      scheduledWorkingHours: Number(scheduledWorkingHours.toFixed(2)),
      holidayDays: Number(holidayDays.toFixed(2)),
      holidayHours: Number(holidayHours.toFixed(2)),
      approvedLeaveDays: Number(approvedLeaveDays.toFixed(2)),
      approvedLeaveHours: Number(approvedLeaveHours.toFixed(2)),
      netAvailableDays: Number(netAvailableDays.toFixed(2)),
      netAvailableHours: Number(netAvailableHours.toFixed(2)),
    };
  }
}
