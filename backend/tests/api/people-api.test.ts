import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('People Engine REST API Endpoints E2E Tests', () => {
  let app: any;
  let org: any;
  let adminToken: string;
  let managerPerson: any;
  let employeePerson: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const res = await OrganizationService.bootstrapOrganization({
      name: 'People API Test Org',
      slug: 'people-api-test-org',
      adminEmail: 'admin@peopletest.org',
      adminPassword: 'AdminPassword123!',
      adminFullName: 'Admin People',
    });
    org = res.organization;
    const adminLogin = await AuthService.login('admin@peopletest.org', 'AdminPassword123!');
    adminToken = adminLogin.accessToken;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. POST /api/v1/people creates a new Person', async () => {
    const resMgr = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        firstName: 'Executive',
        lastName: 'Manager',
        email: 'manager@peopletest.org',
      });

    expect(resMgr.status).toBe(201);
    expect(resMgr.body.data.id).toBeDefined();
    managerPerson = resMgr.body.data;

    const resEmp = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        firstName: 'Junior',
        lastName: 'Developer',
        email: 'junior@peopletest.org',
      });

    expect(resEmp.status).toBe(201);
    employeePerson = resEmp.body.data;
  });

  it('2. POST /api/v1/roles creates custom role and assigns to person', async () => {
    const roleRes = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Full Stack Engineer',
        code: 'ROLE-FULLSTACK',
        description: 'Full stack developer role',
      });

    expect(roleRes.status).toBe(201);
    const roleId = roleRes.body.data.id;

    const assignRes = await request(app)
      .post(`/api/v1/people/${employeePerson.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({ roleId });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.roleId).toBe(roleId);
  });

  it('3. POST /api/v1/employments creates employment and reporting manager relationship', async () => {
    // Create Manager Employment
    await request(app)
      .post('/api/v1/employments')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId: managerPerson.id,
        employmentType: 'full_time',
        status: 'active',
        jobTitle: 'Engineering Director',
      });

    // Create Employee Employment reporting to Manager
    const empRes = await request(app)
      .post('/api/v1/employments')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId: employeePerson.id,
        employmentType: 'full_time',
        status: 'probation',
        jobTitle: 'Junior Software Engineer',
        managerId: managerPerson.id,
      });

    expect(empRes.status).toBe(201);
    expect(empRes.body.data.status).toBe('probation');
    expect(empRes.body.data.managerId).toBe(managerPerson.id);

    // Verify Manager's direct reports endpoint
    const reportsRes = await request(app)
      .get(`/api/v1/people/${managerPerson.id}/direct-reports`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id);

    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.data).toHaveLength(1);
    expect(reportsRes.body.data[0].personId).toBe(employeePerson.id);
  });

  it('4. POST /api/v1/employments/:id/status executes state machine transition & records history', async () => {
    // Get employee employment ID
    const listRes = await request(app)
      .get('/api/v1/employments')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id);

    const emp = listRes.body.data.find((e: any) => e.personId === employeePerson.id);

    // Transition from probation to active
    const statusRes = await request(app)
      .post(`/api/v1/employments/${emp.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        nextStatus: 'active',
        changeReason: 'Passed 90-day probation review successfully',
      });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('active');

    // Fetch employment history log
    const histRes = await request(app)
      .get(`/api/v1/employments/${emp.id}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id);

    expect(histRes.status).toBe(200);
    expect(histRes.body.data.length).toBeGreaterThanOrEqual(2);
    expect(histRes.body.data[0].newStatus).toBe('active');
    expect(histRes.body.data[0].changeReason).toContain('Passed 90-day probation review');
  });

  it('5. POST /api/v1/skills and /api/v1/people/:personId/skills assigns skill with proficiency', async () => {
    const skillRes = await request(app)
      .post('/api/v1/skills')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Node.js Backend',
        code: 'SKILL-NODEJS',
        category: 'Software Engineering',
      });

    expect(skillRes.status).toBe(201);
    const skillId = skillRes.body.data.id;

    const assignRes = await request(app)
      .post(`/api/v1/people/${employeePerson.id}/skills`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        skillId,
        proficiencyLevel: 'advanced',
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.proficiencyLevel).toBe('advanced');
  });
});
