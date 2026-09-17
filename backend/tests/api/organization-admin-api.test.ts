import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations } from '../../src/database/migrate.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { FeatureConfigurationRepository } from '../../src/modules/admin/infrastructure/feature-configuration.repository.js';

describe('Milestone 12 — Organization Administration API Integration Tests', () => {
  const app = createApp();
  let orgAdminToken: string;
  let orgMemberToken: string;
  let testOrgId: string;
  let adminUserId: string;
  let memberUserId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    // 1. Bootstrap primary test organization
    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Omega Tech Innovations',
      slug: 'omega-tech-innovations',
      adminEmail: 'admin@omega.devoc',
      adminPassword: 'Password123!',
      adminFullName: 'Omega Org Admin',
    });
    testOrgId = boot.organization.id;

    // Login org admin
    const adminLogin = await AuthService.login('admin@omega.devoc', 'Password123!');
    orgAdminToken = adminLogin.accessToken;
    adminUserId = adminLogin.user.id;

    // 2. Add an org_member
    const memberUser = await AuthService.createUser({
      email: 'member@omega.devoc',
      password: 'Password123!',
      fullName: 'Omega Standard Member',
    });
    memberUserId = memberUser.id;

    await OrganizationService.addMembership(testOrgId, {
      userEmail: memberUser.email,
      role: 'org_member',
    });
    const memberLogin = await AuthService.login('member@omega.devoc', 'Password123!');
    orgMemberToken = memberLogin.accessToken;

    // Seed a platform default feature for hierarchy resolution tests
    await FeatureConfigurationRepository.upsertPlatformDefault(
      'analytics_advanced',
      false,
      { tier: 'enterprise' },
      'Advanced analytics platform feature',
      adminUserId
    );
  });

  describe('1. Access Control Barrier for /api/v1/admin', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('rejects request without organization context header with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgAdminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TENANT_CONTEXT_REQUIRED');
    });

    it('rejects standard org_member with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgMemberToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows org_admin with tenant context to access admin settings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.organizationId).toBe(testOrgId);
    });
  });

  describe('2. Organization Profile & Operational Settings', () => {
    it('retrieves organization profile', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organization')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data.organization.name).toBe('Omega Tech Innovations');
      expect(res.body.data.organization.slug).toBe('omega-tech-innovations');
      expect(res.body.data.settings).toBeDefined();
    });

    it('updates organization profile name', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/organization')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Omega Global Labs' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Omega Global Labs');
    });

    it('retrieves operational settings with defaults', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('UTC');
      expect(res.body.data.currency).toBe('USD');
      expect(res.body.data.locale).toBe('en-US');
    });

    it('updates operational settings (timezone, currency, locale, formats, custom json)', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          timezone: 'Asia/Kolkata',
          locale: 'en-IN',
          currency: 'INR',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          settings: { allowSelfRegistration: false, theme: 'dark' },
        });
      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.locale).toBe('en-IN');
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.dateFormat).toBe('DD/MM/YYYY');
      expect(res.body.data.timeFormat).toBe('12h');
      expect(res.body.data.settings.theme).toBe('dark');
    });

    it('rejects invalid timezone with 400 ValidationError', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ timezone: 'Invalid/Non_Existent_Timezone' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid currency code with 400 ValidationError', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ currency: 'TOOLONG' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Business Structure Administration (M1 Foundation)', () => {
    let branchId: string;
    let buId: string;
    let deptId: string;
    let teamId: string;

    it('creates and manages branches', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/branches')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Bengaluru Campus', code: 'BLR-01', status: 'active' });
      expect(createRes.status).toBe(201);
      branchId = createRes.body.data.id;
      expect(createRes.body.data.name).toBe('Bengaluru Campus');

      const listRes = await request(app)
        .get('/api/v1/admin/branches')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((b: any) => b.id === branchId)).toBe(true);

      const updateRes = await request(app)
        .patch(`/api/v1/admin/branches/${branchId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Bengaluru Main Campus' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Bengaluru Main Campus');
    });

    it('creates and manages business units', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/business-units')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Academy Engine', code: 'BU-ACADEMY', status: 'active' });
      expect(createRes.status).toBe(201);
      buId = createRes.body.data.id;
      expect(createRes.body.data.name).toBe('Academy Engine');

      const listRes = await request(app)
        .get('/api/v1/admin/business-units')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((u: any) => u.id === buId)).toBe(true);

      const updateRes = await request(app)
        .patch(`/api/v1/admin/business-units/${buId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Academy & Education Engine' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Academy & Education Engine');
    });

    it('creates and manages departments within business units', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/departments')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Instructional Design', code: 'DEPT-ID', status: 'active' });
      expect(createRes.status).toBe(201);
      deptId = createRes.body.data.id;

      const listRes = await request(app)
        .get('/api/v1/admin/departments')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((d: any) => d.id === deptId)).toBe(true);

      const updateRes = await request(app)
        .patch(`/api/v1/admin/departments/${deptId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Curriculum & Instruction' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Curriculum & Instruction');
    });

    it('creates and manages teams within departments and business units', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/teams')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          name: 'Core Curriculum Squad',
          code: 'TEAM-CCS',
          departmentId: deptId,
          businessUnitId: buId,
          isTemporary: false,
          status: 'active',
        });
      expect(createRes.status).toBe(201);
      teamId = createRes.body.data.id;

      const listRes = await request(app)
        .get('/api/v1/admin/teams')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((t: any) => t.id === teamId)).toBe(true);

      const updateRes = await request(app)
        .patch(`/api/v1/admin/teams/${teamId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ name: 'Foundational Curriculum Squad' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Foundational Curriculum Squad');
    });

    it('sets default branch and business unit in organization settings', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          defaultBranchId: branchId,
          defaultBusinessUnitId: buId,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.defaultBranchId).toBe(branchId);
      expect(res.body.data.defaultBusinessUnitId).toBe(buId);
    });
  });

  describe('4. Membership Administration & Lifecycle', () => {
    let invitedUserId: string;

    it('lists organization members', async () => {
      const res = await request(app)
        .get('/api/v1/admin/members')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.some((m: any) => m.userId === adminUserId && m.role === 'org_admin')).toBe(true);
      expect(res.body.data.some((m: any) => m.userId === memberUserId && m.role === 'org_member')).toBe(true);
    });

    it('invites a new member to the organization', async () => {
      // First create a new standalone user account
      const newUser = await AuthService.createUser({
        email: 'invited.dev@omega.devoc',
        password: 'Password123!',
        fullName: 'Invited Developer',
      });
      invitedUserId = newUser.id;

      const res = await request(app)
        .post('/api/v1/admin/invitations')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ email: 'invited.dev@omega.devoc', role: 'org_member' });
      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(invitedUserId);
      expect(res.body.data.role).toBe('org_member');
      expect(res.body.data.status).toBe('active');
    });

    it('updates member role to org_admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/members/${invitedUserId}/role`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ role: 'org_admin' });
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('org_admin');
    });

    it('suspends and reactivates member status', async () => {
      // Suspend
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/members/${invitedUserId}/status`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'suspended' });
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe('suspended');

      // Reactivate
      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/members/${invitedUserId}/status`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'active' });
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.status).toBe('active');
    });
  });

  describe('5. Person <-> User Identity Linking & Contextual Roles', () => {
    let personId: string;
    let anotherPersonId: string;
    let roleId: string;
    let assignedPersonRoleId: string;

    beforeAll(async () => {
      // Create test persons in organization with valid emails
      const person1 = await PeopleService.createPerson(
        testOrgId,
        { firstName: 'Ada', lastName: 'Lovelace', email: 'ada.lovelace@omega.devoc' },
        adminUserId
      );
      personId = person1.id;

      const person2 = await PeopleService.createPerson(
        testOrgId,
        { firstName: 'Charles', lastName: 'Babbage', email: 'charles.babbage@omega.devoc' },
        adminUserId
      );
      anotherPersonId = person2.id;

      // Create a contextual role
      const role = await PeopleService.createRole(
        testOrgId,
        { name: 'Lead Architect', code: 'ROLE-ARCHITECT', description: 'System Architect' },
        adminUserId
      );
      roleId = role.id;
    });

    it('links a user identity to a person record', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personId}/link-user`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ userId: memberUserId });
      expect(res.status).toBe(200);
      expect(res.body.data.personId).toBe(personId);
      expect(res.body.data.userId).toBe(memberUserId);
    });

    it('enforces 1:1 user-to-person constraint and prevents collision with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${anotherPersonId}/link-user`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ userId: memberUserId });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('unlinks user identity from person record', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personId}/unlink-user`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data.personId).toBe(personId);
      expect(res.body.data.previousUserId).toBe(memberUserId);

      // Now person2 can be linked to memberUserId without conflict
      const linkRes = await request(app)
        .post(`/api/v1/admin/people/${anotherPersonId}/link-user`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({ userId: memberUserId });
      expect(linkRes.status).toBe(200);
    });

    it('assigns a contextual role to a person', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/people/${personId}/roles`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          roleId,
          startDate: new Date().toISOString(),
        });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.roleId).toBe(roleId);
      expect(res.body.data.personId).toBe(personId);
      expect(res.body.data.status).toBe('active');
      assignedPersonRoleId = res.body.data.id;
    });

    it('revokes/ends a contextual role for a person', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/people/${personId}/roles/${assignedPersonRoleId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ended');
      expect(res.body.data.endDate).toBeDefined();
    });
  });

  describe('6. Master Data Management & Non-Destructive Retirement', () => {
    describe('Work Categories', () => {
      let catId: string;

      it('creates and lists work categories', async () => {
        const createRes = await request(app)
          .post('/api/v1/admin/master-data/work-categories')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({ name: 'Architecture Review', code: 'WORK-ARCH-REV', description: 'System design and ADR reviews' });
        expect(createRes.status).toBe(201);
        catId = createRes.body.data.id;
        expect(createRes.body.data.name).toBe('Architecture Review');

        const listRes = await request(app)
          .get('/api/v1/admin/master-data/work-categories')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId);
        expect(listRes.status).toBe(200);
        expect(listRes.body.data.some((c: any) => c.id === catId)).toBe(true);
      });

      it('updates work category', async () => {
        const res = await request(app)
          .patch(`/api/v1/admin/master-data/work-categories/${catId}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({ description: 'ADR reviews and platform architecture' });
        expect(res.status).toBe(200);
        expect(res.body.data.description).toBe('ADR reviews and platform architecture');
      });

      it('non-destructively retires work category (sets active=false)', async () => {
        const retireRes = await request(app)
          .delete(`/api/v1/admin/master-data/work-categories/${catId}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId);
        expect(retireRes.status).toBe(200);
        expect(retireRes.body.data.isActive).toBe(false);

        // Does not show in active list
        const activeListRes = await request(app)
          .get('/api/v1/admin/master-data/work-categories')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId);
        expect(activeListRes.body.data.some((c: any) => c.id === catId)).toBe(false);

        // Shows in query with include_inactive=true
        const allListRes = await request(app)
          .get('/api/v1/admin/master-data/work-categories?include_inactive=true')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId);
        expect(allListRes.body.data.some((c: any) => c.id === catId)).toBe(true);
      });
    });

    describe('Meeting Types', () => {
      let mtId: string;

      it('creates and retires meeting type', async () => {
        const createRes = await request(app)
          .post('/api/v1/admin/master-data/meeting-types')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({ name: 'Sprint Retrospective', code: 'MT-RETRO', description: 'Bi-weekly retrospective' });
        expect(createRes.status).toBe(201);
        mtId = createRes.body.data.id;

        const retireRes = await request(app)
          .delete(`/api/v1/admin/master-data/meeting-types/${mtId}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId);
        expect(retireRes.status).toBe(200);
        expect(retireRes.body.data.isActive).toBe(false);
      });
    });

    describe('Evaluation Templates', () => {
      let tplId: string;

      it('creates and updates evaluation template', async () => {
        const createRes = await request(app)
          .post('/api/v1/admin/master-data/evaluation-templates')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({
            name: 'Quarterly Engineering Review',
            description: 'Engineering performance evaluation template',
            version: 1,
          });
        expect(createRes.status).toBe(201);
        tplId = createRes.body.data.id;
        expect(createRes.body.data.name).toBe('Quarterly Engineering Review');

        const updateRes = await request(app)
          .patch(`/api/v1/admin/master-data/evaluation-templates/${tplId}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({ name: 'H1 Engineering Review' });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe('H1 Engineering Review');
      });
    });

    describe('Finance Categories', () => {
      let finId: string;

      it('creates and retires finance category', async () => {
        const createRes = await request(app)
          .post('/api/v1/admin/master-data/finance-categories')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({
            name: 'Equipment Grant',
            code: 'FIN-EQUIP',
            categoryType: 'expense',
            description: 'Hardware grants',
          });
        expect(createRes.status).toBe(201);
        finId = createRes.body.data.id;

        const retireRes = await request(app)
          .delete(`/api/v1/admin/master-data/finance-categories/${finId}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId);
        expect(retireRes.status).toBe(200);
        expect(retireRes.body.data.isActive).toBe(false);
      });
    });

    describe('Skills', () => {
      let skillId: string;

      it('creates and updates skill', async () => {
        const createRes = await request(app)
          .post('/api/v1/admin/master-data/skills')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({
            name: 'Distributed Systems',
            code: 'SKILL-DIST-SYS',
            category: 'Backend Architecture',
          });
        expect(createRes.status).toBe(201);
        skillId = createRes.body.data.id;
        expect(createRes.body.data.name).toBe('Distributed Systems');

        const updateRes = await request(app)
          .patch(`/api/v1/admin/master-data/skills/${skillId}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('x-organization-id', testOrgId)
          .send({ category: 'Distributed Systems Architecture' });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.category).toBe('Distributed Systems Architecture');
      });
    });
  });

  describe('7. Feature Configurations & Hierarchy Resolution', () => {
    it('resolves platform default feature before organization override', async () => {
      const res = await request(app)
        .get('/api/v1/admin/features/analytics_advanced')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data.featureKey).toBe('analytics_advanced');
      expect(res.body.data.isEnabled).toBe(false);
      expect(res.body.data.source).toBe('platform_default');
    });

    it('sets an organization override enabling the feature', async () => {
      const res = await request(app)
        .put('/api/v1/admin/features/analytics_advanced')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          isEnabled: true,
          configValue: { tier: 'custom-pro', exportFormats: ['pdf', 'csv'] },
          description: 'Enabled for Omega labs',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.isEnabled).toBe(true);
      expect(res.body.data.organizationId).toBe(testOrgId);

      // Verify resolved feature now indicates source: organization_override
      const resolveRes = await request(app)
        .get('/api/v1/admin/features/analytics_advanced')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.isEnabled).toBe(true);
      expect(resolveRes.body.data.source).toBe('organization_override');
      expect(resolveRes.body.data.configValue.exportFormats).toContain('pdf');
    });

    it('deletes organization override and falls back cleanly to platform default', async () => {
      const delRes = await request(app)
        .delete('/api/v1/admin/features/analytics_advanced')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(delRes.status).toBe(200);
      expect(delRes.body.data.source).toBe('platform_default');
      expect(delRes.body.data.isEnabled).toBe(false);

      // Verify subsequent get returns platform default
      const checkRes = await request(app)
        .get('/api/v1/admin/features/analytics_advanced')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.source).toBe('platform_default');
      expect(checkRes.body.data.isEnabled).toBe(false);
    });
  });

  describe('8. Administrative Audit Logs', () => {
    it('queries tenant-scoped audit logs with filter and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .set('x-organization-id', testOrgId);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify each log entry belongs to this organization
      for (const log of res.body.data) {
        expect(log.organizationId).toBe(testOrgId);
      }

      // Verify presence of specific administrative events
      const actions = res.body.data.map((l: any) => l.action);
      expect(actions).toContain('ORGANIZATION_SETTINGS_UPDATED');
      expect(actions).toContain('PERSON_USER_LINKED');
      expect(actions).toContain('ROLE_CONTEXT_ASSIGNED');
    });
  });
});
