import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EmploymentService } from '../../src/modules/people/application/employment.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { EventRegistryService } from '../../src/events/event-registry.js';

describe('Milestone 15 — Workforce Time Engine Multi-Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let adminTokenA: string;
  let adminTokenB: string;
  let personA: any;
  let personB: any;
  let employmentA: any;
  let employmentB: any;

  // Org A Resources
  let scheduleA: any;
  let attendanceRecordA: any;
  let timeRecordA: any;
  let timesheetA: any;
  let leaveTypeA: any;
  let leaveRequestA: any;
  let holidayA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    await EventRegistryService.seedEventRegistry();

    app = createApp();

    // Bootstrap Org A
    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Tenant A Workforce',
      slug: 'tenant-a-workforce',
      adminEmail: 'admin@tenant-a-wft.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Tenant A',
    });
    orgA = bootA.organization;
    const loginA = await AuthService.login('admin@tenant-a-wft.internal', 'Password123!');
    adminTokenA = loginA.accessToken;

    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'TenantA',
      email: 'alice@tenant-a-wft.internal',
    });

    employmentA = await EmploymentService.createEmployment(orgA.id, {
      personId: personA.id,
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'Senior Platform Engineer',
      startDate: new Date('2026-01-01'),
    });

    // Bootstrap Org B
    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Tenant B Workforce',
      slug: 'tenant-b-workforce',
      adminEmail: 'admin@tenant-b-wft.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Tenant B',
    });
    orgB = bootB.organization;
    const loginB = await AuthService.login('admin@tenant-b-wft.internal', 'Password123!');
    adminTokenB = loginB.accessToken;

    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'TenantB',
      email: 'bob@tenant-b-wft.internal',
    });

    employmentB = await EmploymentService.createEmployment(orgB.id, {
      personId: personB.id,
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'Product Manager',
      startDate: new Date('2026-01-01'),
    });

    // Seed Resources in Org A
    // 1. Schedule
    const resSched = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/schedules`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        name: 'Org A Shift',
        code: 'SHIFT-A-01',
        scheduleType: 'fixed',
        timezone: 'UTC',
        expectedWeeklyHours: 40.0,
      });
    scheduleA = resSched.body.data;

    // 2. Attendance
    const resAtt = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/attendance/check-in`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        checkInAt: '2026-09-14T09:00:00.000Z',
      });
    attendanceRecordA = resAtt.body.data.attendanceRecord;

    // 3. Time Record
    const resTime = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/time-records`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        attendanceRecordId: attendanceRecordA.id,
        timeType: 'regular',
        startedAt: '2026-09-14T09:00:00.000Z',
        endedAt: '2026-09-14T12:00:00.000Z',
      });
    timeRecordA = resTime.body.data;

    // 4. Timesheet
    const resSheet = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/timesheets`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        periodStartDate: '2026-09-14',
        periodEndDate: '2026-09-20',
      });
    timesheetA = resSheet.body.data;

    // 5. Leave Type & Policy & Balance & Request
    const resType = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-types`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        name: 'Org A PTO',
        code: 'PTO-A',
        isPaid: true,
        requiresApproval: true,
      });
    leaveTypeA = resType.body.data;

    await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-policies`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        leaveTypeId: leaveTypeA.id,
        name: 'Org A Policy',
        employmentType: 'full_time',
        annualAllowanceDays: 20.0,
      });

    await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-balances/adjust`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        leaveTypeId: leaveTypeA.id,
        year: 2026,
        adjustmentDays: 15.0,
        reason: 'Initial allocation',
      });

    const resReq = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/leave-requests`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        leaveTypeId: leaveTypeA.id,
        startDate: '2026-10-05',
        endDate: '2026-10-07',
        totalDays: 3.0,
        reason: 'Personal time',
      });
    leaveRequestA = resReq.body.data;

    // 6. Holiday
    const resHol = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce-time/holidays`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        name: 'Org A Holiday',
        holidayDate: '2026-10-15',
      });
    holidayA = resHol.body.data;
  });

  afterAll(async () => {
    await closeDb();
  });

  // ==========================================================================
  // 1. CROSS-TENANT RESOURCE ISOLATION (404 Not Found Defense)
  // ==========================================================================

  it('1. GET /schedules/:id — Org B user cannot access Org A schedule (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce-time/schedules/${scheduleA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('2. GET /attendance/:id — Org B user cannot access Org A attendance (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce-time/attendance/${attendanceRecordA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('3. GET /timesheets/:id — Org B user cannot access Org A timesheet (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce-time/timesheets/${timesheetA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('4. GET /leave-types/:id — Org B user cannot access Org A leave type (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce-time/leave-types/${leaveTypeA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('5. GET /leave-requests/:id — Org B user cannot access Org A leave request (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce-time/leave-requests/${leaveRequestA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('6. GET /holidays/:id — Org B user cannot access Org A holiday (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce-time/holidays/${holidayA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  // ==========================================================================
  // 2. CROSS-TENANT MUTATION DEFENSE (404 Not Found)
  // ==========================================================================

  it('7. PATCH /timesheets/:id/submit — Org B user cannot submit Org A timesheet (404)', async () => {
    const res = await request(app)
      .patch(`/api/v1/organizations/${orgB.id}/workforce-time/timesheets/${timesheetA.id}/submit`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .send({});

    expect(res.status).toBe(404);
  });

  it('8. PATCH /leave-requests/:id/approve — Org B user cannot approve Org A leave request (404)', async () => {
    const res = await request(app)
      .patch(`/api/v1/organizations/${orgB.id}/workforce-time/leave-requests/${leaveRequestA.id}/approve`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .send({ approvedByPersonId: personB.id });

    expect(res.status).toBe(404);
  });

  // ==========================================================================
  // 3. CROSS-TENANT FOREIGN REFERENCE INJECTION DEFENSE (404)
  // ==========================================================================

  it('9. POST /schedules/assignments — Assigning Org A schedule in Org B is rejected (404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/workforce-time/schedules/assignments`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .send({
        employmentId: employmentB.id,
        personId: personB.id,
        scheduleId: scheduleA.id, // Org A schedule!
        effectiveFrom: '2026-09-01',
      });

    expect(res.status).toBe(404);
  });

  it('10. POST /attendance/check-in — Check-in with Org A person in Org B is rejected (404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/workforce-time/attendance/check-in`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .send({
        employmentId: employmentB.id,
        personId: personA.id, // Org A person!
        checkInAt: '2026-09-15T09:00:00.000Z',
      });

    expect(res.status).toBe(404);
  });

  it('11. POST /leave-requests — Requesting leave with Org A leave type in Org B is rejected (404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/workforce-time/leave-requests`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .send({
        employmentId: employmentB.id,
        personId: personB.id,
        leaveTypeId: leaveTypeA.id, // Org A leave type!
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        totalDays: 2.0,
        reason: 'Invalid cross-tenant request',
      });

    expect(res.status).toBe(404);
  });

  // ==========================================================================
  // 4. CROSS-TENANT TOKEN/ORGANIZATION MISMATCH DEFENSE (403 Forbidden)
  // ==========================================================================

  it('12. Org A token targeting Org B route is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce-time/schedules`)
      .set('Authorization', `Bearer ${adminTokenA}`);

    expect(res.status).toBe(403);
  });
});
