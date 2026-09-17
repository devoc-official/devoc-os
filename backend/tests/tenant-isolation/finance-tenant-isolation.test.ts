import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { FinanceCategoryService } from '../../src/modules/finance/application/finance-category.service.js';
import { FinancialPartyService } from '../../src/modules/finance/application/financial-party.service.js';
import { FinancialObligationService } from '../../src/modules/finance/application/financial-obligation.service.js';
import { FinancialTransactionService } from '../../src/modules/finance/application/financial-transaction.service.js';
import { FinancialBudgetService } from '../../src/modules/finance/application/financial-budget.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 9 — Finance Engine Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let categoryA: any;
  let partyA: any;
  let obligationA: any;
  let transactionA: any;
  let budgetA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Org Fin Isolation A',
      slug: 'org-fin-iso-a',
      adminEmail: 'admin@fin-iso-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Fin A',
    });
    orgA = bootA.organization;
    const loginA = await AuthService.login('admin@fin-iso-a.internal', 'Password123!');
    tokenA = loginA.accessToken;

    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Org Fin Isolation B',
      slug: 'org-fin-iso-b',
      adminEmail: 'admin@fin-iso-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Fin B',
    });
    orgB = bootB.organization;
    const loginB = await AuthService.login('admin@fin-iso-b.internal', 'Password123!');
    tokenB = loginB.accessToken;

    const catService = new FinanceCategoryService();
    categoryA = await catService.createCategory(
      orgA.id,
      { name: 'Org A Cat', code: 'CAT-A', categoryType: 'revenue' },
      bootA.adminUser.id
    );

    const partyService = new FinancialPartyService();
    partyA = await partyService.createParty(
      orgA.id,
      { partyType: 'client', name: 'Org A Client' },
      bootA.adminUser.id
    );

    const obliService = new FinancialObligationService();
    obligationA = await obliService.createObligation(
      orgA.id,
      {
        partyId: partyA.id,
        categoryId: categoryA.id,
        direction: 'receivable',
        title: 'Org A Fee Obligation',
        items: [{ title: 'Service', itemType: 'charge', unitAmount: 5000 }],
      },
      bootA.adminUser.id
    );

    const txService = new FinancialTransactionService();
    transactionA = await txService.createTransaction(
      orgA.id,
      {
        partyId: partyA.id,
        direction: 'inflow',
        amount: 5000,
        paymentMode: 'bank_transfer',
        postImmediately: true,
      },
      bootA.adminUser.id
    );

    const budgetService = new FinancialBudgetService();
    budgetA = await budgetService.createBudget(
      orgA.id,
      {
        periodName: '2026-Q1',
        budgetAmount: 10000,
        periodStart: '2026-01-01T00:00:00Z',
        periodEnd: '2026-03-31T23:59:59Z',
      },
      bootA.adminUser.id
    );
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should return 404 when Org B attempts to fetch Org A party', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/finance/parties/${partyA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to fetch Org A obligation', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/finance/obligations/${obligationA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to fetch Org A transaction', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/finance/transactions/${transactionA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to fetch Org A budget', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/finance/budgets/${budgetA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should reject allocation attempting to link cross-tenant transaction and obligation', async () => {
    const txService = new FinancialTransactionService();
    await expect(
      txService.allocateTransaction(orgB.id, transactionA.id, obligationA.id, 5000, undefined, undefined, 'actor')
    ).rejects.toThrow();
  });
});
