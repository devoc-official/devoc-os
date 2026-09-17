import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('API Contracts & Operational Endpoints E2E Tests', () => {
  let app: any;
  let org: any;
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const res = await OrganizationService.bootstrapOrganization({
      name: 'Main Devoc Org',
      slug: 'main-devoc-org',
      adminEmail: 'boss@devoc.test',
      adminPassword: 'BossPassword123!',
      adminFullName: 'Big Boss',
    });
    org = res.organization;
    const adminLogin = await AuthService.login('boss@devoc.test', 'BossPassword123!');
    adminToken = adminLogin.accessToken;

    // Create normal member
    await AuthService.createUser({
      email: 'member@devoc.test',
      password: 'MemberPassword123!',
      fullName: 'Normal Member',
    });
    await OrganizationService.addMembership(org.id, { userEmail: 'member@devoc.test', role: 'org_member' });
    const memberLogin = await AuthService.login('member@devoc.test', 'MemberPassword123!');
    memberToken = memberLogin.accessToken;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/v1/health returns 200 pass envelope', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pass');
  });

  it('GET /api/v1/readiness returns database connectivity status', async () => {
    const res = await request(app).get('/api/v1/readiness');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pass');
    expect(res.body.data.database).toBe('connected');
  });

  it('GET /api/v1/auth/me returns authenticated user details and memberships', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('boss@devoc.test');
    expect(res.body.data.memberships).toHaveLength(1);
  });

  it('org_admin can create Business Unit, Department, Team, and view Audit Logs', async () => {
    // 1. Create Business Unit
    const buRes = await request(app)
      .post('/api/v1/business-units')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({ name: 'Academy Unit', code: 'BU-ACADEMY' });

    expect(buRes.status).toBe(201);
    expect(buRes.body.data.code).toBe('BU-ACADEMY');

    // 2. Create Department
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({ name: 'Education Dept', code: 'DEPT-EDU' });

    expect(deptRes.status).toBe(201);

    // 3. Create Team
    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Fumigation Team',
        code: 'TEAM-FUM',
        departmentId: deptRes.body.data.id,
        businessUnitId: buRes.body.data.id,
        isTemporary: true,
      });

    expect(teamRes.status).toBe(201);
    expect(teamRes.body.data.isTemporary).toBe(true);

    // 4. View Audit Logs (Recorded via domain event bus)
    const auditRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBeGreaterThan(0);
  });

  it('org_member is forbidden from performing admin operations (creating structure)', async () => {
    const res = await request(app)
      .post('/api/v1/business-units')
      .set('Authorization', `Bearer ${memberToken}`)
      .set('X-Organization-Id', org.id)
      .send({ name: 'Unauthorized Unit', code: 'BU-UNAUTH' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns standard error envelope for missing resources', async () => {
    const res = await request(app)
      .get('/api/v1/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBeDefined();
    expect(res.body.error.request_id).toBeDefined();
  });
});
