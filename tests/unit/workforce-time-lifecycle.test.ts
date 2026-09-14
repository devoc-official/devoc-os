import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EmploymentService } from '../../src/modules/people/application/employment.service.js';
import { WorkforceTimeService } from '../../src/modules/workforce-time/application/workforce-time.service.js';
import { EventRegistryService } from '../../src/events/event-registry.js';
import {
  WorkforceTimeInsufficientLeaveBalanceError,
  WorkforceTimeInvalidStateTransitionError,
  WorkforceTimeInvalidTimestampsError,
} from '../../src/modules/workforce-time/domain/workforce-time.errors.js';

describe('Milestone 15 — Workforce Time Engine Lifecycle Unit Tests', () => {
  let org: any;
  let adminUser: any;
  let person: any;
  let employment: any;
  let approverPerson: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    await EventRegistryService.seedEventRegistry();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Workforce Time Unit Org',
      slug: 'wft-unit-org',
      adminEmail: 'admin@wftunit.internal',
      adminPassword: 'Password123!',
      adminFullName: 'WFT Unit Admin',
    });
    org = boot.organization;
    adminUser = boot.adminUser;

    approverPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Manager',
      lastName: 'Approver',
      email: 'approver@wftunit.internal',
    });

    person = await PeopleService.createPerson(org.id, {
      firstName: 'Alice',
      lastName: 'Engineer',
      email: 'alice.engineer@wftunit.internal',
    });

    employment = await EmploymentService.createEmployment(org.id, {
      personId: person.id,
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'Principal Software Engineer',
      startDate: new Date('2026-01-01'),
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('1. Work Schedules Lifecycle & Assignments', () => {
    let schedule: any;

    it('creates fixed work schedule with 7-day configuration and expected weekly hours', async () => {
      schedule = await WorkforceTimeService.createSchedule(org.id, {
        name: 'Standard Engineering 40h',
        code: 'ENG-STD-40',
        scheduleType: 'fixed',
        timezone: 'UTC',
        expectedWeeklyHours: 40.0,
        isDefault: true,
        workingDays: [
          { dayOfWeek: 1, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
          { dayOfWeek: 2, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
          { dayOfWeek: 3, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
          { dayOfWeek: 4, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
          { dayOfWeek: 5, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
          { dayOfWeek: 6, isWorkingDay: false, expectedHours: 0.0 },
          { dayOfWeek: 0, isWorkingDay: false, expectedHours: 0.0 },
        ],
      }, approverPerson.id);

      expect(schedule.id).toBeDefined();
      expect(schedule.code).toBe('ENG-STD-40');
      expect(schedule.isActive).toBe(true);
      expect(schedule.workingDays).toHaveLength(7);

      // Assign schedule to employment
      const assignment = await WorkforceTimeService.assignSchedule(org.id, {
        scheduleId: schedule.id,
        employmentId: employment.id,
        personId: person.id,
        effectiveFrom: '2026-01-01',
      }, approverPerson.id);

      expect(assignment.id).toBeDefined();
      expect(assignment.scheduleId).toBe(schedule.id);
      expect(assignment.status).toBe('active');
    });

    it('updates work schedule active state to deactivate it', async () => {
      const tempSchedule = await WorkforceTimeService.createSchedule(org.id, {
        name: 'Temporary Flex Shift',
        code: 'FLEX-TEMP-35',
        scheduleType: 'flexible',
        timezone: 'UTC',
        expectedWeeklyHours: 35.0,
      }, approverPerson.id);

      const deactivated = await WorkforceTimeService.updateSchedule(org.id, tempSchedule.id, {
        isActive: false,
      }, approverPerson.id);

      expect(deactivated.isActive).toBe(false);

      const fetched = await WorkforceTimeService.getSchedule(org.id, tempSchedule.id);
      expect(fetched.isActive).toBe(false);
    });
  });

  describe('2. Multi-Session Attendance & Explicit Break Tracking', () => {
    let attendanceRecord: any;
    let attendanceSession: any;
    let correction: any;

    it('handles check-in, explicit break time record, and check-out tracking duration', async () => {
      // 1. First Check-in morning
      const checkInRes = await WorkforceTimeService.checkIn(org.id, {
        employmentId: employment.id,
        personId: person.id,
        checkInAt: '2026-03-02T09:00:00.000Z',
        isWfh: false,
        deviceMetadata: { client: 'web-portal' },
      });

      expect(checkInRes.attendanceRecord.status).toBe('present');
      expect(checkInRes.attendanceRecord.hasMissingCheckout).toBe(true);
      attendanceRecord = checkInRes.attendanceRecord;
      attendanceSession = checkInRes.session;

      // 2. Record explicit break time record (45 minutes)
      const breakRecord = await WorkforceTimeService.createTimeRecord(org.id, {
        employmentId: employment.id,
        personId: person.id,
        attendanceRecordId: attendanceRecord.id,
        attendanceSessionId: attendanceSession.id,
        timeType: 'break',
        startedAt: '2026-03-02T12:00:00.000Z',
        endedAt: '2026-03-02T12:45:00.000Z',
        description: 'Midday lunch break',
      });
      expect(breakRecord.timeType).toBe('break');
      expect(breakRecord.durationMinutes).toBe(45);

      // 3. Record regular sprint time record (3 hours)
      const regularRecord = await WorkforceTimeService.createTimeRecord(org.id, {
        employmentId: employment.id,
        personId: person.id,
        attendanceRecordId: attendanceRecord.id,
        attendanceSessionId: attendanceSession.id,
        timeType: 'regular',
        startedAt: '2026-03-02T09:00:00.000Z',
        endedAt: '2026-03-02T12:00:00.000Z',
        description: 'Morning architecture and coding',
      });
      expect(regularRecord.timeType).toBe('regular');
      expect(regularRecord.durationMinutes).toBe(180);

      // 4. Check out afternoon at 17:00
      const checkOutRes = await WorkforceTimeService.checkOut(org.id, {
        employmentId: employment.id,
        personId: person.id,
        checkOutAt: '2026-03-02T17:00:00.000Z',
      });

      expect(checkOutRes.session.durationMinutes).toBe(480); // 8 hours total duration
      expect(checkOutRes.attendanceRecord.totalPresenceMinutes).toBe(480);
      expect(checkOutRes.attendanceRecord.hasMissingCheckout).toBe(false);
    });

    it('submits and reviews attendance correction request', async () => {
      // Submit correction
      correction = await WorkforceTimeService.requestCorrection(org.id, attendanceRecord.id, {
        attendanceSessionId: attendanceSession.id,
        correctedCheckInAt: '2026-03-02T08:50:00.000Z',
        correctedCheckOutAt: '2026-03-02T17:00:00.000Z',
        reason: 'Keycard reader delay at entrance turnstile',
      }, adminUser.id);

      expect(correction.status).toBe('pending');
      expect(correction.reason).toContain('Keycard');

      // Approve correction
      const approvedCorrection = await WorkforceTimeService.reviewCorrection(org.id, correction.id, {
        action: 'approve',
        reviewNotes: 'Verified with building security guard',
        reviewedByPersonId: approverPerson.id,
      }, approverPerson.id);

      expect(approvedCorrection.status).toBe('approved');
      expect(approvedCorrection.reviewedByPersonId).toBe(approverPerson.id);
    });
  });

  describe('3. Timesheet State Transitions & Integrity', () => {
    let timesheet: any;

    it('manages draft -> submitted -> approved transition and enforces immutability', async () => {
      // Create draft timesheet covering 2026-03-01 to 2026-03-07
      timesheet = await WorkforceTimeService.createTimesheet(org.id, {
        employmentId: employment.id,
        personId: person.id,
        periodStartDate: '2026-03-01',
        periodEndDate: '2026-03-07',
        notes: 'Sprint 24 Timesheet',
      }, person.id);

      expect(timesheet.status).toBe('draft');
      // Rolled up from time records created on 2026-03-02: 3 hours regular, 0.75 hours break
      expect(timesheet.totalRegularHours).toBe(3);
      expect(timesheet.totalBreakHours).toBe(0.75);

      // Submit timesheet
      const submitted = await WorkforceTimeService.submitTimesheet(org.id, timesheet.id, person.id);
      expect(submitted.status).toBe('submitted');
      expect(submitted.submittedAt).toBeDefined();

      // Attempting to submit an already submitted timesheet fails
      await expect(
        WorkforceTimeService.submitTimesheet(org.id, timesheet.id, person.id)
      ).rejects.toThrow(WorkforceTimeInvalidStateTransitionError);

      // Approve timesheet
      const approved = await WorkforceTimeService.approveTimesheet(org.id, timesheet.id, {
        approvedByPersonId: approverPerson.id,
        notes: 'Approved without remarks',
      }, approverPerson.id);

      expect(approved.status).toBe('approved');
      expect(approved.approvedByPersonId).toBe(approverPerson.id);

      // Cannot re-submit or reject an approved timesheet
      await expect(
        WorkforceTimeService.submitTimesheet(org.id, timesheet.id, person.id)
      ).rejects.toThrow(WorkforceTimeInvalidStateTransitionError);
    });
  });

  describe('4. Leave Engine: Balance Reservation Math', () => {
    let leaveType: any;
    let leavePolicy: any;

    it('creates leave type, policy, and allocates annual balance', async () => {
      leaveType = await WorkforceTimeService.createLeaveType(org.id, {
        name: 'Paid Time Off',
        code: 'PTO-ANNUAL',
        description: 'Standard vacation entitlement',
        isPaid: true,
        requiresApproval: true,
        allowNegativeBalance: false,
      }, approverPerson.id);

      expect(leaveType.id).toBeDefined();

      leavePolicy = await WorkforceTimeService.createLeavePolicy(org.id, {
        leaveTypeId: leaveType.id,
        name: 'Full-Time 20 Days PTO Policy',
        employmentType: 'full_time',
        annualAllowanceDays: 20.0,
        maxCarryForwardDays: 5.0,
      }, approverPerson.id);

      expect(leavePolicy.id).toBeDefined();

      // Allocate balance
      const balance = await WorkforceTimeService.adjustLeaveBalance(org.id, {
        employmentId: employment.id,
        personId: person.id,
        leaveTypeId: leaveType.id,
        year: 2026,
        adjustmentDays: 20.0,
        reason: 'Initial 2026 annual entitlement allocation',
      }, approverPerson.id);

      expect(balance.adjustedBalance).toBe(20.0);
      expect(balance.usedBalance).toBe(0.0);
      expect(balance.reservedBalance).toBe(0.0);
      expect(balance.availableBalance).toBe(20.0);
    });

    it('reserves days on leave request submission and updates available days atomically', async () => {
      // Alice requests 3 days off with autoSubmit: true
      const req = await WorkforceTimeService.createLeaveRequest(org.id, {
        employmentId: employment.id,
        personId: person.id,
        leaveTypeId: leaveType.id,
        startDate: '2026-04-10',
        endDate: '2026-04-12',
        totalDays: 3.0,
        reason: 'Family celebration',
        autoSubmit: true,
      }, person.id);

      expect(req.status).toBe('submitted');
      expect(req.totalDays).toBe(3.0);

      // Check balance: reserved should be 3, available should be 17
      const balances = await WorkforceTimeService.listLeaveBalances(org.id, employment.id, 2026);
      const bal = balances.find((b: any) => b.leaveTypeId === leaveType.id);
      expect(bal).toBeDefined();
      expect(bal?.reservedBalance).toBe(3.0);
      expect(bal?.usedBalance).toBe(0.0);
      expect(bal?.availableBalance).toBe(17.0);

      // Now approve the leave request
      const approved = await WorkforceTimeService.approveLeaveRequest(org.id, req.id, {
        approvedByPersonId: approverPerson.id,
        notes: 'Approved, enjoy your time!',
      }, approverPerson.id);

      expect(approved.status).toBe('approved');

      // Check balance: reserved should drop to 0, used should increase to 3, available should remain 17
      const balancesAfterApprove = await WorkforceTimeService.listLeaveBalances(org.id, employment.id, 2026);
      const balApproved = balancesAfterApprove.find((b: any) => b.leaveTypeId === leaveType.id);
      expect(balApproved?.reservedBalance).toBe(0.0);
      expect(balApproved?.usedBalance).toBe(3.0);
      expect(balApproved?.availableBalance).toBe(17.0);
    });

    it('restores reserved days when a pending leave request is rejected', async () => {
      // Alice requests 5 days off
      const req2 = await WorkforceTimeService.createLeaveRequest(org.id, {
        employmentId: employment.id,
        personId: person.id,
        leaveTypeId: leaveType.id,
        startDate: '2026-05-01',
        endDate: '2026-05-05',
        totalDays: 5.0,
        reason: 'Vacation trip',
        autoSubmit: true,
      }, person.id);

      const balancesMid = await WorkforceTimeService.listLeaveBalances(org.id, employment.id, 2026);
      const balMid = balancesMid.find((b: any) => b.leaveTypeId === leaveType.id);
      expect(balMid?.reservedBalance).toBe(5.0);
      expect(balMid?.availableBalance).toBe(12.0); // 20 - 3 - 5 = 12

      // Reject the leave request
      const rejected = await WorkforceTimeService.rejectLeaveRequest(org.id, req2.id, {
        rejectionReason: 'Critical release blackout window',
      }, approverPerson.id);

      expect(rejected.status).toBe('rejected');

      // Reserved days should drop back to 0, available should return to 17
      const balancesAfterReject = await WorkforceTimeService.listLeaveBalances(org.id, employment.id, 2026);
      const balRejected = balancesAfterReject.find((b: any) => b.leaveTypeId === leaveType.id);
      expect(balRejected?.reservedBalance).toBe(0.0);
      expect(balRejected?.usedBalance).toBe(3.0);
      expect(balRejected?.availableBalance).toBe(17.0);
    });

    it('rejects leave request that exceeds available balance when policy disallows negative balance', async () => {
      await expect(
        WorkforceTimeService.createLeaveRequest(org.id, {
          employmentId: employment.id,
          personId: person.id,
          leaveTypeId: leaveType.id,
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          totalDays: 25.0, // only 17 available
          reason: 'Extended vacation',
          autoSubmit: true,
        }, person.id)
      ).rejects.toThrow(WorkforceTimeInsufficientLeaveBalanceError);
    });
  });

  describe('5. Transaction Rollback & Zero Outbox Event Leakage', () => {
    it('rolls back database transaction and writes 0 outbox events if validation fails midway', async () => {
      const db = getDbClient();
      const initialOutboxCount = parseInt(
        (await db.query(`SELECT COUNT(*) FROM event_outbox WHERE organization_id = $1`, [org.id])).rows[0].count,
        10
      );

      // Attempt an operation with invalid timestamps (endedAt < startedAt)
      await expect(
        WorkforceTimeService.createTimeRecord(org.id, {
          employmentId: employment.id,
          personId: person.id,
          timeType: 'regular',
          startedAt: '2026-07-10T14:00:00.000Z',
          endedAt: '2026-07-10T12:00:00.000Z', // INVALID
        }, person.id)
      ).rejects.toThrow(WorkforceTimeInvalidTimestampsError);

      const finalOutboxCount = parseInt(
        (await db.query(`SELECT COUNT(*) FROM event_outbox WHERE organization_id = $1`, [org.id])).rows[0].count,
        10
      );

      // Count of outbox events must remain strictly identical
      expect(finalOutboxCount).toBe(initialOutboxCount);
    });
  });

  describe('6. Holidays & Availability Projection', () => {
    it('creates holiday and projects net availability reflecting schedule, holidays, and leave', async () => {
      const holiday = await WorkforceTimeService.createHoliday(org.id, {
        name: 'Spring Festival Holiday',
        holidayDate: '2026-10-21',
        isHalfDay: false,
        isOptional: false,
      }, approverPerson.id);

      expect(holiday.id).toBeDefined();

      // Query availability for October 2026 (2026-10-01 to 2026-10-31)
      // In October 2026:
      // Total Calendar Days = 31
      // Mon-Fri scheduled days = 22 days = 176 hours
      // Holiday on Oct 21 = 1 holiday day = 8 hours
      // Net Available = 22 - 1 = 21 days = 168 hours
      const avail = await WorkforceTimeService.getAvailability(
        org.id,
        employment.id,
        '2026-10-01',
        '2026-10-31'
      );

      expect(avail.employmentId).toBe(employment.id);
      expect(avail.totalCalendarDays).toBe(31);
      expect(avail.scheduledWorkingDays).toBe(22);
      expect(avail.holidayDays).toBe(1);
      expect(avail.netAvailableDays).toBe(21);
      expect(avail.netAvailableHours).toBe(168);
    });
  });
});
