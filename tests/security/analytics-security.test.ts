import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { MetricDefinitionService } from '../../src/modules/analytics/application/metric-definition.service.js';
import { SavedReportService } from '../../src/modules/analytics/application/saved-report.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 11 — Analytics Engine Security Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let adminTokenA: string;
  let memberTokenA: string;
  let adminTokenB: string;
  let metricA: any;
  let reportA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // Bootstrap Org A
    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Security Test Org A',
      slug: 'security-test-org-a',
      adminEmail: 'admin@sec-test-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Sec A',
    });
    orgA = bootA.organization;
    const loginAdminA = await AuthService.login('admin@sec-test-a.internal', 'Password123!');
    adminTokenA = loginAdminA.accessToken;

    // Create a regular member in Org A
    const db = getDbClient();
    const userMember = await AuthService.createUser({
      email: 'member@sec-test-a.internal',
      password: 'Password123!',
      fullName: 'Member A',
    });
    await db.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'org_member', 'active');`,
      [orgA.id, userMember.id]
    );
    const loginMemberA = await AuthService.login('member@sec-test-a.internal', 'Password123!');
    memberTokenA = loginMemberA.accessToken;

    // Bootstrap Org B
    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Security Test Org B',
      slug: 'security-test-org-b',
      adminEmail: 'admin@sec-test-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Sec B',
    });
    orgB = bootB.organization;
    const loginAdminB = await AuthService.login('admin@sec-test-b.internal', 'Password123!');
    adminTokenB = loginAdminB.accessToken;

    // Create valid metric and public report in Org A
    const metricService = new MetricDefinitionService();
    metricA = await metricService.createMetricDefinition(
      orgA.id,
      {
        name: 'Sec Metric A',
        code: 'SEC_METRIC_A',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
        },
      },
      bootA.adminUser.id
    );

    const reportService = new SavedReportService();
    reportA = await reportService.createReport(
      orgA.id,
      {
        name: 'Sec Report A',
        metricIds: [metricA.id],
        isPublic: true,
      },
      bootA.adminUser.id
    );
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. SQL Injection attempt through metric definition fails safely', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: "Test'; DROP TABLE users; --",
        code: "DROP_CODE'; --",
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
          filter: {
            "status'; DROP TABLE users; --": 'test',
          },
        },
      });

    // Rejected by validation because filter key is not an allowed dimension
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();

    // Verify users table was NOT dropped
    const db = getDbClient();
    const userCheck = await db.query('SELECT COUNT(*) FROM users;');
    expect(parseInt(userCheck.rows[0].count, 10)).toBeGreaterThan(0);
  });

  it('2. Arbitrary table selection is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Attempt Arbitrary Table',
        code: 'ATTEMPT_TABLE',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'pg_shadow', // non-whitelisted table
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Unknown or disallowed source entity/);
  });

  it('3. Arbitrary column selection is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Attempt Password Hash Leak',
        code: 'ATTEMPT_PASSWORD_LEAK',
        domainModule: 'people',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'USER',
          field: 'password_hash', // Disallowed sensitive column
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Field 'password_hash' is not allowed/);
  });

  it('4. Unauthorized joins are rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Unauthorized Join Attempt',
        code: 'ATTEMPT_BAD_JOIN',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
          join: {
            targetEntity: 'FINANCIAL_BUDGET',
            onField: 'id',
          },
        },
      });

    expect(res.status).toBe(400);
  });

  it('5. Cross-tenant metric access fails with 404 (no existence leak)', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/metrics/${metricA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('6. Cross-tenant saved report execution fails with 404', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/reports/${reportA.id}/execute`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .set('X-Organization-Id', orgB.id)
      .send({});

    expect(res.status).toBe(404);
  });

  it('7. Unauthorized metric definition creation (org_member without define permission) fails with 403', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Unauthorized Metric Creation',
        code: 'FAIL_METRIC',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/analytics:define/);
  });

  it('8. Public report does NOT bypass tenant boundary', async () => {
    // Org B cannot access Org A's public report
    const res = await request(app)
      .get(`/api/v1/analytics/reports/${reportA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });
});
