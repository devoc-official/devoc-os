import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { FinancialPartyService } from '../../src/modules/finance/application/financial-party.service.js';
import { FinancialTransactionService } from '../../src/modules/finance/application/financial-transaction.service.js';
import { MetricDefinitionService } from '../../src/modules/analytics/application/metric-definition.service.js';
import { AnalyticsComputationService } from '../../src/modules/analytics/application/computation.service.js';
import { SavedReportService } from '../../src/modules/analytics/application/saved-report.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 11 — Analytics Engine Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let metricA: any;
  let reportA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // Bootstrap Org A
    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Org Analytics Isolation A',
      slug: 'org-analytics-iso-a',
      adminEmail: 'admin@analytics-iso-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Analytics A',
    });
    orgA = bootA.organization;
    const loginA = await AuthService.login('admin@analytics-iso-a.internal', 'Password123!');
    tokenA = loginA.accessToken;

    // Bootstrap Org B
    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Org Analytics Isolation B',
      slug: 'org-analytics-iso-b',
      adminEmail: 'admin@analytics-iso-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Analytics B',
    });
    orgB = bootB.organization;
    const loginB = await AuthService.login('admin@analytics-iso-b.internal', 'Password123!');
    tokenB = loginB.accessToken;

    // Create operational data in Org A
    const personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'A',
      email: 'alice@a.internal',
    });
    const partyService = new FinancialPartyService();
    const partyA = await partyService.createParty(
      orgA.id,
      {
        partyType: 'client',
        personId: personA.id,
        name: 'Client Org A',
        email: 'client@a.internal',
      },
      bootA.adminUser.id
    );
    const txService = new FinancialTransactionService();
    await txService.createTransaction(
      orgA.id,
      {
        partyId: partyA.id,
        direction: 'inflow',
        transactionType: 'payment',
        amount: 50000.0,
        currency: 'INR',
        paymentMode: 'bank_transfer',
        postImmediately: true,
      },
      bootA.adminUser.id
    );

    // Create metric in Org A
    const metricService = new MetricDefinitionService();
    metricA = await metricService.createMetricDefinition(
      orgA.id,
      {
        name: 'Org A Revenue',
        code: 'KPI_ORG_A_REVENUE',
        domainModule: 'finance',
        metricType: 'SUM',
        calculationSpec: {
          sourceEntity: 'FINANCIAL_TRANSACTION',
          field: 'amount',
          filter: { direction: 'inflow', state: 'Posted' },
        },
        supportedDimensions: ['organization_id', 'category_id', 'time_period'],
      },
      bootA.adminUser.id
    );

    // Persist snapshot in Org A
    const compService = new AnalyticsComputationService();
    await compService.computeMetric(orgA.id, metricA.id, {
      periodType: 'month',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      persistSnapshot: true,
    });

    // Create public saved report in Org A
    const reportService = new SavedReportService();
    reportA = await reportService.createReport(
      orgA.id,
      {
        name: 'Org A Public Executive Report',
        metricIds: [metricA.id],
        isPublic: true,
      },
      bootA.adminUser.id
    );
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. Cross-tenant metric definition access returns 404', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/metrics/${metricA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('2. Cross-tenant metric computation attempt returns 404', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id)
      .send({
        periodType: 'month',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('3. Cross-tenant saved report access returns 404', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/reports/${reportA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('4. Cross-tenant saved report execution returns 404', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/reports/${reportA.id}/execute`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('5. Public report in Org A is not visible in Org B list', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/reports')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(200);
    const reportIds = res.body.data.map((r: any) => r.id);
    expect(reportIds).not.toContain(reportA.id);
  });

  it('6. Org B metric computation does NOT read Org A data (isolation guarantee)', async () => {
    // Create equivalent metric in Org B
    const metricService = new MetricDefinitionService();
    const metricB = await metricService.createMetricDefinition(
      orgB.id,
      {
        name: 'Org B Revenue',
        code: 'KPI_ORG_B_REVENUE',
        domainModule: 'finance',
        metricType: 'SUM',
        calculationSpec: {
          sourceEntity: 'FINANCIAL_TRANSACTION',
          field: 'amount',
          filter: { direction: 'inflow', state: 'Posted' },
        },
        supportedDimensions: ['organization_id', 'category_id', 'time_period'],
      }
    );

    // Compute metric in Org B (Org B has 0 financial transactions)
    const res = await request(app)
      .post(`/api/v1/analytics/metrics/${metricB.id}/compute`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id)
      .send({
        periodType: 'month',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
      });

    expect(res.status).toBe(200);
    // Must be 0, proving Org B does NOT read Org A's 50,000 transaction!
    expect(res.body.data.numericValue).toBe(0);
  });
});
