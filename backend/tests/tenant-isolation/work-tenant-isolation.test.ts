import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { ProjectService } from '../../src/modules/projects-tasks/application/project.service.js';
import { TaskService } from '../../src/modules/projects-tasks/application/task.service.js';
import { AssignmentService } from '../../src/modules/assignments/application/assignment.service.js';
import { WorkCategoryService } from '../../src/modules/work/application/work-category.service.js';
import { WorkService } from '../../src/modules/work/application/work.service.js';
import { WorkTargetResolverRegistry } from '../../src/modules/work/domain/work-target.registry.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 5 — Work Engine Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let personA: any;
  let personB: any;
  let buA: any;
  let buB: any;
  let projectA: any;
  let projectB: any;
  let taskA: any;
  let taskB: any;
  let catA: any;
  let catB: any;
  let workA: any;
  let workB: any;
  let outcomeA: any;
  let outcomeB: any;
  let assignmentB: any;

  const assignmentService = new AssignmentService();

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Org A
    const resA = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Alpha Work Org',
      slug: 'tenant-alpha-work',
      adminEmail: 'admin@alpha-work.test',
      adminPassword: 'PasswordAlpha123!',
      adminFullName: 'Alpha Work Admin',
    });
    orgA = resA.organization;
    const loginA = await AuthService.login('admin@alpha-work.test', 'PasswordAlpha123!');
    tokenA = loginA.accessToken;

    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Alpha',
      email: 'alice@alpha-work.test',
      userId: resA.adminUser.id,
    });

    buA = await StructureService.createBusinessUnit(orgA.id, {
      name: 'Alpha Engineering BU',
      code: 'BU-ALPHA-WORK',
    });

    projectA = await ProjectService.createProject({
      organizationId: orgA.id,
      name: 'Alpha Work Project',
      key: 'ALPHAW',
      projectType: 'saas_product',
      createdByPersonId: personA.id,
    });

    taskA = await TaskService.createTask({
      organizationId: orgA.id,
      projectId: projectA.id,
      title: 'Alpha Work Task',
      createdByPersonId: personA.id,
    });

    const categoriesA = await WorkCategoryService.seedDefaultCategories(orgA.id);
    catA = categoriesA[0];

    workA = await WorkService.createWorkRecord({
      organizationId: orgA.id,
      personId: personA.id,
      title: 'Alpha Work Record',
      categoryId: catA.id,
      targetType: 'project',
      targetId: projectA.id,
      durationMinutes: 120,
      createdByPersonId: personA.id,
    });

    outcomeA = await WorkService.createOutcome({
      organizationId: orgA.id,
      title: 'Alpha Deliverable',
      outcomeType: 'deliverable',
      createdByPersonId: personA.id,
    });

    // 2. Setup Org B
    const resB = await OrganizationService.bootstrapOrganization({
      name: 'Tenant Beta Work Org',
      slug: 'tenant-beta-work',
      adminEmail: 'admin@beta-work.test',
      adminPassword: 'PasswordBeta123!',
      adminFullName: 'Beta Work Admin',
    });
    orgB = resB.organization;
    const loginB = await AuthService.login('admin@beta-work.test', 'PasswordBeta123!');
    tokenB = loginB.accessToken;

    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'Beta',
      email: 'bob@beta-work.test',
      userId: resB.adminUser.id,
    });

    buB = await StructureService.createBusinessUnit(orgB.id, {
      name: 'Beta Engineering BU',
      code: 'BU-BETA-WORK',
    });

    projectB = await ProjectService.createProject({
      organizationId: orgB.id,
      name: 'Beta Work Project',
      key: 'BETAW',
      projectType: 'client_project',
      createdByPersonId: personB.id,
    });

    taskB = await TaskService.createTask({
      organizationId: orgB.id,
      projectId: projectB.id,
      title: 'Beta Work Task',
      createdByPersonId: personB.id,
    });

    const assignmentResB = await assignmentService.createAssignment({
      organizationId: orgB.id,
      personId: personB.id,
      targetType: 'project',
      targetId: projectB.id,
      assignmentType: 'developer',
      startAt: new Date('2026-01-01'),
    });
    assignmentB = assignmentResB.assignment;

    const categoriesB = await WorkCategoryService.seedDefaultCategories(orgB.id);
    catB = categoriesB[0];

    workB = await WorkService.createWorkRecord({
      organizationId: orgB.id,
      personId: personB.id,
      title: 'Beta Work Record',
      categoryId: catB.id,
      targetType: 'project',
      targetId: projectB.id,
      durationMinutes: 60,
      createdByPersonId: personB.id,
    });

    outcomeB = await WorkService.createOutcome({
      organizationId: orgB.id,
      title: 'Beta Deliverable',
      outcomeType: 'deliverable',
      createdByPersonId: personB.id,
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('prevents user in Org B from reading Org A work record (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/work/${workA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('prevents creating work record referencing cross-tenant person (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/work`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        personId: personB.id, // Org B person
        title: 'Cross Tenant Work',
        categoryId: catA.id,
        durationMinutes: 60,
        createdByPersonId: personA.id,
      });

    expect(res.status).toBe(404);
  });

  it('prevents creating work record referencing cross-tenant category (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/work`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        personId: personA.id,
        title: 'Cross Category Work',
        categoryId: catB.id, // Org B category
        durationMinutes: 60,
        createdByPersonId: personA.id,
      });

    expect(res.status).toBe(404);
  });

  it('prevents creating work record referencing cross-tenant project target (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/work`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        personId: personA.id,
        title: 'Cross Project Work Target',
        categoryId: catA.id,
        targetType: 'project',
        targetId: projectB.id, // Org B project
        durationMinutes: 60,
        createdByPersonId: personA.id,
      });

    expect(res.status).toBe(404);
  });

  it('prevents creating work record referencing cross-tenant assignment (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/work`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        personId: personA.id,
        title: 'Cross Assignment Work',
        categoryId: catA.id,
        assignmentId: assignmentB.id, // Org B assignment
        durationMinutes: 60,
        createdByPersonId: personA.id,
      });

    expect(res.status).toBe(404);
  });

  it('prevents adding evidence to cross-tenant work record (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/work/${workB.id}/evidence`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        evidenceType: 'link',
        title: 'Cross Tenant Evidence',
        referenceUri: 'https://example.com',
      });

    expect(res.status).toBe(404);
  });

  it('prevents associating cross-tenant outcome to work record (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgA.id}/work/${workA.id}/outcomes`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        outcomeId: outcomeB.id, // Org B outcome
      });

    expect(res.status).toBe(404);
  });

  it('filters outcomes by tenant when listing', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgA.id}/outcomes`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Organization-Id', orgA.id);

    expect(res.status).toBe(200);
    const outcomeIds = res.body.data.map((o: any) => o.id);
    expect(outcomeIds).toContain(outcomeA.id);
    expect(outcomeIds).not.toContain(outcomeB.id);
  });

  it('enforces tenant isolation in WorkTargetResolverRegistry', async () => {
    const registry = WorkTargetResolverRegistry.getInstance();

    // Resolving Org A project with Org A ID succeeds
    const resProjA = await registry.resolveTarget(orgA.id, 'project', projectA.id);
    expect(resProjA.valid).toBe(true);

    // Resolving Org A project with Org B ID fails with NotFoundError
    await expect(registry.resolveTarget(orgB.id, 'project', projectA.id)).rejects.toThrow();

    // Resolving Org A task with Org A ID succeeds
    const resTaskA = await registry.resolveTarget(orgA.id, 'task', taskA.id);
    expect(resTaskA.valid).toBe(true);

    // Resolving Org A task with Org B ID fails with NotFoundError
    await expect(registry.resolveTarget(orgB.id, 'task', taskA.id)).rejects.toThrow();
  });
});
