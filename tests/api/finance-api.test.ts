import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 9 — Finance Engine API Integration Tests', () => {
  let app: any;
  let org: any;
  let adminUser: any;
  let token: string;
  let person: any;
  let categoryId: string;
  let partyId: string;
  let obligationId: string;
  let transactionId: string;
  let budgetId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Finance Test Org',
      slug: 'finance-test-org',
      adminEmail: 'admin@finance-test.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Finance',
    });

    org = boot.organization;
    adminUser = boot.adminUser;

    const loginRes = await AuthService.login('admin@finance-test.internal', 'Password123!');
    token = loginRes.accessToken;

    person = await PeopleService.createPerson(org.id, {
      firstName: 'Financial',
      lastName: 'Subject',
      email: 'subject@finance-test.internal',
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. POST /api/v1/finance/categories — create revenue & expense categories', async () => {
    const res = await request(app)
      .post('/api/v1/finance/categories')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Client Software Deliverables',
        code: 'CAT-CLIENT-SW',
        categoryType: 'revenue',
        description: 'Software development revenue',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Client Software Deliverables');
    categoryId = res.body.data.id;
  });

  it('2. GET /api/v1/finance/categories — list categories', async () => {
    const res = await request(app)
      .get('/api/v1/finance/categories')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('3. POST /api/v1/finance/parties — create financial party', async () => {
    const res = await request(app)
      .post('/api/v1/finance/parties')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        partyType: 'client',
        name: 'Acme Corporation',
        email: 'billing@acme.com',
        phone: '+1-555-0199',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Acme Corporation');
    partyId = res.body.data.id;
  });

  it('4. POST /api/v1/finance/obligations — create obligation in Draft state', async () => {
    const res = await request(app)
      .post('/api/v1/finance/obligations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        partyId,
        categoryId,
        direction: 'receivable',
        title: 'Acme Enterprise Software Contract Q1',
        description: 'Milestone 1 Core Development Deliverable',
        currency: 'INR',
        items: [
          { title: 'Core API Backend', itemType: 'charge', unitAmount: 100000.0, quantity: 1 },
          { title: 'Early Payment Discount', itemType: 'discount', unitAmount: 10000.0, quantity: 1 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.state).toBe('Draft');
    expect(res.body.data.grossAmount).toBe(100000);
    expect(res.body.data.discountAmount).toBe(10000);
    expect(res.body.data.netAmount).toBe(90000);
    expect(res.body.data.balanceAmount).toBe(90000);

    obligationId = res.body.data.id;
  });

  it('5. POST /api/v1/finance/obligations/:id/issue — transition to Issued', async () => {
    const res = await request(app)
      .post(`/api/v1/finance/obligations/${obligationId}/issue`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('Issued');
  });

  it('6. POST /api/v1/finance/obligations/:id/adjustments — add late fee adjustment', async () => {
    const res = await request(app)
      .post(`/api/v1/finance/obligations/${obligationId}/adjustments`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        adjustmentType: 'late_fee',
        amount: 5000.0,
        reason: 'Overdue invoice processing penalty',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(5000);

    // Verify obligation balance updated: 90000 + 5000 = 95000
    const obliRes = await request(app)
      .get(`/api/v1/finance/obligations/${obligationId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(obliRes.body.data.netAmount).toBe(95000);
    expect(obliRes.body.data.balanceAmount).toBe(95000);
  });

  it('7. POST /api/v1/finance/transactions — record payment transaction', async () => {
    const res = await request(app)
      .post('/api/v1/finance/transactions')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        partyId,
        direction: 'inflow',
        transactionType: 'payment',
        amount: 95000.0,
        currency: 'INR',
        paymentMode: 'bank_transfer',
        referenceNumber: 'REF-ACME-001',
        postImmediately: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.state).toBe('Posted');
    expect(res.body.data.unallocatedAmount).toBe(95000);

    transactionId = res.body.data.id;
  });

  it('8. POST /api/v1/finance/allocations — allocate payment to obligation & verify Paid state', async () => {
    const res = await request(app)
      .post('/api/v1/finance/allocations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        transactionId,
        obligationId,
        allocatedAmount: 95000.0,
        notes: 'Full settlement allocation',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.allocatedAmount).toBe(95000);

    // Check obligation status -> Paid
    const obliRes = await request(app)
      .get(`/api/v1/finance/obligations/${obligationId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(obliRes.body.data.state).toBe('Paid');
    expect(obliRes.body.data.balanceAmount).toBe(0);
  });

  it('9. POST /api/v1/finance/transactions/:id/reverse — reverse posted transaction with compensating transaction', async () => {
    const res = await request(app)
      .post(`/api/v1/finance/transactions/${transactionId}/reverse`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ reason: 'Bank chargeback adjustment' });

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('Reversed');
  });

  it('10. POST /api/v1/finance/budgets — create operational budget', async () => {
    const res = await request(app)
      .post('/api/v1/finance/budgets')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        periodName: '2026-Q1',
        budgetAmount: 250000.0,
        periodStart: '2026-01-01T00:00:00Z',
        periodEnd: '2026-03-31T23:59:59Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.budgetAmount).toBe(250000);

    budgetId = res.body.data.id;
  });

  it('11. GET /api/v1/finance/budgets — list budgets', async () => {
    const res = await request(app)
      .get('/api/v1/finance/budgets')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
