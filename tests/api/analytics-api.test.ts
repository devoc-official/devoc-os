import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { FinancialPartyService } from '../../src/modules/finance/application/financial-party.service.js';
import { FinancialTransactionService } from '../../src/modules/finance/application/financial-transaction.service.js';
import { LearningProgramService } from '../../src/modules/learning/application/learning-program.service.js';
import { EnrollmentService } from '../../src/modules/learning/application/enrollment.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 11 — Analytics Engine API Integration Tests', () => {
  let app: any;
  let org: any;
  let adminUser: any;
  let token: string;
  let placementMetricId: string;
  let revenueMetricId: string;
  let reportId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Analytics Test Org',
      slug: 'analytics-test-org',
      adminEmail: 'admin@analytics-test.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Analytics',
    });

    org = boot.organization;
    adminUser = boot.adminUser;

    const loginRes = await AuthService.login('admin@analytics-test.internal', 'Password123!');
    token = loginRes.accessToken;

    // Seed test operational data for M11 Analytics to query
    const person = await PeopleService.createPerson(org.id, {
      firstName: 'Alice',
      lastName: 'Student',
      email: 'alice@analytics-test.internal',
    });

    const partyService = new FinancialPartyService();
    const party = await partyService.createParty(
      org.id,
      {
        partyType: 'person',
        personId: person.id,
        name: 'Alice Student Party',
        email: 'alice@analytics-test.internal',
      },
      adminUser.id
    );

    const txService = new FinancialTransactionService();
    await txService.createTransaction(
      org.id,
      {
        partyId: party.id,
        direction: 'inflow',
        transactionType: 'payment',
        amount: 25000.0,
        currency: 'INR',
        paymentMode: 'bank_transfer',
        postImmediately: true,
      },
      adminUser.id
    );

    const progService = new LearningProgramService();
    const prog = await progService.createProgram(
      org.id,
      {
        code: 'FSSE',
        name: 'Full Stack Software Engineering',
      },
      adminUser.id
    );
    await progService.activateProgram(org.id, prog.id, adminUser.id);

    const enrollService = new EnrollmentService();
    await enrollService.createEnrollment(
      org.id,
      {
        learningProgramId: prog.id,
        personId: person.id,
      },
      adminUser.id
    );
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. POST /api/v1/analytics/metrics — create percentage metric definition', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Student Placement Rate',
        code: 'KPI_PLACEMENT_RATE',
        domainModule: 'learning',
        metricType: 'PERCENTAGE',
        calculationSpec: {
          numerator: {
            sourceEntity: 'LEARNING_ENROLLMENT',
            filter: { status: 'completed' },
          },
          denominator: {
            sourceEntity: 'LEARNING_ENROLLMENT',
            filter: { status: 'enrolled' },
          },
        },
        supportedDimensions: ['organization_id', 'learning_program_id', 'time_period'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe('KPI_PLACEMENT_RATE');
    expect(res.body.data.metricType).toBe('PERCENTAGE');
    placementMetricId = res.body.data.id;
  });

  it('2. POST /api/v1/analytics/metrics — create SUM revenue metric definition', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Total Revenue',
        code: 'KPI_REVENUE',
        domainModule: 'finance',
        metricType: 'SUM',
        calculationSpec: {
          sourceEntity: 'FINANCIAL_TRANSACTION',
          field: 'amount',
          filter: { direction: 'inflow', state: 'Posted' },
        },
        supportedDimensions: ['organization_id', 'category_id', 'time_period'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('KPI_REVENUE');
    revenueMetricId = res.body.data.id;
  });

  it('3. GET /api/v1/analytics/metrics — list metric definitions', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('4. GET /api/v1/analytics/metrics/:id — get metric definition by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/metrics/${placementMetricId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(placementMetricId);
    expect(res.body.data.name).toBe('Student Placement Rate');
  });

  it('5. POST /api/v1/analytics/metrics/:id/compute — live calculation of revenue metric', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/metrics/${revenueMetricId}/compute`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        periodType: 'month',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        useSnapshot: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.metricDefinitionId).toBe(revenueMetricId);
    expect(res.body.data.numericValue).toBe(25000);
    expect(res.body.data.calculationRunId).toBeDefined();
  });

  it('6. POST /api/v1/analytics/metrics/:id/compute — compute and persist snapshot version 1', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/metrics/${revenueMetricId}/compute`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        periodType: 'month',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        persistSnapshot: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.calculationVersion).toBe(1);
    expect(res.body.data.numericValue).toBe(25000);
  });

  it('7. POST /api/v1/analytics/metrics/:id/compute — append-only snapshot version increment to 2', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/metrics/${revenueMetricId}/compute`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        periodType: 'month',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        persistSnapshot: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.calculationVersion).toBe(2);

    // Verify database has both version 1 and version 2 (append-only immutability)
    const db = getDbClient();
    const rows = await db.query(
      `SELECT calculation_version FROM analytics_metric_results WHERE metric_definition_id = $1 ORDER BY calculation_version ASC;`,
      [revenueMetricId]
    );
    expect(rows.rows.length).toBe(2);
    expect(rows.rows[0].calculation_version).toBe(1);
    expect(rows.rows[1].calculation_version).toBe(2);
  });

  it('8. POST /api/v1/analytics/metrics/:id/compute — use pre-calculated snapshot', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/metrics/${revenueMetricId}/compute`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        periodType: 'month',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        useSnapshot: true,
        calculationVersion: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.calculationVersion).toBe(1);
    expect(res.body.data.numericValue).toBe(25000);
  });

  it('9. POST /api/v1/analytics/reports — create saved report configuration', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/reports')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Executive Overview Report',
        description: 'Tracking placement rate and incoming revenue',
        metricIds: [placementMetricId, revenueMetricId],
        dimensions: ['learning_program_id'],
        timeWindow: {
          periodType: 'month',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-12-31T23:59:59Z',
        },
        isPublic: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Executive Overview Report');
    expect(res.body.data.isPublic).toBe(true);
    reportId = res.body.data.id;
  });

  it('10. GET /api/v1/analytics/reports — list saved reports', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/reports')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('11. POST /api/v1/analytics/reports/:id/execute — execute report and get multi-metric results', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/reports/${reportId}/execute`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.reportId).toBe(reportId);
    expect(res.body.data.results.length).toBe(2);
    expect(res.body.data.results[0].metricCode).toBe('KPI_PLACEMENT_RATE');
    expect(res.body.data.results[1].metricCode).toBe('KPI_REVENUE');
    expect(res.body.data.results[1].numericValue).toBe(25000);
  });

  it('12. Audit Logging — verifies analytics actions are recorded', async () => {
    const db = getDbClient();
    const auditRes = await db.query(
      `SELECT action, entity_type FROM audit_logs WHERE organization_id = $1 AND entity_type LIKE 'analytics%' ORDER BY created_at DESC;`,
      [org.id]
    );

    const actions = auditRes.rows.map((r) => r.action);
    expect(actions).toContain('ANALYTICS_METRIC_CREATED');
    expect(actions).toContain('ANALYTICS_REPORT_CREATED');
  });
});
