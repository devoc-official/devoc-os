// ============================================================================
// Infrastructure Repository — M15 Attendance, Leave & Workforce Time Engine
// ============================================================================

import { DbClient } from '../../../database/index.js';
import {
  WorkforceSchedule,
  WorkforceScheduleDay,
  WorkforceScheduleAssignment,
  WorkforceHoliday,
  AttendanceRecord,
  AttendanceSession,
  AttendanceCorrection,
  WorkforceTimeRecord,
  WorkforceTimesheet,
  WorkforceTimesheetEntry,
  LeaveType,
  LeavePolicy,
  LeavePolicyRule,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestHistory,
} from '../domain/workforce-time.types.js';

export class WorkforceTimeRepository {
  // ==========================================================================
  // 1. WORKFORCE SCHEDULES & SCHEDULE DAYS
  // ==========================================================================

  public static async createSchedule(
    client: DbClient,
    schedule: Omit<WorkforceSchedule, 'id' | 'createdAt' | 'updatedAt' | 'workingDays'>,
    workingDays: Omit<WorkforceScheduleDay, 'id' | 'scheduleId' | 'organizationId' | 'createdAt' | 'updatedAt'>[] = []
  ): Promise<WorkforceSchedule> {
    const res = await client.query<any>(
      `INSERT INTO workforce_schedules (
        organization_id, branch_id, name, code, description, schedule_type, timezone, expected_weekly_hours, is_default, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        schedule.organizationId,
        schedule.branchId,
        schedule.name,
        schedule.code,
        schedule.description,
        schedule.scheduleType,
        schedule.timezone,
        schedule.expectedWeeklyHours,
        schedule.isDefault,
        schedule.isActive,
      ]
    );

    const created = this.mapSchedule(res.rows[0]);

    if (workingDays.length > 0) {
      const dayValues: any[] = [];
      const dayPlaceholders: string[] = [];
      let idx = 1;

      for (const d of workingDays) {
        dayPlaceholders.push(
          `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
        );
        dayValues.push(
          created.organizationId,
          created.id,
          d.dayOfWeek,
          d.isWorkingDay,
          d.startTime || null,
          d.endTime || null,
          d.breakDurationMinutes ?? 60,
          d.expectedHours ?? 8.0
        );
      }

      const daysRes = await client.query<any>(
        `INSERT INTO workforce_schedule_days (
          organization_id, schedule_id, day_of_week, is_working_day, start_time, end_time, break_duration_minutes, expected_hours
        ) VALUES ${dayPlaceholders.join(', ')}
        RETURNING *;`,
        dayValues
      );

