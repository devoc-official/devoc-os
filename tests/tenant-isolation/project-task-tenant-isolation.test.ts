import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { ProjectService } from '../../src/modules/projects-tasks/application/project.service.js';
import { TaskService } from '../../src/modules/projects-tasks/application/task.service.js';
import { TargetResolverRegistry } from '../../src/modules/assignments/domain/target-resolver.registry.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 4 — Projects & Tasks Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let personA: any;
  let personB: any;
  let buB: any;
  let projectA: any;
  let projectB: any;
  let taskA: any;
  let taskB: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Org A
    const resA = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Alpha Org',
      slug: 'tenant-alpha-proj',
      adminEmail: 'admin@alpha-proj.test',
      adminPassword: 'PasswordAlpha123!',
      adminFullName: 'Alpha Admin',
    });
    orgA = resA.organization;
    const loginA = await AuthService.login('admin@alpha-proj.test', 'PasswordAlpha123!');
    tokenA = loginA.accessToken;

    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Alpha',
      email: 'alice@alpha-proj.test',
    });

    projectA = await ProjectService.createProject({
      organizationId: orgA.id,
      name: 'Alpha Project',
      key: 'ALPHA',
      projectType: 'saas_product',
      createdByPersonId: personA.id,
    });

    taskA = await TaskService.createTask({
      organizationId: orgA.id,
      projectId: projectA.id,
      title: 'Alpha Task',
      createdByPersonId: personA.id,
    });

    // 2. Setup Org B
    const resB = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Beta Org',
      slug: 'tenant-beta-proj',
      adminEmail: 'admin@beta-proj.test',
      adminPassword: 'PasswordBeta123!',
      adminFullName: 'Beta Admin',
    });
    orgB = resB.organization;
    const loginB = await AuthService.login('admin@beta-proj.test', 'PasswordBeta123!');
    tokenB = loginB.accessToken;

    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'Beta',
      email: 'bob@beta-proj.test',
    });

    buB = await StructureService.createBusinessUnit(orgB.id, {
      name: 'Beta BU',
      code: 'BU-BETA-ISO',
    });

    projectB = await ProjectService.createProject({
      organizationId: orgB.id,
      name: 'Beta Project',
      key: 'BETA',
      projectType: 'client_project',
      createdByPersonId: personB.id,
    });

    taskB = await TaskService.createTask({
      organizationId: orgB.id,
      projectId: projectB.id,
      title: 'Beta Task',
      createdByPersonId: personB.id,
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('prevents user in Org B from reading Org A project (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/projects/${projectA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('prevents user in Org B from reading Org A task (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/tasks/${taskA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects cross-tenant task dependencies (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/tasks/${taskA.id}/dependencies`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dependsOnTaskId: taskB.id,
      });

    expect(res.status).toBe(404);
  });

  it('rejects linking cross-tenant Business Unit to project (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/projects/${projectA.id}/business-units/${buB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(404);
  });

  it('enforces tenant boundary in database-backed project and task target resolvers', async () => {
    const registry = TargetResolverRegistry.getInstance();

    // Resolving Org A's project with Org A ID succeeds
    const resProjectA = await registry.resolveTarget(orgA.id, 'project', projectA.id);
    expect(resProjectA.valid).toBe(true);

    // Resolving Org A's project with Org B ID fails with NotFoundError
    await expect(registry.resolveTarget(orgB.id, 'project', projectA.id)).rejects.toThrow();

    // Resolving Org A's task with Org A ID succeeds
    const resTaskA = await registry.resolveTarget(orgA.id, 'task', taskA.id);
    expect(resTaskA.valid).toBe(true);

    // Resolving Org A's task with Org B ID fails
    await expect(registry.resolveTarget(orgB.id, 'task', taskA.id)).rejects.toThrow();
  });
});
