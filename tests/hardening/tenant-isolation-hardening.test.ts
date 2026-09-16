import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('System Hardening — Tenant Boundary & Context Validation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Iso Org A',
      slug: 'tenant-iso-org-a',
      adminEmail: 'admin@iso-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin A',
    });
    orgA = bootA.organization;

    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Iso Org B',
      slug: 'tenant-iso-org-b',
      adminEmail: 'admin@iso-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin B',
    });
    orgB = bootB.organization;

    const loginA = await AuthService.login('admin@iso-a.internal', 'Password123!');
    tokenA = loginA.accessToken;

    const loginB = await AuthService.login('admin@iso-b.internal', 'Password123!');
    tokenB = loginB.accessToken;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. User A cannot access Org B endpoint via :orgId route (returns 403)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/workforce/onboarding-plans`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });

  it('2. Header mismatch (X-Organization-Id: orgA with URL: orgB) is rejected with 403', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/learning-programs`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Organization header does not match/);
  });

  it('3. User A cannot access Org B structure via X-Organization-Id substitution', async () => {
    const res = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(403);
  });

  it('4. Missing both organization header and URL context is rejected with 400', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/X-Organization-Id header or organization parameter is required/);
  });
});
