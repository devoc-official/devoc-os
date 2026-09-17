import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations } from '../../src/database/migrate.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { MasterDataService } from '../../src/modules/admin/application/master-data.service.js';
import { FeatureConfigurationRepository } from '../../src/modules/admin/infrastructure/feature-configuration.repository.js';

describe('Milestone 12 — Admin & Platform Management Multi-Tenant Isolation Tests', () => {
  const app = createApp();

  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let adminAId: string;
  let adminBId: string;

  // Org A entities
  let branchA: any;
  let buA: any;
  let personA: any;
  let roleA: any;
  let workCatA: any;
  let meetingTypeA: any;
  let evalTemplateA: any;
  let financeCatA: any;
  let skillA: any;

  // Org B entities
  let branchB: any;
  let buB: any;
  let personB: any;
  let roleB: any;
  let workCatB: any;
  let meetingTypeB: any;
  let evalTemplateB: any;
  let financeCatB: any;
  let skillB: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    // 1. Setup Tenant Alpha
    const resA = await OrganizationService.bootstrapOrganization({
      name: 'Alpha Enterprise',
      slug: 'alpha-enterprise',
      adminEmail: 'admin@alpha-ent.test',
      adminPassword: 'Password123!',
      adminFullName: 'Alpha Admin',
    });
    orgA = resA.organization;
    const loginA = await AuthService.login('admin@alpha-ent.test', 'Password123!');
    tokenA = loginA.accessToken;
    adminAId = loginA.user.id;

    // 2. Setup Tenant Beta
    const resB = await OrganizationService.bootstrapOrganization({
      name: 'Beta Enterprise',
      slug: 'beta-enterprise',
      adminEmail: 'admin@beta-ent.test',
      adminPassword: 'Password123!',
      adminFullName: 'Beta Admin',
    });
    orgB = resB.organization;
    const loginB = await AuthService.login('admin@beta-ent.test', 'Password123!');
    tokenB = loginB.accessToken;
    adminBId = loginB.user.id;

    // 3. Seed Org A entities
    branchA = await StructureService.createBranch(orgA.id, { name: 'Alpha HQ', code: 'BR-ALPHA' }, adminAId);
    buA = await StructureService.createBusinessUnit(orgA.id, { name: 'Alpha Digital', code: 'BU-ALPHA' }, adminAId);
    personA = await PeopleService.createPerson(
      orgA.id,
      { firstName: 'Alice', lastName: 'Alpha', email: 'alice@alpha-ent.test' },
      adminAId
    );
    roleA = await PeopleService.createRole(
      orgA.id,
      { name: 'Alpha Engineer', code: 'ROLE-A-ENG' },
      adminAId
    );
    workCatA = await MasterDataService.createWorkCategory(
      orgA.id,
      { name: 'Alpha Feature Dev', code: 'WC-A-DEV' },
      adminAId
    );
    meetingTypeA = await MasterDataService.createMeetingType(
      orgA.id,
      { name: 'Alpha Standup', code: 'MT-A-STAND' },
      adminAId
    );
    evalTemplateA = await MasterDataService.createEvaluationTemplate(
      orgA.id,
      { name: 'Alpha Peer Review' },
      adminAId
    );
    financeCatA = await MasterDataService.createFinanceCategory(
      orgA.id,
      { name: 'Alpha Software License', code: 'FC-A-LIC', categoryType: 'expense' },
      adminAId
    );
    skillA = await MasterDataService.createSkill(
      orgA.id,
      { name: 'Alpha TypeScript', code: 'SK-A-TS' },
      adminAId
    );

    // 4. Seed Org B entities
    branchB = await StructureService.createBranch(orgB.id, { name: 'Beta HQ', code: 'BR-BETA' }, adminBId);
    buB = await StructureService.createBusinessUnit(orgB.id, { name: 'Beta Cloud', code: 'BU-BETA' }, adminBId);
    personB = await PeopleService.createPerson(
      orgB.id,
      { firstName: 'Bob', lastName: 'Beta', email: 'bob@beta-ent.test' },
      adminBId
    );
    roleB = await PeopleService.createRole(
      orgB.id,
      { name: 'Beta Specialist', code: 'ROLE-B-SPEC' },
      adminBId
    );
    workCatB = await MasterDataService.createWorkCategory(
      orgB.id,
      { name: 'Beta Research', code: 'WC-B-RES' },
      adminBId
    );
    meetingTypeB = await MasterDataService.createMeetingType(
      orgB.id,
      { name: 'Beta Architecture Sync', code: 'MT-B-SYNC' },
      adminBId
    );
    evalTemplateB = await MasterDataService.createEvaluationTemplate(
      orgB.id,
      { name: 'Beta Review Template' },
      adminBId
    );
    financeCatB = await MasterDataService.createFinanceCategory(
      orgB.id,
      { name: 'Beta Server Hosting', code: 'FC-B-SRV', categoryType: 'expense' },
      adminBId
    );
    skillB = await MasterDataService.createSkill(
      orgB.id,
      { name: 'Beta Rust', code: 'SK-B-RUST' },
      adminBId
    );

    // 5. Seed platform default feature
    await FeatureConfigurationRepository.upsertPlatformDefault(
      'custom_workflows',
      false,
      { allowCustomTriggers: false },
      'Platform default custom workflows',
      adminAId
    );
  });

  describe('1. Operational Settings & Tenant Resolution Isolation', () => {
    it('denies Admin A from accessing Org B settings using Org B header (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgB.id);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });

    it('denies Admin A from setting defaultBranchId to Org B branch (404 NotFound)', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ defaultBranchId: branchB.id });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('denies Admin A from setting defaultBusinessUnitId to Org B business unit (404 NotFound)', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ defaultBusinessUnitId: buB.id });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('2. Business Structure Cross-Tenant Protection', () => {
    it('prevents Admin A from updating Org B branch (404 NotFound)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/branches/${branchB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ name: 'Hacked Branch Name' });
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from updating Org B business unit (404 NotFound)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/business-units/${buB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ name: 'Hacked BU Name' });
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from creating a team referencing Org B business unit (404 NotFound)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/teams')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          name: 'Cross Tenant Squad',
          code: 'TEAM-CTS',
          businessUnitId: buB.id,
        });
      expect(res.status).toBe(404);
    });
  });

  describe('3. Person <-> User Identity Linking Isolation', () => {
    it('prevents Admin A from linking an Org B user to Org A person (404 NotFound)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personA.id}/link-user`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ userId: adminBId });
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/not found or has no active membership/i);
    });

    it('prevents Admin A from linking to Org B person (404 NotFound)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personB.id}/link-user`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ userId: adminAId });
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from unlinking Org B person (404 NotFound)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personB.id}/unlink-user`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);
      expect(res.status).toBe(404);
    });
  });

  describe('4. Contextual Role Assignment Cross-Tenant Protection', () => {
    it('prevents Admin A from assigning Org B role to Org A person (404 NotFound)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personA.id}/roles`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ roleId: roleB.id });
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/Role .* not found in this organization/i);
    });

    it('prevents Admin A from assigning contextual role with Org B business unit (404 NotFound)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personA.id}/roles`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ roleId: roleA.id, businessUnitId: buB.id });
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/Business Unit .* not found in this organization/i);
    });
  });

  describe('5. Master Data Cross-Tenant Protection', () => {
    it('prevents Admin A from updating Org B work category (404 NotFound)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/master-data/work-categories/${workCatB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ name: 'Tampered Work Category' });
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from retiring Org B work category (404 NotFound)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/master-data/work-categories/${workCatB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from retiring Org B meeting type (404 NotFound)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/master-data/meeting-types/${meetingTypeB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from updating Org B evaluation template (404 NotFound)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/master-data/evaluation-templates/${evalTemplateB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ name: 'Tampered Template' });
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from retiring Org B finance category (404 NotFound)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/master-data/finance-categories/${financeCatB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);
      expect(res.status).toBe(404);
    });

    it('prevents Admin A from updating Org B skill (404 NotFound)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/master-data/skills/${skillB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ category: 'Tampered Category' });
      expect(res.status).toBe(404);
    });

    it('ensures master data listings in Org A do not contain Org B records', async () => {
      const res = await request(app)
        .get('/api/v1/admin/master-data/work-categories')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);
      expect(res.status).toBe(200);
      expect(res.body.data.some((c: any) => c.id === workCatB.id)).toBe(false);
      expect(res.body.data.some((c: any) => c.id === workCatA.id)).toBe(true);
    });
  });

  describe('6. Feature Configuration Isolation & Non-Leakage', () => {
    it('sets override in Org A and confirms Org B still receives platform default', async () => {
      // 1. Admin A overrides custom_workflows to TRUE
      const setA = await request(app)
        .put('/api/v1/admin/features/custom_workflows')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({ isEnabled: true, configValue: { maxWorkflows: 100 } });
      expect(setA.status).toBe(200);
      expect(setA.body.data.isEnabled).toBe(true);

      // 2. Admin B queries custom_workflows in Org B -> must remain FALSE with source: platform_default
      const getB = await request(app)
        .get('/api/v1/admin/features/custom_workflows')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id);
      expect(getB.status).toBe(200);
      expect(getB.body.data.isEnabled).toBe(false);
      expect(getB.body.data.source).toBe('platform_default');

      // 3. Admin B cannot delete Org A feature override
      const delB = await request(app)
        .delete('/api/v1/admin/features/custom_workflows')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id);
      expect(delB.status).toBe(404);
    });
  });

  describe('7. Administrative Audit Log Cross-Tenant Isolation', () => {
    it('ensures Admin A only sees Org A audit logs and zero Org B logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify strict tenant filtering
      for (const log of res.body.data) {
        expect(log.organizationId).toBe(orgA.id);
        expect(log.organizationId).not.toBe(orgB.id);
      }
    });

    it('ensures Admin B only sees Org B audit logs and zero Org A logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id);
      expect(res.status).toBe(200);

      for (const log of res.body.data) {
        expect(log.organizationId).toBe(orgB.id);
        expect(log.organizationId).not.toBe(orgA.id);
      }
    });
  });
});
