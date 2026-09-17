import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { TargetResolverRegistry } from '../../src/modules/assignments/domain/target-resolver.registry.js';
import { ValidationError } from '../../src/shared/errors/index.js';
import { v4 as uuidv4 } from 'uuid';

describe('Assignment Engine REST API Endpoints E2E Tests', () => {
  let app: any;
  let org: any;
  let authToken: string;
  let person: any;
  let teamTarget: any;
  let buTarget: any;
  let createdAssignmentId: string;
  const mockProjectId = uuidv4();

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Organization & User
    const res = await OrganizationService.bootstrapOrganization({
      name: 'Assignment API Test Org',
      slug: 'assignment-api-test-org',
      adminEmail: 'admin@assign-api.test',
      adminPassword: 'PasswordAssign123!',
      adminFullName: 'Assign Admin',
    });
    org = res.organization;
    const loginRes = await AuthService.login('admin@assign-api.test', 'PasswordAssign123!');
    authToken = loginRes.accessToken;

    // 2. Setup Team & BU Targets
    teamTarget = await StructureService.createTeam(org.id, {
      name: 'Frontend Core Team',
      code: 'TEAM-FRONTEND',
    });

    buTarget = await StructureService.createBusinessUnit(org.id, {
      name: 'Academy Business Unit',
      code: 'BU-ACADEMY-TEST',
    });

    // 3. Setup Person
    person = await PeopleService.createPerson(org.id, {
      firstName: 'Charlie',
      lastName: 'Developer',
      email: 'charlie@assign-api.test',
    });

    // 4. Register mock Project resolver for testing dynamic domain module target registration
    TargetResolverRegistry.getInstance().registerResolver({
      targetType: 'project',
      resolve: async (organizationId: string, targetId: string) => {
        if (targetId === mockProjectId && organizationId === org.id) {
          return { valid: true, targetName: 'Mock SaaS Project', assignable: true };
        }
        throw new ValidationError(`Project target '${targetId}' not found in organization '${organizationId}'`);
      },
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('POST /assignments — creates assignment successfully against registered target', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId: person.id,
        targetType: 'project',
        targetId: mockProjectId,
        assignmentType: 'contributor',
        roleContext: 'frontend_developer',
        status: 'scheduled',
        startAt: new Date('2026-09-01T00:00:00Z').toISOString(),
        endAt: new Date('2026-12-31T23:59:59Z').toISOString(),
        capacityType: 'allocation',
        capacityValue: 60,
        capacityUnit: 'percentage',
        notes: 'Frontend developer for SaaS project',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.personId).toBe(person.id);
    expect(res.body.data.targetType).toBe('project');
    expect(res.body.data.assignmentType).toBe('contributor');
    expect(res.body.data.capacityValue).toBe(60);

    createdAssignmentId = res.body.data.id;
  });

  it('POST /assignments — rejects nonexistent target ID for database-backed targets', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId: person.id,
        targetType: 'team',
        targetId: uuidv4(), // Nonexistent team
        assignmentType: 'member',
        startAt: new Date('2026-09-01T00:00:00Z').toISOString(),
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toContain('not found in organization');
  });

  it('POST /assignments — rejects unresolvable target types without registered resolvers', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId: person.id,
        targetType: 'unregistered_domain', // Unresolvable target type without registered resolver
        targetId: uuidv4(),
        assignmentType: 'mentor',
        startAt: new Date('2026-09-01T00:00:00Z').toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toContain('has not registered an active resolver');
  });

  it('POST /assignments — produces capacity warning when over-allocated (>100%)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId: person.id,
        targetType: 'team',
        targetId: teamTarget.id,
        assignmentType: 'reviewer',
        status: 'scheduled',
        startAt: new Date('2026-09-01T00:00:00Z').toISOString(),
        capacityType: 'allocation',
        capacityValue: 50, // 60% + 50% = 110%
        capacityUnit: 'percentage',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta?.warnings).toBeDefined();
    expect(res.body.meta.warnings.length).toBeGreaterThan(0);
    expect(res.body.meta.warnings[0]).toContain('Capacity Warning');
  });

  it('POST /assignments — rejects duplicate active assignment for same person, target, and type', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId: person.id,
        targetType: 'project',
        targetId: mockProjectId,
        assignmentType: 'contributor', // Duplicate
        startAt: new Date('2026-09-01T00:00:00Z').toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toContain('Active or scheduled assignment already exists');
  });

  it('GET /assignments — lists assignments with filters', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${org.id}/assignments?personId=${person.id}&targetType=project`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].targetType).toBe('project');
  });

  it('GET /assignments/:id — gets detail of assignment', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(createdAssignmentId);
  });

  it('PATCH /assignments/:id — updates assignment notes and capacity', async () => {
    const res = await request(app)
      .patch(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        notes: 'Updated notes for project',
        capacityValue: 70,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.notes).toBe('Updated notes for project');
    expect(res.body.data.capacityValue).toBe(70);
  });

  it('POST /assignments/:id/activate — activates scheduled assignment', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({ reason: 'Project started' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('active');
  });

  it('POST /assignments/:id/pause & activate — pauses and resumes assignment', async () => {
    // Pause
    const pauseRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}/pause`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({ reason: 'On temporary leave' });

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.status).toBe('paused');

    // Resume (activate)
    const activeRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({ reason: 'Resumed work' });

    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data.status).toBe('active');
  });

  it('POST /assignments/:id/complete — completes assignment', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}/complete`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({ reason: 'Project completed successfully' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('completed');
  });

  it('POST /assignments/:id/activate — rejects transition out of completed terminal state', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id)
      .send({ reason: 'Attempt to reactivate' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toContain('Invalid status transition');
  });

  it('GET /assignments/:id/history — fetches append-only history', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${org.id}/assignments/${createdAssignmentId}/history`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4); // initial, active, paused, active, completed
    expect(res.body.data[0].newStatus).toBe('scheduled');
  });

  it('GET /people/:personId/assignments — lists assignments for person', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${org.id}/people/${person.id}/assignments`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
