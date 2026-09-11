import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { AssignmentService } from '../../src/modules/assignments/application/assignment.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { v4 as uuidv4 } from 'uuid';

describe('Assignment Engine Multi-Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let userAToken: string;
  let userBToken: string;
  let personA: any;
  let personB: any;
  let assignmentA: any;
  const assignmentService = new AssignmentService();

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Org A
    const resA = await OrganizationService.bootstrapOrganization({
      name: 'Alpha Assignment Corp',
      slug: 'alpha-assign-corp',
      adminEmail: 'admin@alpha-assign.test',
      adminPassword: 'PasswordAlpha123!',
      adminFullName: 'Alpha Admin',
    });
    orgA = resA.organization;
    const loginA = await AuthService.login('admin@alpha-assign.test', 'PasswordAlpha123!');
    userAToken = loginA.accessToken;

    // 2. Setup Org B
    const resB = await OrganizationService.bootstrapOrganization({
      name: 'Beta Assignment Corp',
      slug: 'beta-assign-corp',
      adminEmail: 'admin@beta-assign.test',
      adminPassword: 'PasswordBeta123!',
      adminFullName: 'Beta Admin',
    });
    orgB = resB.organization;
    const loginB = await AuthService.login('admin@beta-assign.test', 'PasswordBeta123!');
    userBToken = loginB.accessToken;

    // 3. Create People
    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Alpha',
      email: 'alice@alpha-assign.test',
    });

    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'Beta',
      email: 'bob@beta-assign.test',
    });

    // 4. Create Assignment in Org A
    const resultA = await assignmentService.createAssignment({
      organizationId: orgA.id,
      personId: personA.id,
      targetType: 'project',
      targetId: uuidv4(),
      assignmentType: 'lead',
      startAt: new Date('2026-01-01'),
      status: 'scheduled',
    });
    assignmentA = resultA.assignment;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('prevents Org B user from accessing Org A assignments endpoint', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgA.id}/assignments`)
      .set('Authorization', `Bearer ${userBToken}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(403);
  });

  it('returns 404 when Org B attempts to fetch Org A assignment ID under Org B context', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/assignments/${assignmentA.id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('prevents Org B from creating an assignment for Org A person', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/assignments`)
      .set('Authorization', `Bearer ${userBToken}`)
      .set('X-Organization-Id', orgB.id)
      .send({
        personId: personA.id, // Org A person
        targetType: 'project',
        targetId: uuidv4(),
        assignmentType: 'contributor',
        startAt: new Date('2026-01-01').toISOString(),
      });

    expect(res.status).toBe(404);
  });

  it('prevents Org B from triggering lifecycle state transition on Org A assignment', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/assignments/${assignmentA.id}/activate`)
      .set('Authorization', `Bearer ${userBToken}`)
      .set('X-Organization-Id', orgB.id)
      .send({ reason: 'Malicious activation' });

    expect(res.status).toBe(404);
  });

  it('prevents Org B from viewing assignment history of Org A assignment', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/assignments/${assignmentA.id}/history`)
      .set('Authorization', `Bearer ${userBToken}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });
});
