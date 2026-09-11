import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { ProjectService } from '../../src/modules/projects-tasks/application/project.service.js';
import { TaskService } from '../../src/modules/projects-tasks/application/task.service.js';
import { MeetingTypeService } from '../../src/modules/meetings/application/meeting-type.service.js';
import { MeetingService } from '../../src/modules/meetings/application/meeting.service.js';
import { MeetingTargetResolverRegistry } from '../../src/modules/meetings/domain/meeting-target.registry.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 6 — Meetings Engine Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let personA: any;
  let personB: any;
  let projectA: any;
  let projectB: any;
  let taskB: any;
  let typeA: any;
  let typeB: any;
  let meetingA: any;
  let meetingB: any;
  let actionItemA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Org A
    const resA = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Alpha Meeting Org',
      slug: 'tenant-alpha-meeting',
      adminEmail: 'admin@alpha-meeting.test',
      adminPassword: 'PasswordAlpha123!',
      adminFullName: 'Alpha Meeting Admin',
    });
    orgA = resA.organization;
    const loginA = await AuthService.login('admin@alpha-meeting.test', 'PasswordAlpha123!');
    tokenA = loginA.accessToken;

    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Alpha',
      email: 'alice@alpha-meeting.test',
      userId: resA.adminUser.id,
    });

    projectA = await ProjectService.createProject({
      organizationId: orgA.id,
      name: 'Alpha Project',
      key: 'ALPHAM',
      projectType: 'saas_product',
      createdByPersonId: personA.id,
    });

    const typesA = await MeetingTypeService.seedDefaultMeetingTypes(orgA.id);
    typeA = typesA[0];

    meetingA = await MeetingService.createMeeting({
      organizationId: orgA.id,
      title: 'Alpha Meeting',
      meetingTypeId: typeA.id,
      scheduledStartAt: new Date('2026-09-15T10:00:00Z'),
      scheduledEndAt: new Date('2026-09-15T11:00:00Z'),
      organizerPersonId: personA.id,
      createdByPersonId: personA.id,
      targetType: 'project',
      targetId: projectA.id,
    });

    actionItemA = await MeetingService.createActionItem(
      orgA.id,
      meetingA.id,
      {
        title: 'Alpha Action Item',
      },
      resA.adminUser.id
    );

    // 2. Setup Org B
    const resB = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Beta Meeting Org',
      slug: 'tenant-beta-meeting',
      adminEmail: 'admin@beta-meeting.test',
      adminPassword: 'PasswordBeta123!',
      adminFullName: 'Beta Meeting Admin',
    });
    orgB = resB.organization;
    const loginB = await AuthService.login('admin@beta-meeting.test', 'PasswordBeta123!');
    tokenB = loginB.accessToken;

    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'Beta',
      email: 'bob@beta-meeting.test',
      userId: resB.adminUser.id,
    });

    projectB = await ProjectService.createProject({
      organizationId: orgB.id,
      name: 'Beta Project',
      key: 'BETAM',
      projectType: 'client_project',
      createdByPersonId: personB.id,
    });

    taskB = await TaskService.createTask({
      organizationId: orgB.id,
      projectId: projectB.id,
      title: 'Beta Task',
      createdByPersonId: personB.id,
    });

    const typesB = await MeetingTypeService.seedDefaultMeetingTypes(orgB.id);
    typeB = typesB[0];

    meetingB = await MeetingService.createMeeting({
      organizationId: orgB.id,
      title: 'Beta Meeting',
      meetingTypeId: typeB.id,
      scheduledStartAt: new Date('2026-09-15T14:00:00Z'),
      scheduledEndAt: new Date('2026-09-15T15:00:00Z'),
      organizerPersonId: personB.id,
      createdByPersonId: personB.id,
      targetType: 'project',
      targetId: projectB.id,
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('prevents user in Org B from reading Org A meeting (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/meetings/${meetingA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('prevents creating meeting referencing cross-tenant organizer (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/meetings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        title: 'Cross Organizer Meeting',
        meetingTypeId: typeA.id,
        scheduledStartAt: '2026-09-15T10:00:00Z',
        scheduledEndAt: '2026-09-15T11:00:00Z',
        organizerPersonId: personB.id, // Org B person
        createdByPersonId: personA.id,
      });

    expect(res.status).toBe(404);
  });

  it('prevents creating meeting referencing cross-tenant meeting type (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/meetings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        title: 'Cross Type Meeting',
        meetingTypeId: typeB.id, // Org B meeting type
        scheduledStartAt: '2026-09-15T10:00:00Z',
        scheduledEndAt: '2026-09-15T11:00:00Z',
        organizerPersonId: personA.id,
        createdByPersonId: personA.id,
      });

    expect(res.status).toBe(404);
  });

  it('prevents creating meeting targeting cross-tenant project (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/meetings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        title: 'Cross Target Meeting',
        meetingTypeId: typeA.id,
        scheduledStartAt: '2026-09-15T10:00:00Z',
        scheduledEndAt: '2026-09-15T11:00:00Z',
        organizerPersonId: personA.id,
        createdByPersonId: personA.id,
        targetType: 'project',
        targetId: projectB.id, // Org B project
      });

    expect(res.status).toBe(404);
  });

  it('prevents adding cross-tenant participant to meeting (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/meetings/${meetingA.id}/participants`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        personId: personB.id, // Org B person
      });

    expect(res.status).toBe(404);
  });

  it('prevents linking cross-tenant task to action item (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/meetings/${meetingA.id}/action-items/${actionItemA.id}/link-task/${taskB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(404);
  });

  it('filters meeting types by tenant when listing', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgA.id}/meeting-types`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(200);
    const typeIds = res.body.data.map((t: any) => t.id);
    expect(typeIds).toContain(typeA.id);
    expect(typeIds).not.toContain(typeB.id);
  });

  it('enforces tenant boundary in MeetingTargetResolverRegistry', async () => {
    const registry = MeetingTargetResolverRegistry.getInstance();

    // Resolving Org A project with Org A ID succeeds
    const resProjA = await registry.resolveTarget(orgA.id, 'project', projectA.id);
    expect(resProjA.valid).toBe(true);

    // Resolving Org A project with Org B ID fails with NotFoundError
    await expect(registry.resolveTarget(orgB.id, 'project', projectA.id)).rejects.toThrow();
  });
});
