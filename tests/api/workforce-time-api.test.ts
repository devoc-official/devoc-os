import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EmploymentService } from '../../src/modules/people/application/employment.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 15 — Workforce Time, Attendance & Leave REST API Integration Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let adminUserA: any;
  let adminTokenA: string;
  let memberUserA: any;
  let memberTokenA: string;
  let adminTokenB: string;

  let personA: any;
  let employmentA: any;
  let scheduleA: any;
  let attendanceRecordA: any;
  let attendanceSessionA: any;
  let correctionA: any;
  let timeRecordA: any;
  let timesheetA: any;
  let leaveTypeA: any;
  let leavePolicyA: any;
  let leaveRequestA: any;
  let holidayA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // Org A setup
    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Workforce Time Org A',
      slug: 'wft-org-a',
      adminEmail: 'wft-admin-a@devoc.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Workforce Time Admin A',
    });
    orgA = bootA.organization;
    adminUserA = bootA.adminUser;

    const loginAdminA = await AuthService.login('wft-admin-a@devoc.internal', 'Password123!');
    adminTokenA = loginAdminA.accessToken;

    // Org B setup for tenant isolation
    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Workforce Time Org B',
      slug: 'wft-org-b',
      adminEmail: 'wft-admin-b@devoc.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Workforce Time Admin B',
    });
    orgB = bootB.organization;

    const loginAdminB = await AuthService.login('wft-admin-b@devoc.internal', 'Password123!');
    adminTokenB = loginAdminB.accessToken;

    // Org Member A (has view, create, manage, but NOT approve or admin)
    const db = getDbClient();
    const memUserRes = await db.query<any>(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin)
       VALUES ('wft-member-a@devoc.internal', '$2a$10$abcdef', 'Member A', false)
       RETURNING *;`
    );
    memberUserA = memUserRes.rows[0];

    await db.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'org_member', 'active');`,
      [orgA.id, memberUserA.id]
    );

    memberTokenA = AuthService.generateToken({
      id: memberUserA.id,
      email: memberUserA.email,
      fullName: memberUserA.full_name,
      isActive: true,
      isPlatformAdmin: false,
    });

    // Create Person and Employment in Org A
    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Charlie',
      lastName: 'Worker',
      email: 'charlie.wft@devoc.internal',
    });

    employmentA = await EmploymentService.createEmployment(orgA.id, {
      personId: personA.id,
      employmentType: 'full_time',
      jobTitle: 'Senior Software Engineer',
      startDate: '2026-01-01',
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  // ==========================================================================
  // 1. WORK SCHEDULES
  // ==========================================================================

  it('1. Create fixed schedule with working days — POST /schedules', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/schedules`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        name: 'Standard Engineering 40h',
        code: 'ENG-STD-40',
        description: 'Monday-Friday 09:00 to 17:00 with 1 hour break',
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
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.code).toBe('ENG-STD-40');
    expect(res.body.data.expectedWeeklyHours).toBe(40.0);
    expect(res.body.data.workingDays).toHaveLength(7);
    scheduleA = res.body.data;
  });

  it('2. Assign schedule to employment — POST /schedules/assignments', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/schedules/assignments`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        scheduleId: scheduleA.id,
        effectiveFrom: '2026-09-01',
        effectiveTo: '2026-12-31',
        notes: 'Assigned to Q3-Q4 standard hours',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.employmentId).toBe(employmentA.id);
    expect(res.body.data.scheduleId).toBe(scheduleA.id);
    expect(res.body.data.status).toBe('active');
  });

  it('3. Schedule Collision Invariant — overlapping active assignment rejected with 409', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/schedules/assignments`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        scheduleId: scheduleA.id,
        effectiveFrom: '2026-10-01',
        effectiveTo: '2026-11-30',
        notes: 'Conflicting assignment',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WORKFORCE_TIME_SCHEDULE_COLLISION');
  });

  // ==========================================================================
  // 2. ATTENDANCE & MULTI-SESSION TRACKING
  // ==========================================================================

  it('4. Attendance Check-in — POST /attendance/check-in', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/attendance/check-in`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        checkInAt: '2026-09-14T09:00:00.000Z',
        isWfh: false,
        deviceMetadata: { client: 'web' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attendanceRecord).toBeDefined();
    expect(res.body.data.session).toBeDefined();
    expect(res.body.data.attendanceRecord.status).toBe('present');
    expect(res.body.data.attendanceRecord.hasMissingCheckout).toBe(true);
    expect(res.body.data.session.checkOutAt).toBeNull();

    attendanceRecordA = res.body.data.attendanceRecord;
    attendanceSessionA = res.body.data.session;
  });

  it('5. Attendance Missing Check-out — new check-in before checkout rejected with 409', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/attendance/check-in`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        checkInAt: '2026-09-14T11:00:00.000Z',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WORKFORCE_TIME_MISSING_CHECKOUT');
  });

  it('6. Attendance Check-out — POST /attendance/check-out', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/attendance/check-out`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        checkOutAt: '2026-09-14T17:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.attendanceRecord.totalPresenceMinutes).toBe(480); // 8 hours = 480m
    expect(res.body.data.attendanceRecord.hasMissingCheckout).toBe(false);
    expect(res.body.data.session.durationMinutes).toBe(480);
    expect(res.body.data.attendanceRecord.status).toBe('present');
  });

  it('7. Request Attendance Correction — POST /attendance/:id/corrections', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/attendance/${attendanceRecordA.id}/corrections`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        attendanceSessionId: attendanceSessionA.id,
        correctedCheckInAt: '2026-09-14T08:30:00.000Z',
        correctedCheckOutAt: '2026-09-14T17:30:00.000Z',
        reason: 'Adjusted for morning transport delay and extra evening support',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.reason).toContain('Adjusted');
    correctionA = res.body.data;
  });

  it('8. Review Attendance Correction (Approve) — PATCH /attendance/corrections/:id/review', async () => {
    const res = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce-time/attendance/corrections/${correctionA.id}/review`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        action: 'approve',
        reviewNotes: 'Verified with security logs',
        reviewedByPersonId: personA.id,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  // ==========================================================================
  // 3. WORKFORCE TIME RECORDS
  // ==========================================================================

  it('9. Create explicit break and regular time records — POST /time-records', async () => {
    // 1. Regular morning time
    const resReg = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/time-records`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        attendanceRecordId: attendanceRecordA.id,
        timeType: 'regular',
        startedAt: '2026-09-14T09:00:00.000Z',
        endedAt: '2026-09-14T12:30:00.000Z',
        description: 'Morning core sprint work',
      });

    expect(resReg.status).toBe(201);
    expect(resReg.body.data.durationMinutes).toBe(210); // 3.5 hrs
    timeRecordA = resReg.body.data;

    // 2. Explicit break
    const resBreak = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/time-records`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        attendanceRecordId: attendanceRecordA.id,
        timeType: 'break',
        startedAt: '2026-09-14T12:30:00.000Z',
        endedAt: '2026-09-14T13:30:00.000Z',
        description: 'Lunch break',
      });

    expect(resBreak.status).toBe(201);
    expect(resBreak.body.data.timeType).toBe('break');
    expect(resBreak.body.data.durationMinutes).toBe(60);
  });

  it('10. Invalid timestamps rejected — POST /time-records with endedAt <= startedAt', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/time-records`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        timeType: 'regular',
        startedAt: '2026-09-14T15:00:00.000Z',
        endedAt: '2026-09-14T14:00:00.000Z', // Before start
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WORKFORCE_TIME_INVALID_TIMESTAMPS');
  });

  it('11. Overlapping regular time record rejected — POST /time-records', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/time-records`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        timeType: 'regular',
        startedAt: '2026-09-14T10:00:00.000Z', // Overlaps 09:00–12:30
        endedAt: '2026-09-14T11:00:00.000Z',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WORKFORCE_TIME_OVERLAPPING_TIME_RECORD');
  });

  // ==========================================================================
  // 4. TIMESHEETS
  // ==========================================================================

  it('12. Timesheet Lifecycle (Draft -> Submit -> Approve -> Immutability) — /timesheets', async () => {
    // 1. Create draft timesheet
    const resCreate = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        periodStartDate: '2026-09-14',
        periodEndDate: '2026-09-20',
        notes: 'Week 38 Timesheet',
      });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.data.status).toBe('draft');
    timesheetA = resCreate.body.data;

    // 2. Submit timesheet
    const resSubmit = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets/${timesheetA.id}/submit`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({});

    expect(resSubmit.status).toBe(200);
    expect(resSubmit.body.data.status).toBe('submitted');

    // 3. Approve timesheet
    const resApprove = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets/${timesheetA.id}/approve`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        approvedByPersonId: personA.id,
        notes: 'Sign-off complete',
      });

    expect(resApprove.status).toBe(200);
    expect(resApprove.body.data.status).toBe('approved');

    // 4. Immutability check: cannot re-submit approved timesheet
    const resReSubmit = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets/${timesheetA.id}/submit`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({});

    expect(resReSubmit.status).toBe(422);
    expect(resReSubmit.body.error.code).toBe('WORKFORCE_TIME_INVALID_STATE_TRANSITION');
  });

  // ==========================================================================
  // 5. LEAVE ENGINE & BALANCES
  // ==========================================================================

  it('13. Leave Engine (Type, Policy, Balance Adjustment & Request Lifecycle)', async () => {
    // 1. Create leave type
    const resType = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-types`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        name: 'Annual Paid Leave',
        code: 'ANNUAL-PAID',
        description: 'Standard vacation entitlement',
        isPaid: true,
        requiresApproval: true,
        allowNegativeBalance: false,
      });

    expect(resType.status).toBe(201);
    expect(resType.body.data.code).toBe('ANNUAL-PAID');
    leaveTypeA = resType.body.data;

    // 2. Create leave policy
    const resPolicy = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-policies`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        leaveTypeId: leaveTypeA.id,
        name: 'Full-Time Annual Policy',
        employmentType: 'full_time',
        annualAllowanceDays: 20.0,
        maxCarryForwardDays: 5.0,
      });

    expect(resPolicy.status).toBe(201);
    leavePolicyA = resPolicy.body.data;

    // 3. Adjust leave balance manually
    const resBal = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-balances/adjust`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        leaveTypeId: leaveTypeA.id,
        year: 2026,
        adjustmentDays: 10.0, // Grants 10 days
        reason: 'Mid-year pro-rata allocation',
      });

    expect(resBal.status).toBe(200);
    expect(resBal.body.data.availableBalance).toBe(10.0);

    // 4. Create and auto-submit leave request (reserves balance)
    const resReq = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-requests`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        leaveTypeId: leaveTypeA.id,
        startDate: '2026-10-12',
        endDate: '2026-10-14',
        totalDays: 3.0,
        reason: 'Family vacation',
        autoSubmit: true,
      });

    expect(resReq.status).toBe(201);
    expect(resReq.body.data.status).toBe('submitted');
    leaveRequestA = resReq.body.data;

    // Verify balance reserved
    const resBalCheck = await request(app)
      .get(`/api/v1/organizations/${orgA.id}/workforce-time/leave-balances?employmentId=${employmentA.id}&year=2026`)
      .set('Authorization', `Bearer ${adminTokenA}`);

    expect(resBalCheck.status).toBe(200);
    const balRow = resBalCheck.body.data.find((b: any) => b.leaveTypeId === leaveTypeA.id);
    expect(balRow.reservedBalance).toBe(3.0);
    expect(balRow.availableBalance).toBe(7.0);

    // 5. Approve leave request (commits reserved to used)
    const resApproveLeave = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce-time/leave-requests/${leaveRequestA.id}/approve`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        approvedByPersonId: personA.id,
        notes: 'Approved',
      });

    expect(resApproveLeave.status).toBe(200);
    expect(resApproveLeave.body.data.status).toBe('approved');

    // Verify balance committed
    const resBalAfterApprove = await request(app)
      .get(`/api/v1/organizations/${orgA.id}/workforce-time/leave-balances?employmentId=${employmentA.id}&year=2026`)
      .set('Authorization', `Bearer ${adminTokenA}`);

    const balRowApproved = resBalAfterApprove.body.data.find((b: any) => b.leaveTypeId === leaveTypeA.id);
    expect(balRowApproved.reservedBalance).toBe(0.0);
    expect(balRowApproved.usedBalance).toBe(3.0);
    expect(balRowApproved.availableBalance).toBe(7.0);
  });

  it('14. Insufficient leave balance rejected with 422', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-requests`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        leaveTypeId: leaveTypeA.id,
        startDate: '2026-11-01',
        endDate: '2026-11-20',
        totalDays: 20.0, // Exceeds available (7 days)
        reason: 'Excessive leave request',
        autoSubmit: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('WORKFORCE_TIME_INSUFFICIENT_LEAVE_BALANCE');
  });

  // ==========================================================================
  // 6. HOLIDAYS & AVAILABILITY PROJECTION
  // ==========================================================================

  it('15. Create Holiday & Availability Projection — GET /availability', async () => {
    // 1. Create org holiday on a Wednesday (2026-10-21)
    const resHol = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/holidays`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        holidayDate: '2026-10-21',
        name: 'National Innovation Day',
        holidayType: 'public',
        isHalfDay: false,
      });

    expect(resHol.status).toBe(201);
    holidayA = resHol.body.data;

    // 2. Query availability for October 2026 (2026-10-01 to 2026-10-31)
    // In October 2026:
    // Calendar days = 31
    // Mon-Fri scheduled days = 22 days = 176 hours
    // Holiday on Oct 21 = 1 holiday day = 8 hours
    // Approved leave Oct 12-14 = 3 days = 24 hours
    // Net Available = 22 - 1 - 3 = 18 days = 144 hours
    const resAvail = await request(app)
      .get(`/api/v1/organizations/${orgA.id}/workforce-time/availability?employmentId=${employmentA.id}&startDate=2026-10-01&endDate=2026-10-31`)
      .set('Authorization', `Bearer ${adminTokenA}`);

    expect(resAvail.status).toBe(200);
    expect(resAvail.body.data.totalCalendarDays).toBe(31);
    expect(resAvail.body.data.scheduledWorkingDays).toBe(22);
    expect(resAvail.body.data.holidayDays).toBe(1);
    expect(resAvail.body.data.approvedLeaveDays).toBe(3);
    expect(resAvail.body.data.netAvailableDays).toBe(18);
    expect(resAvail.body.data.netAvailableHours).toBe(144);
  });

  // ==========================================================================
  // 7. CAPABILITY AUTHORIZATION ENFORCEMENT
  // ==========================================================================

  it('16. Authorization boundary — org_member lacking workforce_time:approve cannot approve timesheets', async () => {
    // Create new draft timesheet
    const resSheet = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets`)
      .set('Authorization', `Bearer ${memberTokenA}`) // Member can create
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        periodStartDate: '2026-09-21',
        periodEndDate: '2026-09-27',
      });

    expect(resSheet.status).toBe(201);
    const sheetId = resSheet.body.data.id;

    // Member submits
    await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets/${sheetId}/submit`)
      .set('Authorization', `Bearer ${memberTokenA}`);

    // Member attempts to approve — MUST FAIL with 403 Forbidden
    const resForbidden = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets/${sheetId}/approve`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .send({ approvedByPersonId: personA.id });

    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.error.message).toContain('workforce_time:approve');
  });
});