      created.workingDays = daysRes.rows.map(this.mapScheduleDay);
    } else {
      created.workingDays = [];
    }

    return created;
  }

  public static async updateSchedule(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<WorkforceSchedule>,
    workingDays?: Omit<WorkforceScheduleDay, 'id' | 'scheduleId' | 'organizationId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<WorkforceSchedule | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(fields.name);
    }
    if (fields.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(fields.description);
    }
    if (fields.branchId !== undefined) {
      setClauses.push(`branch_id = $${idx++}`);
      values.push(fields.branchId);
    }
    if (fields.scheduleType !== undefined) {
      setClauses.push(`schedule_type = $${idx++}`);
      values.push(fields.scheduleType);
    }
    if (fields.timezone !== undefined) {
      setClauses.push(`timezone = $${idx++}`);
      values.push(fields.timezone);
    }
    if (fields.expectedWeeklyHours !== undefined) {
      setClauses.push(`expected_weekly_hours = $${idx++}`);
      values.push(fields.expectedWeeklyHours);
    }
    if (fields.isDefault !== undefined) {
      setClauses.push(`is_default = $${idx++}`);
      values.push(fields.isDefault);
    }
    if (fields.isActive !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      values.push(fields.isActive);
    }

    const res = await client.query<any>(
      `UPDATE workforce_schedules
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );

    if (res.rows.length === 0) return null;
    const updated = this.mapSchedule(res.rows[0]);

    if (workingDays) {
      await client.query(
        `DELETE FROM workforce_schedule_days WHERE organization_id = $1 AND schedule_id = $2;`,
        [organizationId, id]
      );

      if (workingDays.length > 0) {
        const dayValues: any[] = [];
        const dayPlaceholders: string[] = [];
        let dIdx = 1;

        for (const d of workingDays) {
          dayPlaceholders.push(
            `($${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++})`
          );
          dayValues.push(
            organizationId,
            id,
            d.dayOfWeek,
            d.isWorkingDay,
            d.startTime || null,
            d.endTime || null,
            d.breakDurationMinutes ?? 60,
            d.expectedHours ?? 8.0
          );
        }

        const daysRes = await client.query<any>(
          `INSERT INTO workforce_schedule_days (
            organization_id, schedule_id, day_of_week, is_working_day, start_time, end_time, break_duration_minutes, expected_hours
          ) VALUES ${dayPlaceholders.join(', ')}
          RETURNING *;`,
          dayValues
        );
        updated.workingDays = daysRes.rows.map(this.mapScheduleDay);
      } else {
        updated.workingDays = [];
      }
    } else {
      updated.workingDays = await this.findScheduleDays(client, organizationId, id);
    }

    return updated;
  }

  public static async findScheduleById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<WorkforceSchedule | null> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_schedules WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    const schedule = this.mapSchedule(res.rows[0]);
    schedule.workingDays = await this.findScheduleDays(client, organizationId, id);
    return schedule;
  }

  public static async findScheduleByCode(
    client: DbClient,
    organizationId: string,
    code: string
  ): Promise<WorkforceSchedule | null> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_schedules WHERE organization_id = $1 AND code = $2;`,
      [organizationId, code]
    );
    if (res.rows.length === 0) return null;
    const schedule = this.mapSchedule(res.rows[0]);
    schedule.workingDays = await this.findScheduleDays(client, organizationId, schedule.id);
    return schedule;
  }

  public static async listSchedules(
    client: DbClient,
    organizationId: string,
    filters: { branchId?: string | null; isActive?: boolean } = {}
  ): Promise<WorkforceSchedule[]> {
    const where: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let idx = 2;

    if (filters.branchId !== undefined) {
      if (filters.branchId === null) {
        where.push(`branch_id IS NULL`);
      } else {
        where.push(`branch_id = $${idx++}`);
        values.push(filters.branchId);
      }
    }
    if (filters.isActive !== undefined) {
      where.push(`is_active = $${idx++}`);
      values.push(filters.isActive);
    }

    const res = await client.query<any>(
      `SELECT * FROM workforce_schedules WHERE ${where.join(' AND ')} ORDER BY created_at DESC;`,
      values
    );
    return res.rows.map(this.mapSchedule);
  }

  public static async findScheduleDays(
    client: DbClient,
    organizationId: string,
    scheduleId: string
  ): Promise<WorkforceScheduleDay[]> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_schedule_days
       WHERE organization_id = $1 AND schedule_id = $2
       ORDER BY day_of_week ASC;`,
      [organizationId, scheduleId]
    );
    return res.rows.map(this.mapScheduleDay);
  }

  public static async assignSchedule(
    client: DbClient,
    assignment: Omit<WorkforceScheduleAssignment, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
      status?: WorkforceScheduleAssignment['status'];
    }
  ): Promise<WorkforceScheduleAssignment> {
    const res = await client.query<any>(
      `INSERT INTO workforce_schedule_assignments (
        organization_id, employment_id, person_id, schedule_id, effective_from, effective_to, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [
        assignment.organizationId,
        assignment.employmentId,
        assignment.personId,
        assignment.scheduleId,
        assignment.effectiveFrom,
        assignment.effectiveTo || null,
        assignment.status || 'active',
        assignment.notes || null,
      ]
    );
    return this.mapScheduleAssignment(res.rows[0]);
  }

  public static async findScheduleAssignments(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    status?: string
  ): Promise<WorkforceScheduleAssignment[]> {
    const where: string[] = ['organization_id = $1', 'employment_id = $2'];
    const values: any[] = [organizationId, employmentId];
    if (status) {
      where.push('status = $3');
      values.push(status);
    }

    const res = await client.query<any>(
      `SELECT * FROM workforce_schedule_assignments
       WHERE ${where.join(' AND ')}
       ORDER BY effective_from DESC;`,
      values
    );
    return res.rows.map(this.mapScheduleAssignment);
  }

  public static async checkScheduleAssignmentCollision(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    effectiveFrom: string,
    effectiveTo: string | null,
    excludeId?: string
  ): Promise<boolean> {
    // Collision condition:
    // Existing active assignment overlaps with [effectiveFrom, effectiveTo]
    // A overlaps B if (A.effective_from <= B.effective_to OR B.effective_to IS NULL)
    // AND (A.effective_to >= B.effective_from OR A.effective_to IS NULL)
    let query = `
      SELECT id FROM workforce_schedule_assignments
      WHERE organization_id = $1
        AND employment_id = $2
        AND status = 'active'
        AND (effective_to IS NULL OR effective_to >= $3)
        AND ($4::date IS NULL OR effective_from <= $4::date)
    `;
    const values: any[] = [organizationId, employmentId, effectiveFrom, effectiveTo];

    if (excludeId) {
      query += ` AND id != $5`;
      values.push(excludeId);
    }

    const res = await client.query<any>(query, values);
    return res.rows.length > 0;
  }

  public static async findActiveScheduleAssignmentForDate(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    date: string
  ): Promise<WorkforceScheduleAssignment | null> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_schedule_assignments
       WHERE organization_id = $1
         AND employment_id = $2
         AND status = 'active'
         AND effective_from <= $3
         AND (effective_to IS NULL OR effective_to >= $3)
       ORDER BY effective_from DESC
       LIMIT 1;`,
      [organizationId, employmentId, date]
    );
    if (res.rows.length === 0) return null;
    return this.mapScheduleAssignment(res.rows[0]);
  }

  // ==========================================================================
  // 2. HOLIDAYS
  // ==========================================================================

  public static async createHoliday(
    client: DbClient,
    holiday: Omit<WorkforceHoliday, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WorkforceHoliday> {
    const res = await client.query<any>(
      `INSERT INTO workforce_holidays (
        organization_id, branch_id, holiday_date, name, description, holiday_type, is_half_day, is_optional
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [
        holiday.organizationId,
        holiday.branchId || null,
        holiday.holidayDate,
        holiday.name,
        holiday.description || null,
        holiday.holidayType || 'public',
        holiday.isHalfDay ?? false,
        holiday.isOptional ?? false,
      ]
    );
    return this.mapHoliday(res.rows[0]);
  }

  public static async findHolidayById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<WorkforceHoliday | null> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_holidays WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapHoliday(res.rows[0]);
  }

  public static async deleteHoliday(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<boolean> {
    const res = await client.query<any>(
      `DELETE FROM workforce_holidays WHERE organization_id = $1 AND id = $2 RETURNING id;`,
      [organizationId, id]
    );
    return res.rows.length > 0;
  }

  public static async listHolidays(
    client: DbClient,
    organizationId: string,
    filters: { startDate?: string; endDate?: string; branchId?: string | null } = {}
  ): Promise<WorkforceHoliday[]> {
    const where: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let idx = 2;

    if (filters.startDate) {
      where.push(`holiday_date >= $${idx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push(`holiday_date <= $${idx++}`);
      values.push(filters.endDate);
    }
    if (filters.branchId !== undefined) {
      // Include branch-specific OR organization-wide (branch_id IS NULL)
      where.push(`(branch_id = $${idx++} OR branch_id IS NULL)`);
      values.push(filters.branchId);
    }

    const res = await client.query<any>(
      `SELECT * FROM workforce_holidays WHERE ${where.join(' AND ')} ORDER BY holiday_date ASC;`,
      values
    );
    return res.rows.map(this.mapHoliday);
  }

  // ==========================================================================
  // 3. ATTENDANCE & SESSIONS & CORRECTIONS
  // ==========================================================================

  public static async findAttendanceRecordByDate(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    attendanceDate: string
  ): Promise<AttendanceRecord | null> {
    const res = await client.query<any>(
      `SELECT * FROM attendance_records
       WHERE organization_id = $1 AND employment_id = $2 AND attendance_date = $3;`,
      [organizationId, employmentId, attendanceDate]
    );
    if (res.rows.length === 0) return null;
    const record = this.mapAttendanceRecord(res.rows[0]);
    record.sessions = await this.findAttendanceSessions(client, organizationId, record.id);
    return record;
  }

  public static async findAttendanceRecordById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<AttendanceRecord | null> {
    const res = await client.query<any>(
      `SELECT * FROM attendance_records WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    const record = this.mapAttendanceRecord(res.rows[0]);
    record.sessions = await this.findAttendanceSessions(client, organizationId, record.id);
    return record;
  }

  public static async createAttendanceRecord(
    client: DbClient,
    record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'sessions'>
  ): Promise<AttendanceRecord> {
    const res = await client.query<any>(
      `INSERT INTO attendance_records (
        organization_id, employment_id, person_id, attendance_date, status, total_presence_minutes, total_break_minutes, total_work_minutes, is_punctual, has_missing_checkout, has_correction, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;`,
      [
        record.organizationId,
        record.employmentId,
        record.personId,
        record.attendanceDate,
        record.status,
        record.totalPresenceMinutes,
        record.totalBreakMinutes,
        record.totalWorkMinutes,
        record.isPunctual,
        record.hasMissingCheckout,
        record.hasCorrection,
        record.notes || null,
      ]
    );
    const created = this.mapAttendanceRecord(res.rows[0]);
    created.sessions = [];
    return created;
  }

  public static async updateAttendanceRecord(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(fields.status);
    }
    if (fields.totalPresenceMinutes !== undefined) {
      setClauses.push(`total_presence_minutes = $${idx++}`);
      values.push(fields.totalPresenceMinutes);
    }
    if (fields.totalBreakMinutes !== undefined) {
      setClauses.push(`total_break_minutes = $${idx++}`);
      values.push(fields.totalBreakMinutes);
    }
    if (fields.totalWorkMinutes !== undefined) {
      setClauses.push(`total_work_minutes = $${idx++}`);
      values.push(fields.totalWorkMinutes);
    }
    if (fields.isPunctual !== undefined) {
      setClauses.push(`is_punctual = $${idx++}`);
      values.push(fields.isPunctual);
    }
    if (fields.hasMissingCheckout !== undefined) {
      setClauses.push(`has_missing_checkout = $${idx++}`);
      values.push(fields.hasMissingCheckout);
    }
    if (fields.hasCorrection !== undefined) {
      setClauses.push(`has_correction = $${idx++}`);
      values.push(fields.hasCorrection);
    }
    if (fields.notes !== undefined) {
      setClauses.push(`notes = $${idx++}`);
      values.push(fields.notes);
    }

    const res = await client.query<any>(
      `UPDATE attendance_records
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    const updated = this.mapAttendanceRecord(res.rows[0]);
    updated.sessions = await this.findAttendanceSessions(client, organizationId, id);
    return updated;
  }

  public static async listAttendanceRecords(
    client: DbClient,
    organizationId: string,
    filters: {
      employmentId?: string;
      personId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    } = {}
  ): Promise<AttendanceRecord[]> {
    const where: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let idx = 2;

    if (filters.employmentId) {
      where.push(`employment_id = $${idx++}`);
      values.push(filters.employmentId);
    }
    if (filters.personId) {
      where.push(`person_id = $${idx++}`);
      values.push(filters.personId);
    }
    if (filters.startDate) {
      where.push(`attendance_date >= $${idx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push(`attendance_date <= $${idx++}`);
      values.push(filters.endDate);
    }
    if (filters.status) {
      where.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    const res = await client.query<any>(
      `SELECT * FROM attendance_records WHERE ${where.join(' AND ')} ORDER BY attendance_date DESC;`,
      values
    );
    return res.rows.map(this.mapAttendanceRecord);
  }

  public static async createAttendanceSession(
    client: DbClient,
    session: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AttendanceSession> {
    const res = await client.query<any>(
      `INSERT INTO attendance_sessions (
        organization_id, attendance_record_id, check_in_at, check_out_at, duration_minutes, check_in_ip, check_out_ip, device_metadata, is_manual_entry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        session.organizationId,
        session.attendanceRecordId,
        session.checkInAt,
        session.checkOutAt || null,
        session.durationMinutes || null,
        session.checkInIp || null,
        session.checkOutIp || null,
        JSON.stringify(session.deviceMetadata || {}),
        session.isManualEntry ?? false,
      ]
    );
    return this.mapAttendanceSession(res.rows[0]);
  }

  public static async updateAttendanceSession(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<AttendanceSession>
  ): Promise<AttendanceSession | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.checkInAt !== undefined) {
      setClauses.push(`check_in_at = $${idx++}`);
      values.push(fields.checkInAt);
    }
    if (fields.checkOutAt !== undefined) {
      setClauses.push(`check_out_at = $${idx++}`);
      values.push(fields.checkOutAt);
    }
    if (fields.durationMinutes !== undefined) {
      setClauses.push(`duration_minutes = $${idx++}`);
      values.push(fields.durationMinutes);
    }
    if (fields.checkOutIp !== undefined) {
      setClauses.push(`check_out_ip = $${idx++}`);
      values.push(fields.checkOutIp);
    }

    const res = await client.query<any>(
      `UPDATE attendance_sessions
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    return this.mapAttendanceSession(res.rows[0]);
  }

  public static async findOpenAttendanceSession(
    client: DbClient,
    organizationId: string,
    attendanceRecordId: string
  ): Promise<AttendanceSession | null> {
    const res = await client.query<any>(
      `SELECT * FROM attendance_sessions
       WHERE organization_id = $1 AND attendance_record_id = $2 AND check_out_at IS NULL
       ORDER BY check_in_at DESC
       LIMIT 1;`,
      [organizationId, attendanceRecordId]
    );
    if (res.rows.length === 0) return null;
    return this.mapAttendanceSession(res.rows[0]);
  }

  public static async findAttendanceSessions(
    client: DbClient,
    organizationId: string,
    attendanceRecordId: string
  ): Promise<AttendanceSession[]> {
    const res = await client.query<any>(
      `SELECT * FROM attendance_sessions
       WHERE organization_id = $1 AND attendance_record_id = $2
       ORDER BY check_in_at ASC;`,
      [organizationId, attendanceRecordId]
    );
    return res.rows.map(this.mapAttendanceSession);
  }

  public static async findAttendanceSessionById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<AttendanceSession | null> {
    const res = await client.query<any>(
      `SELECT * FROM attendance_sessions WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapAttendanceSession(res.rows[0]);
  }

  public static async createAttendanceCorrection(
    client: DbClient,
    correction: Omit<AttendanceCorrection, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reviewedByPersonId' | 'reviewedAt' | 'reviewNotes'> & {
      status?: AttendanceCorrection['status'];
    }
  ): Promise<AttendanceCorrection> {
    const res = await client.query<any>(
      `INSERT INTO attendance_corrections (
        organization_id, attendance_record_id, attendance_session_id, original_check_in_at, original_check_out_at, corrected_check_in_at, corrected_check_out_at, status, reason, requested_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        correction.organizationId,
        correction.attendanceRecordId,
        correction.attendanceSessionId || null,
        correction.originalCheckInAt || null,
        correction.originalCheckOutAt || null,
        correction.correctedCheckInAt,
        correction.correctedCheckOutAt,
        correction.status || 'pending',
        correction.reason,
        correction.requestedByUserId,
      ]
    );
    return this.mapAttendanceCorrection(res.rows[0]);
  }

  public static async findAttendanceCorrectionById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<AttendanceCorrection | null> {
    const res = await client.query<any>(
      `SELECT * FROM attendance_corrections WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapAttendanceCorrection(res.rows[0]);
  }

  public static async updateAttendanceCorrection(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<AttendanceCorrection>
  ): Promise<AttendanceCorrection | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(fields.status);
    }
    if (fields.reviewedByPersonId !== undefined) {
      setClauses.push(`reviewed_by_person_id = $${idx++}`);
      values.push(fields.reviewedByPersonId);
    }
    if (fields.reviewedAt !== undefined) {
      setClauses.push(`reviewed_at = $${idx++}`);
      values.push(fields.reviewedAt);
    }
    if (fields.reviewNotes !== undefined) {
      setClauses.push(`review_notes = $${idx++}`);
      values.push(fields.reviewNotes);
    }

    const res = await client.query<any>(
      `UPDATE attendance_corrections
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    return this.mapAttendanceCorrection(res.rows[0]);
  }

  public static async listAttendanceCorrections(
    client: DbClient,
    organizationId: string,
    attendanceRecordId: string
  ): Promise<AttendanceCorrection[]> {
    const res = await client.query<any>(
      `SELECT * FROM attendance_corrections
       WHERE organization_id = $1 AND attendance_record_id = $2
       ORDER BY created_at DESC;`,
      [organizationId, attendanceRecordId]
    );
    return res.rows.map(this.mapAttendanceCorrection);
  }

  // ==========================================================================
  // 4. WORKFORCE TIME RECORDS
  // ==========================================================================

  public static async createTimeRecord(
    client: DbClient,
    record: Omit<WorkforceTimeRecord, 'id' | 'createdAt' | 'updatedAt' | 'overtimeStatus' | 'overtimeApprovedByPersonId'> & {
      overtimeStatus?: WorkforceTimeRecord['overtimeStatus'];
    }
  ): Promise<WorkforceTimeRecord> {
    const res = await client.query<any>(
      `INSERT INTO workforce_time_records (
        organization_id, employment_id, person_id, attendance_record_id, attendance_session_id, time_type, started_at, ended_at, duration_minutes, is_overtime, overtime_status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;`,
      [
        record.organizationId,
        record.employmentId,
        record.personId,
        record.attendanceRecordId || null,
        record.attendanceSessionId || null,
        record.timeType,
        record.startedAt,
        record.endedAt,
        record.durationMinutes,
        record.isOvertime ?? false,
        record.overtimeStatus || (record.isOvertime ? 'pending' : 'none'),
        record.description || null,
      ]
    );
    return this.mapTimeRecord(res.rows[0]);
  }

  public static async updateTimeRecord(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<WorkforceTimeRecord>
  ): Promise<WorkforceTimeRecord | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.timeType !== undefined) {
      setClauses.push(`time_type = $${idx++}`);
      values.push(fields.timeType);
    }
    if (fields.startedAt !== undefined) {
      setClauses.push(`started_at = $${idx++}`);
      values.push(fields.startedAt);
    }
    if (fields.endedAt !== undefined) {
      setClauses.push(`ended_at = $${idx++}`);
      values.push(fields.endedAt);
    }
    if (fields.durationMinutes !== undefined) {
      setClauses.push(`duration_minutes = $${idx++}`);
      values.push(fields.durationMinutes);
    }
    if (fields.isOvertime !== undefined) {
      setClauses.push(`is_overtime = $${idx++}`);
      values.push(fields.isOvertime);
    }
    if (fields.overtimeStatus !== undefined) {
      setClauses.push(`overtime_status = $${idx++}`);
      values.push(fields.overtimeStatus);
    }
    if (fields.overtimeApprovedByPersonId !== undefined) {
      setClauses.push(`overtime_approved_by_person_id = $${idx++}`);
      values.push(fields.overtimeApprovedByPersonId);
    }
    if (fields.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(fields.description);
    }

    const res = await client.query<any>(
      `UPDATE workforce_time_records
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    return this.mapTimeRecord(res.rows[0]);
  }

  public static async findTimeRecordById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<WorkforceTimeRecord | null> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_time_records WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapTimeRecord(res.rows[0]);
  }

  public static async listTimeRecords(
    client: DbClient,
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
    const where: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let idx = 2;

    if (filters.employmentId) {
      where.push(`employment_id = $${idx++}`);
      values.push(filters.employmentId);
    }
    if (filters.personId) {
      where.push(`person_id = $${idx++}`);
      values.push(filters.personId);
    }
    if (filters.startDate) {
      where.push(`started_at >= $${idx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push(`ended_at <= $${idx++}`);
      values.push(filters.endDate);
    }
    if (filters.timeType) {
      where.push(`time_type = $${idx++}`);
      values.push(filters.timeType);
    }
    if (filters.isOvertime !== undefined) {
      where.push(`is_overtime = $${idx++}`);
      values.push(filters.isOvertime);
    }
    if (filters.overtimeStatus) {
      where.push(`overtime_status = $${idx++}`);
      values.push(filters.overtimeStatus);
    }

    const res = await client.query<any>(
      `SELECT * FROM workforce_time_records WHERE ${where.join(' AND ')} ORDER BY started_at DESC;`,
      values
    );
    return res.rows.map(this.mapTimeRecord);
  }

  public static async checkOverlappingRegularTime(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    startedAt: Date,
    endedAt: Date,
    excludeId?: string
  ): Promise<boolean> {
    let query = `
      SELECT id FROM workforce_time_records
      WHERE organization_id = $1
        AND employment_id = $2
        AND time_type = 'regular'
        AND started_at < $4
        AND ended_at > $3
    `;
    const values: any[] = [organizationId, employmentId, startedAt, endedAt];

    if (excludeId) {
      query += ` AND id != $5`;
      values.push(excludeId);
    }

    const res = await client.query<any>(query, values);
    return res.rows.length > 0;
  }

  // ==========================================================================
  // 5. TIMESHEETS & ENTRIES
  // ==========================================================================

  public static async createTimesheet(
    client: DbClient,
    timesheet: Omit<WorkforceTimesheet, 'id' | 'createdAt' | 'updatedAt' | 'entries'>,
    entries: Omit<WorkforceTimesheetEntry, 'id' | 'timesheetId' | 'organizationId' | 'createdAt' | 'updatedAt'>[] = []
  ): Promise<WorkforceTimesheet> {
    const res = await client.query<any>(
      `INSERT INTO workforce_timesheets (
        organization_id, employment_id, person_id, period_start_date, period_end_date, status, total_regular_hours, total_break_hours, total_overtime_hours, total_billable_hours, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;`,
      [
        timesheet.organizationId,
        timesheet.employmentId,
        timesheet.personId,
        timesheet.periodStartDate,
        timesheet.periodEndDate,
        timesheet.status || 'draft',
        timesheet.totalRegularHours,
        timesheet.totalBreakHours,
        timesheet.totalOvertimeHours,
        timesheet.totalBillableHours,
        timesheet.notes || null,
      ]
    );
    const created = this.mapTimesheet(res.rows[0]);

    if (entries.length > 0) {
      const entryValues: any[] = [];
      const entryPlaceholders: string[] = [];
      let idx = 1;

      for (const e of entries) {
        entryPlaceholders.push(
          `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
        );
        entryValues.push(
          created.organizationId,
          created.id,
          e.timeRecordId || null,
          e.entryDate,
          e.timeType,
          e.durationMinutes,
          e.hours,
          e.notes || null
        );
      }

      const entriesRes = await client.query<any>(
        `INSERT INTO workforce_timesheet_entries (
          organization_id, timesheet_id, time_record_id, entry_date, time_type, duration_minutes, hours, notes
        ) VALUES ${entryPlaceholders.join(', ')}
        RETURNING *;`,
        entryValues
      );
      created.entries = entriesRes.rows.map(this.mapTimesheetEntry);
    } else {
      created.entries = [];
    }

    return created;
  }

  public static async findTimesheetById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<WorkforceTimesheet | null> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_timesheets WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    const timesheet = this.mapTimesheet(res.rows[0]);
    timesheet.entries = await this.findTimesheetEntries(client, organizationId, id);
    return timesheet;
  }

  public static async findTimesheetByPeriod(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    periodStartDate: string,
    periodEndDate: string
  ): Promise<WorkforceTimesheet | null> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_timesheets
       WHERE organization_id = $1 AND employment_id = $2 AND period_start_date = $3 AND period_end_date = $4;`,
      [organizationId, employmentId, periodStartDate, periodEndDate]
    );
    if (res.rows.length === 0) return null;
    const timesheet = this.mapTimesheet(res.rows[0]);
    timesheet.entries = await this.findTimesheetEntries(client, organizationId, timesheet.id);
    return timesheet;
  }

  public static async updateTimesheet(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<WorkforceTimesheet>
  ): Promise<WorkforceTimesheet | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(fields.status);
    }
    if (fields.totalRegularHours !== undefined) {
      setClauses.push(`total_regular_hours = $${idx++}`);
      values.push(fields.totalRegularHours);
    }
    if (fields.totalBreakHours !== undefined) {
      setClauses.push(`total_break_hours = $${idx++}`);
      values.push(fields.totalBreakHours);
    }
    if (fields.totalOvertimeHours !== undefined) {
      setClauses.push(`total_overtime_hours = $${idx++}`);
      values.push(fields.totalOvertimeHours);
    }
    if (fields.totalBillableHours !== undefined) {
      setClauses.push(`total_billable_hours = $${idx++}`);
      values.push(fields.totalBillableHours);
    }
    if (fields.submittedAt !== undefined) {
      setClauses.push(`submitted_at = $${idx++}`);
      values.push(fields.submittedAt);
    }
    if (fields.approvedByPersonId !== undefined) {
      setClauses.push(`approved_by_person_id = $${idx++}`);
      values.push(fields.approvedByPersonId);
    }
    if (fields.approvedAt !== undefined) {
      setClauses.push(`approved_at = $${idx++}`);
      values.push(fields.approvedAt);
    }
    if (fields.rejectionReason !== undefined) {
      setClauses.push(`rejection_reason = $${idx++}`);
      values.push(fields.rejectionReason);
    }
    if (fields.notes !== undefined) {
      setClauses.push(`notes = $${idx++}`);
      values.push(fields.notes);
    }

    const res = await client.query<any>(
      `UPDATE workforce_timesheets
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    const updated = this.mapTimesheet(res.rows[0]);
    updated.entries = await this.findTimesheetEntries(client, organizationId, id);
    return updated;
  }

  public static async listTimesheets(
    client: DbClient,
    organizationId: string,
    filters: {
      employmentId?: string;
      personId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<WorkforceTimesheet[]> {
    const where: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let idx = 2;

    if (filters.employmentId) {
      where.push(`employment_id = $${idx++}`);
      values.push(filters.employmentId);
    }
    if (filters.personId) {
      where.push(`person_id = $${idx++}`);
      values.push(filters.personId);
    }
    if (filters.status) {
      where.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.startDate) {
      where.push(`period_start_date >= $${idx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push(`period_end_date <= $${idx++}`);
      values.push(filters.endDate);
    }

    const res = await client.query<any>(
      `SELECT * FROM workforce_timesheets WHERE ${where.join(' AND ')} ORDER BY period_start_date DESC;`,
      values
    );
    return res.rows.map(this.mapTimesheet);
  }

  public static async findTimesheetEntries(
    client: DbClient,
    organizationId: string,
    timesheetId: string
  ): Promise<WorkforceTimesheetEntry[]> {
    const res = await client.query<any>(
      `SELECT * FROM workforce_timesheet_entries
       WHERE organization_id = $1 AND timesheet_id = $2
       ORDER BY entry_date ASC, created_at ASC;`,
      [organizationId, timesheetId]
    );
    return res.rows.map(this.mapTimesheetEntry);
  }

  // ==========================================================================
  // 6. LEAVE ENGINE & BALANCES
  // ==========================================================================

  public static async createLeaveType(
    client: DbClient,
    leaveType: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveType> {
    const res = await client.query<any>(
      `INSERT INTO leave_types (
        organization_id, name, code, description, is_paid, requires_approval, requires_documentation, allow_negative_balance, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        leaveType.organizationId,
        leaveType.name,
        leaveType.code,
        leaveType.description || null,
        leaveType.isPaid ?? true,
        leaveType.requiresApproval ?? true,
        leaveType.requiresDocumentation ?? false,
        leaveType.allowNegativeBalance ?? false,
        leaveType.isActive ?? true,
      ]
    );
    return this.mapLeaveType(res.rows[0]);
  }

  public static async findLeaveTypeById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<LeaveType | null> {
    const res = await client.query<any>(
      `SELECT * FROM leave_types WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapLeaveType(res.rows[0]);
  }

  public static async findLeaveTypeByCode(
    client: DbClient,
    organizationId: string,
    code: string
  ): Promise<LeaveType | null> {
    const res = await client.query<any>(
      `SELECT * FROM leave_types WHERE organization_id = $1 AND code = $2;`,
      [organizationId, code]
    );
    if (res.rows.length === 0) return null;
    return this.mapLeaveType(res.rows[0]);
  }

  public static async listLeaveTypes(
    client: DbClient,
    organizationId: string,
    isActiveOnly = false
  ): Promise<LeaveType[]> {
    let query = `SELECT * FROM leave_types WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    if (isActiveOnly) {
      query += ` AND is_active = TRUE`;
    }
    query += ` ORDER BY name ASC;`;
    const res = await client.query<any>(query, values);
    return res.rows.map(this.mapLeaveType);
  }

  public static async createLeavePolicy(
    client: DbClient,
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
    rules: Omit<LeavePolicyRule, 'id' | 'leavePolicyId' | 'organizationId' | 'createdAt' | 'updatedAt'>[] = []
  ): Promise<LeavePolicy> {
    const res = await client.query<any>(
      `INSERT INTO leave_policies (
        organization_id, leave_type_id, name, employment_type, accrual_frequency, annual_allowance_days, max_carry_forward_days, min_service_days_required, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        policy.organizationId,
        policy.leaveTypeId,
        policy.name,
        policy.employmentType,
        policy.accrualFrequency || 'annual',
        policy.annualAllowanceDays,
        policy.maxCarryForwardDays ?? 0,
        policy.minServiceDaysRequired ?? 0,
        policy.isActive ?? true,
      ]
    );
    const created = this.mapLeavePolicy(res.rows[0]);

    for (const r of rules) {
      await client.query(
        `INSERT INTO leave_policy_rules (
          organization_id, leave_policy_id, rule_name, min_days_notice, max_consecutive_days, documentation_threshold_days, rule_configuration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          created.organizationId,
          created.id,
          r.ruleName,
          r.minDaysNotice ?? 0,
          r.maxConsecutiveDays ?? null,
          r.documentationThresholdDays ?? null,
          JSON.stringify(r.ruleConfiguration || {}),
        ]
      );
    }

    return created;
  }

  public static async findLeavePolicy(
    client: DbClient,
    organizationId: string,
    leaveTypeId: string,
    employmentType: string
  ): Promise<LeavePolicy | null> {
    const res = await client.query<any>(
      `SELECT * FROM leave_policies
       WHERE organization_id = $1 AND leave_type_id = $2 AND (employment_type = $3 OR employment_type = 'all')
       ORDER BY (employment_type = $3) DESC
       LIMIT 1;`,
      [organizationId, leaveTypeId, employmentType]
    );
    if (res.rows.length === 0) return null;
    return this.mapLeavePolicy(res.rows[0]);
  }

  public static async listLeavePolicies(
    client: DbClient,
    organizationId: string,
    leaveTypeId?: string
  ): Promise<LeavePolicy[]> {
    let query = `SELECT * FROM leave_policies WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    if (leaveTypeId) {
      query += ` AND leave_type_id = $2`;
      values.push(leaveTypeId);
    }
    query += ` ORDER BY name ASC;`;
    const res = await client.query<any>(query, values);
    return res.rows.map(this.mapLeavePolicy);
  }

  public static async findLeaveBalance(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    leaveTypeId: string,
    year: number
  ): Promise<LeaveBalance | null> {
    const res = await client.query<any>(
      `SELECT * FROM leave_balances
       WHERE organization_id = $1 AND employment_id = $2 AND leave_type_id = $3 AND year = $4;`,
      [organizationId, employmentId, leaveTypeId, year]
    );
    if (res.rows.length === 0) return null;
    return this.mapLeaveBalance(res.rows[0]);
  }

  public static async createLeaveBalance(
    client: DbClient,
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveBalance> {
    const res = await client.query<any>(
      `INSERT INTO leave_balances (
        organization_id, employment_id, person_id, leave_type_id, year, opening_balance, accrued_balance, adjusted_balance, used_balance, reserved_balance, available_balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;`,
      [
        balance.organizationId,
        balance.employmentId,
        balance.personId,
        balance.leaveTypeId,
        balance.year,
        balance.openingBalance,
        balance.accruedBalance,
        balance.adjustedBalance,
        balance.usedBalance,
        balance.reservedBalance,
        balance.availableBalance,
      ]
    );
    return this.mapLeaveBalance(res.rows[0]);
  }

  public static async updateLeaveBalance(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<LeaveBalance>
  ): Promise<LeaveBalance | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.openingBalance !== undefined) {
      setClauses.push(`opening_balance = $${idx++}`);
      values.push(fields.openingBalance);
    }
    if (fields.accruedBalance !== undefined) {
      setClauses.push(`accrued_balance = $${idx++}`);
      values.push(fields.accruedBalance);
    }
    if (fields.adjustedBalance !== undefined) {
      setClauses.push(`adjusted_balance = $${idx++}`);
      values.push(fields.adjustedBalance);
    }
    if (fields.usedBalance !== undefined) {
      setClauses.push(`used_balance = $${idx++}`);
      values.push(fields.usedBalance);
    }
    if (fields.reservedBalance !== undefined) {
      setClauses.push(`reserved_balance = $${idx++}`);
      values.push(fields.reservedBalance);
    }
    if (fields.availableBalance !== undefined) {
      setClauses.push(`available_balance = $${idx++}`);
      values.push(fields.availableBalance);
    }

    const res = await client.query<any>(
      `UPDATE leave_balances
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    return this.mapLeaveBalance(res.rows[0]);
  }

  public static async listLeaveBalances(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    year?: number
  ): Promise<LeaveBalance[]> {
    const where: string[] = ['organization_id = $1', 'employment_id = $2'];
    const values: any[] = [organizationId, employmentId];
    if (year) {
      where.push('year = $3');
      values.push(year);
    }

    const res = await client.query<any>(
      `SELECT * FROM leave_balances WHERE ${where.join(' AND ')} ORDER BY year DESC;`,
      values
    );
    return res.rows.map(this.mapLeaveBalance);
  }

  public static async createLeaveRequest(
    client: DbClient,
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'approvedByPersonId' | 'approvedAt' | 'rejectionReason' | 'cancellationReason'>
  ): Promise<LeaveRequest> {
    const res = await client.query<any>(
      `INSERT INTO leave_requests (
        organization_id, employment_id, person_id, leave_type_id, start_date, end_date, is_half_day, half_day_period, total_days, status, reason, attachment_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;`,
      [
        request.organizationId,
        request.employmentId,
        request.personId,
        request.leaveTypeId,
        request.startDate,
        request.endDate,
        request.isHalfDay ?? false,
        request.halfDayPeriod || null,
        request.totalDays,
        request.status || 'draft',
        request.reason,
        request.attachmentUrl || null,
      ]
    );
    return this.mapLeaveRequest(res.rows[0]);
  }

  public static async findLeaveRequestById(
    client: DbClient,
    organizationId: string,
    id: string
  ): Promise<LeaveRequest | null> {
    const res = await client.query<any>(
      `SELECT * FROM leave_requests WHERE organization_id = $1 AND id = $2;`,
      [organizationId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapLeaveRequest(res.rows[0]);
  }

  public static async updateLeaveRequest(
    client: DbClient,
    organizationId: string,
    id: string,
    fields: Partial<LeaveRequest>
  ): Promise<LeaveRequest | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [organizationId, id];
    let idx = 3;

    if (fields.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(fields.status);
    }
    if (fields.approvedByPersonId !== undefined) {
      setClauses.push(`approved_by_person_id = $${idx++}`);
      values.push(fields.approvedByPersonId);
    }
    if (fields.approvedAt !== undefined) {
      setClauses.push(`approved_at = $${idx++}`);
      values.push(fields.approvedAt);
    }
    if (fields.rejectionReason !== undefined) {
      setClauses.push(`rejection_reason = $${idx++}`);
      values.push(fields.rejectionReason);
    }
    if (fields.cancellationReason !== undefined) {
      setClauses.push(`cancellation_reason = $${idx++}`);
      values.push(fields.cancellationReason);
    }

    const res = await client.query<any>(
      `UPDATE leave_requests
       SET ${setClauses.join(', ')}
       WHERE organization_id = $1 AND id = $2
       RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    return this.mapLeaveRequest(res.rows[0]);
  }

  public static async listLeaveRequests(
    client: DbClient,
    organizationId: string,
    filters: {
      employmentId?: string;
      personId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<LeaveRequest[]> {
    const where: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let idx = 2;

    if (filters.employmentId) {
      where.push(`employment_id = $${idx++}`);
      values.push(filters.employmentId);
    }
    if (filters.personId) {
      where.push(`person_id = $${idx++}`);
      values.push(filters.personId);
    }
    if (filters.status) {
      where.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.startDate) {
      where.push(`end_date >= $${idx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push(`start_date <= $${idx++}`);
      values.push(filters.endDate);
    }

    const res = await client.query<any>(
      `SELECT * FROM leave_requests WHERE ${where.join(' AND ')} ORDER BY start_date DESC;`,
      values
    );
    return res.rows.map(this.mapLeaveRequest);
  }

  public static async checkOverlappingApprovedLeave(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    startDate: string,
    endDate: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = `
      SELECT id FROM leave_requests
      WHERE organization_id = $1
        AND employment_id = $2
        AND status IN ('submitted', 'approved')
        AND start_date <= $4
        AND end_date >= $3
    `;
    const values: any[] = [organizationId, employmentId, startDate, endDate];

    if (excludeId) {
      query += ` AND id != $5`;
      values.push(excludeId);
    }

    const res = await client.query<any>(query, values);
    return res.rows.length > 0;
  }

  public static async createLeaveRequestHistory(
    client: DbClient,
    history: Omit<LeaveRequestHistory, 'id' | 'createdAt'>
  ): Promise<LeaveRequestHistory> {
    const res = await client.query<any>(
      `INSERT INTO leave_request_history (
        organization_id, leave_request_id, from_status, to_status, actor_person_id, actor_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        history.organizationId,
        history.leaveRequestId,
        history.fromStatus || null,
        history.toStatus,
        history.actorPersonId || null,
        history.actorUserId || null,
        history.notes || null,
      ]
    );
    return this.mapLeaveRequestHistory(res.rows[0]);
  }

  public static async findLeaveRequestHistory(
    client: DbClient,
    organizationId: string,
    leaveRequestId: string
  ): Promise<LeaveRequestHistory[]> {
    const res = await client.query<any>(
      `SELECT * FROM leave_request_history
       WHERE organization_id = $1 AND leave_request_id = $2
       ORDER BY created_at ASC;`,
      [organizationId, leaveRequestId]
    );
    return res.rows.map(this.mapLeaveRequestHistory);
  }

  public static async findApprovedLeaveDays(
    client: DbClient,
    organizationId: string,
    employmentId: string,
    startDate: string,
    endDate: string
  ): Promise<LeaveRequest[]> {
    const res = await client.query<any>(
      `SELECT * FROM leave_requests
       WHERE organization_id = $1
         AND employment_id = $2
         AND status = 'approved'
         AND start_date <= $4
         AND end_date >= $3
       ORDER BY start_date ASC;`,
      [organizationId, employmentId, startDate, endDate]
    );
    return res.rows.map(this.mapLeaveRequest);
  }

  // ==========================================================================
  // MAPPER FUNCTIONS
  // ==========================================================================

  private static mapSchedule(row: any): WorkforceSchedule {
    return {
      id: row.id,
      organizationId: row.organization_id,
      branchId: row.branch_id,
      name: row.name,
      code: row.code,
      description: row.description,
      scheduleType: row.schedule_type,
      timezone: row.timezone,
      expectedWeeklyHours: parseFloat(row.expected_weekly_hours),
      isDefault: row.is_default,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapScheduleDay(row: any): WorkforceScheduleDay {
    return {
      id: row.id,
      organizationId: row.organization_id,
      scheduleId: row.schedule_id,
      dayOfWeek: row.day_of_week,
      isWorkingDay: row.is_working_day,
      startTime: row.start_time,
      endTime: row.end_time,
      breakDurationMinutes: row.break_duration_minutes,
      expectedHours: parseFloat(row.expected_hours),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapScheduleAssignment(row: any): WorkforceScheduleAssignment {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      scheduleId: row.schedule_id,
      effectiveFrom: row.effective_from instanceof Date ? row.effective_from.toISOString().split('T')[0] : String(row.effective_from).split('T')[0],
      effectiveTo: row.effective_to ? (row.effective_to instanceof Date ? row.effective_to.toISOString().split('T')[0] : String(row.effective_to).split('T')[0]) : null,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapHoliday(row: any): WorkforceHoliday {
    return {
      id: row.id,
      organizationId: row.organization_id,
      branchId: row.branch_id,
      holidayDate: row.holiday_date instanceof Date ? row.holiday_date.toISOString().split('T')[0] : String(row.holiday_date).split('T')[0],
      name: row.name,
      description: row.description,
      holidayType: row.holiday_type,
      isHalfDay: row.is_half_day,
      isOptional: row.is_optional,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapAttendanceRecord(row: any): AttendanceRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      attendanceDate: row.attendance_date instanceof Date ? row.attendance_date.toISOString().split('T')[0] : String(row.attendance_date).split('T')[0],
      status: row.status,
      totalPresenceMinutes: row.total_presence_minutes,
      totalBreakMinutes: row.total_break_minutes,
      totalWorkMinutes: row.total_work_minutes,
      isPunctual: row.is_punctual,
      hasMissingCheckout: row.has_missing_checkout,
      hasCorrection: row.has_correction,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapAttendanceSession(row: any): AttendanceSession {
    return {
      id: row.id,
      organizationId: row.organization_id,
      attendanceRecordId: row.attendance_record_id,
      checkInAt: row.check_in_at instanceof Date ? row.check_in_at : new Date(row.check_in_at),
      checkOutAt: row.check_out_at ? (row.check_out_at instanceof Date ? row.check_out_at : new Date(row.check_out_at)) : null,
      durationMinutes: row.duration_minutes !== null ? parseInt(row.duration_minutes, 10) : null,
      checkInIp: row.check_in_ip,
      checkOutIp: row.check_out_ip,
      deviceMetadata: typeof row.device_metadata === 'string' ? JSON.parse(row.device_metadata) : (row.device_metadata || {}),
      isManualEntry: row.is_manual_entry,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapAttendanceCorrection(row: any): AttendanceCorrection {
    return {
      id: row.id,
      organizationId: row.organization_id,
      attendanceRecordId: row.attendance_record_id,
      attendanceSessionId: row.attendance_session_id,
      originalCheckInAt: row.original_check_in_at ? new Date(row.original_check_in_at) : null,
      originalCheckOutAt: row.original_check_out_at ? new Date(row.original_check_out_at) : null,
      correctedCheckInAt: new Date(row.corrected_check_in_at),
      correctedCheckOutAt: new Date(row.corrected_check_out_at),
      status: row.status,
      reason: row.reason,
      requestedByUserId: row.requested_by_user_id,
      reviewedByPersonId: row.reviewed_by_person_id,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      reviewNotes: row.review_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapTimeRecord(row: any): WorkforceTimeRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      attendanceRecordId: row.attendance_record_id,
      attendanceSessionId: row.attendance_session_id,
      timeType: row.time_type,
      startedAt: new Date(row.started_at),
      endedAt: new Date(row.ended_at),
      durationMinutes: row.duration_minutes,
      isOvertime: row.is_overtime,
      overtimeStatus: row.overtime_status,
      overtimeApprovedByPersonId: row.overtime_approved_by_person_id,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapTimesheet(row: any): WorkforceTimesheet {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      periodStartDate: row.period_start_date instanceof Date ? row.period_start_date.toISOString().split('T')[0] : String(row.period_start_date).split('T')[0],
      periodEndDate: row.period_end_date instanceof Date ? row.period_end_date.toISOString().split('T')[0] : String(row.period_end_date).split('T')[0],
      status: row.status,
      totalRegularHours: parseFloat(row.total_regular_hours),
      totalBreakHours: parseFloat(row.total_break_hours),
      totalOvertimeHours: parseFloat(row.total_overtime_hours),
      totalBillableHours: parseFloat(row.total_billable_hours),
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
      approvedByPersonId: row.approved_by_person_id,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      rejectionReason: row.rejection_reason,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapTimesheetEntry(row: any): WorkforceTimesheetEntry {
    return {
      id: row.id,
      organizationId: row.organization_id,
      timesheetId: row.timesheet_id,
      timeRecordId: row.time_record_id,
      entryDate: row.entry_date instanceof Date ? row.entry_date.toISOString().split('T')[0] : String(row.entry_date).split('T')[0],
      timeType: row.time_type,
      durationMinutes: row.duration_minutes,
      hours: parseFloat(row.hours),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapLeaveType(row: any): LeaveType {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      isPaid: row.is_paid,
      requiresApproval: row.requires_approval,
      requiresDocumentation: row.requires_documentation,
      allowNegativeBalance: row.allow_negative_balance,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapLeavePolicy(row: any): LeavePolicy {
    return {
      id: row.id,
      organizationId: row.organization_id,
      leaveTypeId: row.leave_type_id,
      name: row.name,
      employmentType: row.employment_type,
      accrualFrequency: row.accrual_frequency,
      annualAllowanceDays: parseFloat(row.annual_allowance_days),
      maxCarryForwardDays: parseFloat(row.max_carry_forward_days),
      minServiceDaysRequired: row.min_service_days_required,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapLeaveBalance(row: any): LeaveBalance {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      leaveTypeId: row.leave_type_id,
      year: row.year,
      openingBalance: parseFloat(row.opening_balance),
      accruedBalance: parseFloat(row.accrued_balance),
      adjustedBalance: parseFloat(row.adjusted_balance),
      usedBalance: parseFloat(row.used_balance),
      reservedBalance: parseFloat(row.reserved_balance),
      availableBalance: parseFloat(row.available_balance),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapLeaveRequest(row: any): LeaveRequest {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      leaveTypeId: row.leave_type_id,
      startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : String(row.start_date).split('T')[0],
      endDate: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : String(row.end_date).split('T')[0],
      isHalfDay: row.is_half_day,
      halfDayPeriod: row.half_day_period,
      totalDays: parseFloat(row.total_days),
      status: row.status,
      reason: row.reason,
      attachmentUrl: row.attachment_url,
      approvedByPersonId: row.approved_by_person_id,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      rejectionReason: row.rejection_reason,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapLeaveRequestHistory(row: any): LeaveRequestHistory {
    return {
      id: row.id,
      organizationId: row.organization_id,
      leaveRequestId: row.leave_request_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      actorPersonId: row.actor_person_id,
      actorUserId: row.actor_user_id,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
