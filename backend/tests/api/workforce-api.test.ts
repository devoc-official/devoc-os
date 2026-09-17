import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EmploymentService } from '../../src/modules/people/application/employment.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 14 — Workforce Onboarding & Lifecycle Engine REST API Integration Tests', () => {
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
  let transferA: any;
  let promotionA: any;
  let offboardingA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // Org A setup
    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Workforce Test Org A',
      slug: 'workforce-test-org-a',
      adminEmail: 'wf-admin-a@devoc.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Workforce Admin A',
    });
    orgA = bootA.organization;
    adminUserA = bootA.adminUser;

    const loginAdminA = await AuthService.login('wf-admin-a@devoc.internal', 'Password123!');
    adminTokenA = loginAdminA.accessToken;

    // Org B setup for tenant isolation tests
    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Workforce Test Org B',
      slug: 'workforce-test-org-b',
      adminEmail: 'wf-admin-b@devoc.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Workforce Admin B',
    });
    orgB = bootB.organization;

    const loginAdminB = await AuthService.login('wf-admin-b@devoc.internal', 'Password123!');
    adminTokenB = loginAdminB.accessToken;

    // Org Member A (has workforce:create, workforce:manage, workforce:view, but NOT workforce:approve)
    const db = getDbClient();
    const memUserRes = await db.query<any>(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin)
       VALUES ('wf-member-a@devoc.internal', '$2a$10$abcdef', 'Member A', false)
       RETURNING *;`
    );
    memberUserA = memUserRes.rows[0];

    await db.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'org_member', 'active');`,
      [orgA.id, memberUserA.id]
    );

    const tokenRes = await AuthService.login('wf-admin-a@devoc.internal', 'Password123!');
    memberTokenA = AuthService.generateToken({
      id: memberUserA.id,
      email: memberUserA.email,
      fullName: memberUserA.full_name,
      isActive: true,
      isPlatformAdmin: false,
    });

    // Create test Person and Employment in Org A
    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Engineer',
      email: 'alice.wf@devoc.internal',
    });

    employmentA = await EmploymentService.createEmployment(orgA.id, {
      personId: personA.id,
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'Junior Software Engineer',
      startDate: new Date(),
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  // --- TRANSFERS ---

  it('1. POST /workforce/transfers — creates transfer request with workforce:create', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce/transfers`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        reason: 'Transfer to Core Infrastructure team',
        effectiveDate: '2026-10-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.organizationId).toBe(orgA.id);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.meta?.requestId).toBeDefined();
    transferA = res.body.data;
  });

  it('2. PATCH /workforce/transfers/:id/approve — org_member with workforce:manage cannot approve (requires workforce:approve)', async () => {
    const res = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce/transfers/${transferA.id}/approve`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .send({ status: 'approved', notes: 'Member attempting approval' });

    expect(res.status).toBe(403);
  });

  it('3. PATCH /workforce/transfers/:id/approve — org_admin with workforce:approve approves transfer', async () => {
    const res = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce/transfers/${transferA.id}/approve`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({ status: 'approved', notes: 'Transfer approved by VP Engineering' });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(transferA.id);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.meta?.requestId).toBeDefined();
  });

  // --- PROMOTIONS ---

  it('4. POST /workforce/promotions — creates promotion request with workforce:create', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce/promotions`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        sourceJobTitle: 'Junior Software Engineer',
        targetJobTitle: 'Senior Software Engineer',
        reason: 'Exceptional contributions across all milestones',
        effectiveDate: '2026-10-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.organizationId).toBe(orgA.id);
    expect(res.body.data.status).toBe('draft');
    promotionA = res.body.data;
  });

  it('5. PATCH /workforce/promotions/:id/approve — workforce:manage cannot approve, workforce:approve succeeds', async () => {
    // Member cannot approve
    const memRes = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce/promotions/${promotionA.id}/approve`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .send({ status: 'approved' });

    expect(memRes.status).toBe(403);

    // Admin with workforce:approve succeeds
    const adminRes = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce/promotions/${promotionA.id}/approve`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({ status: 'approved', notes: 'Promotion approved' });

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.status).toBe('approved');

    // Verify M2 employment jobTitle was updated
    const emp = await EmploymentService.getEmployment(orgA.id, employmentA.id);
    expect(emp.jobTitle).toBe('Senior Software Engineer');
  });

  // --- OFFBOARDINGS ---

  it('6. POST /workforce/offboardings — initiates offboarding with workforce:create', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/workforce/offboardings`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({
        employmentId: employmentA.id,
        personId: personA.id,
        exitReason: 'resignation',
        exitDate: '2026-10-15',
        notes: 'Voluntary resignation',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('initiated');
    offboardingA = res.body.data;
  });

  it('7. PATCH /workforce/offboardings/:id/complete — org_member rejected (403), admin with workforce:approve succeeds (200)', async () => {
    const memRes = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce/offboardings/${offboardingA.id}/complete`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .send({ notes: 'Clearances complete' });

    expect(memRes.status).toBe(403);

    const adminRes = await request(app)
      .patch(`/api/v1/organizations/${orgA.id}/workforce/offboardings/${offboardingA.id}/complete`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .send({ notes: 'All clearances confirmed, access revoked' });

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.status).toBe('completed');

    // Verify M2 employment transitioned to 'resigned'
    const emp = await EmploymentService.getEmployment(orgA.id, employmentA.id);
    expect(emp.status).toBe('resigned');
  });

  // --- TENANT DEFENSE ---

  it('8. Cross-tenant access — Org B cannot access or approve Org A transfer (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce/transfers/${transferA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('9. URL mismatch — Header Org A with URL Org B is rejected (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce/transfers`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(403);
  });
});
