import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations } from '../../src/database/migrate.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { getDbClient } from '../../src/database/index.js';

describe('Milestone 12 — Platform Administration API Integration Tests', () => {
  const app = createApp();
  let platformAdminToken: string;
  let regularOrgAdminToken: string;
  let regularMemberToken: string;
  let testOrgId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    // 1. Create a platform admin user
    const db = getDbClient();
    const platUser = await AuthService.createUser({
      email: 'superadmin@devoc.platform',
      password: 'PlatformPassword123!',
      fullName: 'Super Platform Admin',
    });
    await db.query(`UPDATE users SET is_platform_admin = TRUE WHERE id = $1;`, [platUser.id]);
    const platLogin = await AuthService.login('superadmin@devoc.platform', 'PlatformPassword123!');
    platformAdminToken = platLogin.accessToken;

    // 2. Create a standard organization with an org_admin and an org_member
    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Base Platform Test Org',
      slug: 'base-platform-test-org',
      adminEmail: 'orgadmin@devoc.test',
      adminPassword: 'Password123!',
      adminFullName: 'Regular Org Admin',
    });
    testOrgId = boot.organization.id;
    const orgAdminLogin = await AuthService.login('orgadmin@devoc.test', 'Password123!');
    regularOrgAdminToken = orgAdminLogin.accessToken;

    const memberUser = await AuthService.createUser({
      email: 'regularmember@devoc.test',
      password: 'Password123!',
      fullName: 'Regular Member',
    });
    await OrganizationService.addMembership(testOrgId, {
      userEmail: memberUser.email,
      role: 'org_member',
    });
    const memberLogin = await AuthService.login('regularmember@devoc.test', 'Password123!');
    regularMemberToken = memberLogin.accessToken;
  });

  describe('Access Control for Platform Endpoints', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/platform/organizations');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('rejects regular org_admin with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/platform/organizations')
        .set('Authorization', `Bearer ${regularOrgAdminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects regular member with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/platform/organizations')
        .set('Authorization', `Bearer ${regularMemberToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects regular org_admin from accessing platform settings', async () => {
      const res = await request(app)
        .get('/api/v1/platform/settings')
        .set('Authorization', `Bearer ${regularOrgAdminToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects regular org_admin from accessing platform features', async () => {
      const res = await request(app)
        .get('/api/v1/platform/features')
        .set('Authorization', `Bearer ${regularOrgAdminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Organization Provisioning & Lifecycle', () => {
    let newOrgId: string;

    it('provisions a new organization with settings and admin user atomically', async () => {
      const payload = {
        name: 'Alpha Innovation Labs',
        slug: 'alpha-innovation',
        adminEmail: 'admin@alpha-labs.test',
        adminPassword: 'AlphaPassword123!',
        adminFullName: 'Alpha Admin',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        currency: 'INR',
      };

      const res = await request(app)
        .post('/api/v1/platform/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.organization).toBeDefined();
      expect(res.body.data.organization.name).toBe('Alpha Innovation Labs');
      expect(res.body.data.organization.slug).toBe('alpha-innovation');
      expect(res.body.data.organization.status).toBe('active');
      expect(res.body.data.settings).toBeDefined();
      expect(res.body.data.settings.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.settings.currency).toBe('INR');
      expect(res.body.data.adminUser.email).toBe('admin@alpha-labs.test');

      newOrgId = res.body.data.organization.id;

      // Verify admin user can log in and has org_admin membership
      const newAdminLogin = await AuthService.login('admin@alpha-labs.test', 'AlphaPassword123!');
      expect(newAdminLogin.accessToken).toBeDefined();
    });

    it('rejects provisioning with duplicate slug with 409 Conflict', async () => {
      const payload = {
        name: 'Duplicate Alpha',
        slug: 'alpha-innovation',
        adminEmail: 'admin2@alpha-labs.test',
      };

      const res = await request(app)
        .post('/api/v1/platform/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects provisioning with invalid slug or missing fields with 400 Validation', async () => {
      const res = await request(app)
        .post('/api/v1/platform/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Bad Slug Org', slug: 'INVALID SLUG WITH SPACES', adminEmail: 'valid@email.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('lists organizations with pagination and status filters', async () => {
      const res = await request(app)
        .get('/api/v1/platform/organizations?status=active&limit=10')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('retrieves detailed organization by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/platform/organizations/${newOrgId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.organization.id).toBe(newOrgId);
      expect(res.body.data.settings.timezone).toBe('Asia/Kolkata');
    });

    it('transitions organization status active -> suspended', async () => {
      const res = await request(app)
        .patch(`/api/v1/platform/organizations/${newOrgId}/status`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ status: 'suspended', reason: 'Non-payment of enterprise invoice' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('suspended');
    });

    it('transitions organization status suspended -> active', async () => {
      const res = await request(app)
        .patch(`/api/v1/platform/organizations/${newOrgId}/status`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ status: 'active', reason: 'Invoice settled' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });

    it('transitions organization status active -> archived and rejects reactivating archived org with 422', async () => {
      // Archive org
      const archiveRes = await request(app)
        .patch(`/api/v1/platform/organizations/${newOrgId}/status`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ status: 'archived', reason: 'Customer requested offboarding' });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe('archived');

      // Attempt to reactivate directly
      const reactivateRes = await request(app)
        .patch(`/api/v1/platform/organizations/${newOrgId}/status`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ status: 'active', reason: 'Accidental archive' });

      expect(reactivateRes.status).toBe(422);
      expect(reactivateRes.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('Global Platform Settings', () => {
    it('creates and retrieves a global platform setting', async () => {
      const settingPayload = {
        value: {
          sessionTtlMinutes: 1440,
          maxFailedLogins: 5,
        },
        description: 'Global authentication and session policy',
      };

      const putRes = await request(app)
        .put('/api/v1/platform/settings/platform.auth.policy')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(settingPayload);

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.key).toBe('platform.auth.policy');
      expect(putRes.body.data.value.sessionTtlMinutes).toBe(1440);

      const getRes = await request(app)
        .get('/api/v1/platform/settings/platform.auth.policy')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.key).toBe('platform.auth.policy');
      expect(getRes.body.data.value.maxFailedLogins).toBe(5);
    });

    it('lists all platform settings', async () => {
      const res = await request(app)
        .get('/api/v1/platform/settings')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((s: any) => s.key === 'platform.auth.policy')).toBe(true);
    });
  });

  describe('Global Platform Feature Defaults', () => {
    it('sets and retrieves a platform default feature configuration', async () => {
      const featurePayload = {
        isEnabled: true,
        configValue: {
          maxProjects: 100,
          allowExport: true,
        },
        description: 'Platform default for projects management module',
      };

      const putRes = await request(app)
        .put('/api/v1/platform/features/module.projects.enabled')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(featurePayload);

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.featureKey).toBe('module.projects.enabled');
      expect(putRes.body.data.organizationId).toBeNull();
      expect(putRes.body.data.isEnabled).toBe(true);
      expect(putRes.body.data.configValue.maxProjects).toBe(100);

      const getRes = await request(app)
        .get('/api/v1/platform/features/module.projects.enabled')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.featureKey).toBe('module.projects.enabled');
      expect(getRes.body.data.isEnabled).toBe(true);
    });

    it('lists all platform default features', async () => {
      const res = await request(app)
        .get('/api/v1/platform/features')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((f: any) => f.featureKey === 'module.projects.enabled')).toBe(true);
    });
  });
});
