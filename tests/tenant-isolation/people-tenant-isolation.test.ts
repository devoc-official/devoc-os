import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EmploymentService } from '../../src/modules/people/application/employment.service.js';
import { SkillService } from '../../src/modules/people/application/skill.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('People Engine Multi-Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let userAToken: string;
  let userBToken: string;
  let personA: any;
  let personB: any;
  let empA: any;
  let empB: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Org A and User A
    const resA = await OrganizationService.bootstrapOrganization({
      name: 'Alpha Corp',
      slug: 'alpha-corp',
      adminEmail: 'admin@alpha.test',
      adminPassword: 'PasswordAlpha123!',
      adminFullName: 'Alpha Admin',
    });
    orgA = resA.organization;
    const loginA = await AuthService.login('admin@alpha.test', 'PasswordAlpha123!');
    userAToken = loginA.accessToken;

    // 2. Setup Org B and User B
    const resB = await OrganizationService.bootstrapOrganization({
      name: 'Beta Corp',
      slug: 'beta-corp',
      adminEmail: 'admin@beta.test',
      adminPassword: 'PasswordBeta123!',
      adminFullName: 'Beta Admin',
    });
    orgB = resB.organization;
    const loginB = await AuthService.login('admin@beta.test', 'PasswordBeta123!');
    userBToken = loginB.accessToken;

    // 3. Create Person & Employment in Org A
    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Alpha',
      email: 'alice@alpha.test',
    });
    empA = await EmploymentService.createEmployment(orgA.id, {
      personId: personA.id,
      employmentType: 'full_time',
      jobTitle: 'Alpha Lead Architect',
    });

    // 4. Create Person & Employment in Org B
    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'Beta',
      email: 'bob@beta.test',
    });
    empB = await EmploymentService.createEmployment(orgB.id, {
      personId: personB.id,
      employmentType: 'full_time',
      jobTitle: 'Beta Senior Engineer',
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. User A lists people in Org A and receives only Org A records', async () => {
    const res = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(200);
    const personIds = res.body.data.map((p: any) => p.id);
    expect(personIds).toContain(personA.id);
    expect(personIds).not.toContain(personB.id);
  });

  it('2. User A probing Person B UUID from Org A context returns 404 NOT_FOUND', async () => {
    const res = await request(app)
      .get(`/api/v1/people/${personB.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('3. User A probing Employment B UUID from Org A context returns 404 NOT_FOUND', async () => {
    const res = await request(app)
      .get(`/api/v1/employments/${empB.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('4. User A cannot access Org B People API using Org B tenant header (TENANT_ACCESS_DENIED)', async () => {
    const res = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });

  it('5. Skills created in Org A are invisible to Org B', async () => {
    const skillA = await SkillService.createSkill(orgA.id, {
      name: 'Alpha Engineering Skill',
      code: 'SKILL-ALPHA',
    });

    const resB = await request(app)
      .get('/api/v1/skills')
      .set('Authorization', `Bearer ${userBToken}`)
      .set('X-Organization-Id', orgB.id);

    expect(resB.status).toBe(200);
    const skillIds = resB.body.data.map((s: any) => s.id);
    expect(skillIds).not.toContain(skillA.id);
  });
});
