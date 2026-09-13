import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/app.js';
import { runMigrations } from '../../src/database/migrate.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { AuditService } from '../../src/audit/audit.service.js';

describe('Milestone 10 — Audit & Events Tenant Isolation Tests', () => {
  const app = createApp();
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgA: any;
  let orgB: any;
  let logIdOrgA: string;
  const sampleEntityId = uuidv4();

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Audit Tenant A',
      slug: 'audit-tenant-a',
      adminEmail: 'adminA@audita.test',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Tenant A',
    });
    orgA = bootA.organization;
    const loginA = await AuthService.login('adminA@audita.test', 'Password123!');
    tokenOrgA = loginA.accessToken;

    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Audit Tenant B',
      slug: 'audit-tenant-b',
      adminEmail: 'adminB@auditb.test',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Tenant B',
    });
    orgB = bootB.organization;
    const loginB = await AuthService.login('adminB@auditb.test', 'Password123!');
    tokenOrgB = loginB.accessToken;

    const logA = await AuditService.recordLog({
      organizationId: orgA.id,
      actorId: bootA.adminUser.id,
      action: 'TENANT_A_ACTION',
      entityType: 'tenant_a_entity',
      entityId: sampleEntityId,
    });
    if (logA) logIdOrgA = logA.id;
  });

  it('1. Tenant A can read its own audit log entry', async () => {
    const res = await request(app)
      .get(`/api/v1/audit/${logIdOrgA}`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(logIdOrgA);
  });

  it('2. Tenant B CANNOT read Tenant A audit log entry — returns 404 Not Found', async () => {
    const res = await request(app)
      .get(`/api/v1/audit/${logIdOrgA}`)
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('3. Tenant B list audit logs does NOT expose Tenant A logs', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(200);
    const hasOrgALogs = res.body.data.some((l: any) => l.organizationId === orgA.id);
    expect(hasOrgALogs).toBe(false);
  });
});
