import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Multi-Tenant Isolation Acceptance Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let userAToken: string;
  let userBToken: string;
  let dualUserToken: string;
  let branchA: any;
  let branchB: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Org A and User A
    const resA = await OrganizationService.bootstrapOrganization({
      name: 'Organization Alpha',
      slug: 'org-alpha',
      adminEmail: 'admin.a@alpha.test',
      adminPassword: 'PasswordAlpha123!',
      adminFullName: 'Admin Alpha',
    });
    orgA = resA.organization;
    const loginA = await AuthService.login('admin.a@alpha.test', 'PasswordAlpha123!');
    userAToken = loginA.accessToken;

    // 2. Setup Org B and User B
    const resB = await OrganizationService.bootstrapOrganization({
      name: 'Organization Beta',
      slug: 'org-beta',
      adminEmail: 'admin.b@beta.test',
      adminPassword: 'PasswordBeta123!',
      adminFullName: 'Admin Beta',
    });
    orgB = resB.organization;
    const loginB = await AuthService.login('admin.b@beta.test', 'PasswordBeta123!');
    userBToken = loginB.accessToken;

    // 3. Setup Dual User (Member of both Org A and Org B)
    const dualUser = await AuthService.createUser({
      email: 'dual@shared.test',
      password: 'DualPassword123!',
      fullName: 'Dual Member',
    });
    await OrganizationService.addMembership(orgA.id, { userEmail: 'dual@shared.test', role: 'org_member' });
    await OrganizationService.addMembership(orgB.id, { userEmail: 'dual@shared.test', role: 'org_member' });
    const loginDual = await AuthService.login('dual@shared.test', 'DualPassword123!');
    dualUserToken = loginDual.accessToken;

    // 4. Create distinct resources in both tenants
    branchA = await StructureService.createBranch(orgA.id, { name: 'Alpha HQ', code: 'HQ-ALPHA' });
    branchB = await StructureService.createBranch(orgB.id, { name: 'Beta HQ', code: 'HQ-BETA' });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. User A can access Org A resources with active Org A tenant header', async () => {
    const res = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(branchA.id);
  });

  it('2. User A cannot access Org B by passing Org B header (TENANT_ACCESS_DENIED)', async () => {
    const res = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });

  it('3. Probing Org B branch UUID from Org A context returns 404 NOT_FOUND (no data leakage)', async () => {
    const res = await request(app)
      .get(`/api/v1/branches/${branchB.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('4. User A creating a branch in Org A writes strictly to Org A context', async () => {
    const res = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgA.id)
      .send({ name: 'Alpha Branch 2', code: 'BR-ALPHA-2' });

    expect(res.status).toBe(201);
    expect(res.body.data.organizationId).toBe(orgA.id);

    // Verify User B in Org B does NOT see Alpha Branch 2
    const resB = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${userBToken}`)
      .set('X-Organization-Id', orgB.id);

    expect(resB.status).toBe(200);
    const branchIds = resB.body.data.map((b: any) => b.id);
    expect(branchIds).not.toContain(res.body.data.id);
  });

  it('5. Dual-member user accesses correct tenant data depending strictly on X-Organization-Id header', async () => {
    // Access Org A context
    const resA = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${dualUserToken}`)
      .set('X-Organization-Id', orgA.id);

    expect(resA.status).toBe(200);
    expect(resA.body.data.some((b: any) => b.id === branchA.id)).toBe(true);
    expect(resA.body.data.some((b: any) => b.id === branchB.id)).toBe(false);

    // Access Org B context
    const resB = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${dualUserToken}`)
      .set('X-Organization-Id', orgB.id);

    expect(resB.status).toBe(200);
    expect(resB.body.data.some((b: any) => b.id === branchB.id)).toBe(true);
    expect(resB.body.data.some((b: any) => b.id === branchA.id)).toBe(false);
  });

  it('6. Requests missing X-Organization-Id header fail with TENANT_CONTEXT_REQUIRED', async () => {
    const res = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TENANT_CONTEXT_REQUIRED');
  });
});
