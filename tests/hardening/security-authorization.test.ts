import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';

describe('System Hardening — Negative Authorization Security Tests', () => {
  let app: any;
  let org: any;
  let adminToken: string;
  let memberToken: string;
  let adminUser: any;
  let memberUser: any;
  let person: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Auth Hardening Org',
      slug: 'auth-hardening-org',
      adminEmail: 'admin@auth-hardening.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Auth',
    });

    org = boot.organization;
    adminUser = boot.adminUser;

    const adminLogin = await AuthService.login('admin@auth-hardening.internal', 'Password123!');
    adminToken = adminLogin.accessToken;

    // Create a regular org_member
    memberUser = await AuthService.createUser({
      email: 'member@auth-hardening.internal',
      password: 'Password123!',
      fullName: 'Regular Member',
    });

    await OrganizationService.addMembership(org.id, {
      userEmail: 'member@auth-hardening.internal',
      role: 'org_member',
    });

    const memberLogin = await AuthService.login('member@auth-hardening.internal', 'Password123!');
    memberToken = memberLogin.accessToken;

    person = await PeopleService.createPerson(org.id, {
      firstName: 'Test',
      lastName: 'Person',
      email: 'testperson@auth-hardening.internal',
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('1. Finance Engine Authorization Barrier', () => {
    it('org_member CANNOT create financial transaction (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          partyId: '00000000-0000-0000-0000-000000000001',
          transactionType: 'payment',
          amount: 500,
          transactionDate: '2026-09-16',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('org_member CANNOT create financial obligation (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/finance/obligations')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          partyId: '00000000-0000-0000-0000-000000000001',
          categoryId: '00000000-0000-0000-0000-000000000002',
          obligationType: 'tuition',
          totalAmount: 12000,
          dueDates: ['2026-10-01'],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('org_member CANNOT create budget (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/finance/budgets')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Unauthorized Budget',
          period: '2026-Q4',
          allocatedAmount: 100000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('org_member CAN read finance categories (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/finance/categories')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Audit Engine Authorization Barrier', () => {
    it('org_member CANNOT list audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('org_admin CAN list audit logs (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('3. Evaluation Templates Authorization Barrier', () => {
    it('org_member CANNOT create evaluation template (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/evaluation-templates')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Hacked Template',
          evaluationType: 'Performance Review',
          criteria: [{ name: 'Quality', weight: 1.0, criterionType: 'numeric' }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('org_admin CAN create evaluation template (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/evaluation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Admin Template',
          evaluationType: 'Performance Review',
          criteria: [{ name: 'Quality', weight: 1.0, criterionType: 'numeric' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Admin Template');
    });
  });

  describe('4. Learning Engine Program Definition Authorization Barrier', () => {
    it('org_member CANNOT create learning program (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-programs`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Unauthorized Curriculum',
          code: 'UNAUTH-101',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('org_admin CAN create learning program (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-programs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Authorized Curriculum',
          code: 'AUTH-101',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Authorized Curriculum');
    });
  });
});
