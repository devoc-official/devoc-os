import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { AuditService } from '../../src/audit/audit.service.js';

describe('Milestone 4 — Projects & Tasks Engine REST API E2E Tests', () => {
  let app: any;
  let org: any;
  let authToken: string;
  let creatorPerson: any;
  let ownerPerson: any;
  let businessUnit: any;
  let projectId: string;
  let epicTaskId: string;
  let mainTaskId: string;
  let subtaskId: string;
  let ownerId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // 1. Setup Org & Auth Token
    const res = await OrganizationService.bootstrapOrganization({
      name: 'Project Task API Org',
      slug: 'proj-task-api-org',
      adminEmail: 'admin@proj-task.test',
      adminPassword: 'PasswordProj123!',
      adminFullName: 'Project Admin',
    });
    org = res.organization;
    const login = await AuthService.login('admin@proj-task.test', 'PasswordProj123!');
    authToken = login.accessToken;

    // 2. Setup Business Unit
    businessUnit = await StructureService.createBusinessUnit(org.id, {
      name: 'Engineering BU',
      code: 'BU-ENG-API',
    });

    // 3. Setup People
    creatorPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Project',
      lastName: 'Manager',
      email: 'pm@proj-task.test',
    });

    ownerPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Tech',
      lastName: 'Lead',
      email: 'techlead@proj-task.test',
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  // --- PROJECT ENGINE TESTS ---
  describe('Project Engine Endpoints', () => {
    it('creates a project with initial owners and business units', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/projects`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'DeVoc Platform V1',
          key: 'DEVV1',
          description: 'Core platform build out',
          projectType: 'saas_product',
          status: 'idea',
          priority: 'critical',
          startAt: '2026-01-01T00:00:00.000Z',
          targetEndAt: '2026-12-31T00:00:00.000Z',
          createdByPersonId: creatorPerson.id,
          businessUnitIds: [businessUnit.id],
          owners: [
            {
              personId: ownerPerson.id,
              ownershipType: 'technical_owner',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.key).toBe('DEVV1');
      expect(res.body.data.status).toBe('idea');
      expect(res.body.data.owners).toHaveLength(1);
      expect(res.body.data.businessUnits).toHaveLength(1);

      projectId = res.body.data.id;
      ownerId = res.body.data.owners[0].id;
    });

    it('rejects creating a project with a duplicate key in the same organization', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/projects`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Duplicate Project',
          key: 'DEVV1',
          projectType: 'saas_product',
          createdByPersonId: creatorPerson.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('already exists');
    });

    it('retrieves project by ID with details', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(projectId);
      expect(res.body.data.name).toBe('DeVoc Platform V1');
    });

    it('updates non-lifecycle project fields', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'DeVoc Enterprise OS V1',
          priority: 'high',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('DeVoc Enterprise OS V1');
      expect(res.body.data.priority).toBe('high');
    });

    it('executes project status transition sequence through explicit transition endpoints', async () => {
      // 1. idea -> research
      const resResearch = await request(app)
        .post(`/api/v1/organizations/${org.id}/projects/${projectId}/research`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);
      expect(resResearch.status).toBe(200);
      expect(resResearch.body.data.status).toBe('research');

      // 2. research -> plan
      const resPlan = await request(app)
        .post(`/api/v1/organizations/${org.id}/projects/${projectId}/plan`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);
      expect(resPlan.status).toBe(200);
      expect(resPlan.body.data.status).toBe('planning');

      // 3. plan -> develop
      const resDevelop = await request(app)
        .post(`/api/v1/organizations/${org.id}/projects/${projectId}/develop`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);
      expect(resDevelop.status).toBe(200);
      expect(resDevelop.body.data.status).toBe('development');
    });

    it('rejects invalid project status transitions', async () => {
      // Attempting development -> released without testing/beta
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/projects/${projectId}/release`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid project status transition');
    });

    it('manages project owners', async () => {
      // Add creator as accountable owner
      const resAdd = await request(app)
        .post(`/api/v1/organizations/${org.id}/projects/${projectId}/owners`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: creatorPerson.id,
          ownershipType: 'accountable',
        });

      expect(resAdd.status).toBe(201);
      expect(resAdd.body.data.personId).toBe(creatorPerson.id);

      // List owners
      const resList = await request(app)
        .get(`/api/v1/organizations/${org.id}/projects/${projectId}/owners`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);

      expect(resList.status).toBe(200);
      expect(resList.body.data).toHaveLength(2);

      // Remove owner
      const addedOwnerId = resAdd.body.data.id;
      const resRemove = await request(app)
        .delete(`/api/v1/organizations/${org.id}/projects/${projectId}/owners/${addedOwnerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);

      expect(resRemove.status).toBe(200);
    });
  });

  // --- TASK ENGINE TESTS ---
  describe('Task Engine Endpoints', () => {
    it('creates an Epic task', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          projectId,
          title: 'M4 Domain Architecture Epic',
          taskType: 'epic',
          status: 'backlog',
          priority: 'critical',
          createdByPersonId: creatorPerson.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.taskType).toBe('epic');
      expect(res.body.data.taskKey).toBe('DEVV1-1');

      epicTaskId = res.body.data.id;
    });

    it('creates a standard Task under Epic', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          projectId,
          parentTaskId: epicTaskId,
          title: 'Implement Task Persistence',
          taskType: 'task',
          status: 'backlog',
          createdByPersonId: ownerPerson.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.parentTaskId).toBe(epicTaskId);

      mainTaskId = res.body.data.id;
    });

    it('creates a Subtask under Task', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          projectId,
          parentTaskId: mainTaskId,
          title: 'Write task repository SQL queries',
          taskType: 'subtask',
          status: 'backlog',
          createdByPersonId: ownerPerson.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.taskType).toBe('subtask');

      subtaskId = res.body.data.id;
    });

    it('rejects invalid parent task hierarchy (subtask under subtask)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          projectId,
          parentTaskId: subtaskId,
          title: 'Invalid nested subtask',
          taskType: 'subtask',
          createdByPersonId: ownerPerson.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Subtask cannot have another subtask as parent');
    });

    it('transitions task status through explicit lifecycle endpoints', async () => {
      // 1. backlog -> todo
      const resTodo = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks/${mainTaskId}/todo`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);
      expect(resTodo.status).toBe(200);
      expect(resTodo.body.data.status).toBe('todo');

      // 2. todo -> start (in_progress)
      const resStart = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks/${mainTaskId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);
      expect(resStart.status).toBe(200);
      expect(resStart.body.data.status).toBe('in_progress');
    });

    it('manages task dependencies and enforces cycle prevention', async () => {
      // Main task depends on Subtask (Subtask blocks Main task)
      const resDep = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks/${mainTaskId}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          dependsOnTaskId: subtaskId,
          dependencyType: 'blocks',
        });

      expect(resDep.status).toBe(201);
      expect(resDep.body.data.dependsOnTaskId).toBe(subtaskId);

      // Attempt to add reverse dependency (Subtask depends on Main task) causing cycle
      const resCycle = await request(app)
        .post(`/api/v1/organizations/${org.id}/tasks/${subtaskId}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          dependsOnTaskId: mainTaskId,
        });

      expect(resCycle.status).toBe(400);
      expect(resCycle.body.error.message).toContain('circular dependency');
    });
  });

  // --- ASSIGNMENT ENGINE INTEGRATION TESTS ---
  describe('Assignment Engine Integration', () => {
    it('creates an assignment targeting a Project via the Assignment Engine', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: ownerPerson.id,
          targetType: 'project',
          targetId: projectId,
          assignmentType: 'tech_lead',
          roleContext: 'technical_lead',
          status: 'active',
          startAt: '2026-01-01T00:00:00.000Z',
          capacityType: 'allocation',
          capacityValue: 50,
          capacityUnit: 'percentage',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.targetType).toBe('project');
      expect(res.body.data.targetId).toBe(projectId);
    });

    it('creates an assignment targeting a Task via the Assignment Engine', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: ownerPerson.id,
          targetType: 'task',
          targetId: mainTaskId,
          assignmentType: 'assignee',
          status: 'active',
          startAt: '2026-01-01T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.targetType).toBe('task');
      expect(res.body.data.targetId).toBe(mainTaskId);
    });

    it('queries assignments targeting project via project integration endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/projects/${projectId}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].targetId).toBe(projectId);
    });

    it('queries assignments targeting task via task integration endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/tasks/${mainTaskId}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].targetId).toBe(mainTaskId);
    });
  });

  // --- AUDIT & EVENTS VERIFICATION ---
  describe('Audit & Domain Events Integration', () => {
    it('verifies that project and task mutations are captured in audit logs', async () => {
      const logs = await AuditService.listLogsForTenant(org.id, 50);
      const actionNames = logs.map((l) => l.action);

      expect(actionNames).toContain('project.created');
      expect(actionNames).toContain('project.updated');
      expect(actionNames).toContain('project.status_changed');
      expect(actionNames).toContain('task.created');
      expect(actionNames).toContain('task.status_changed');
      expect(actionNames).toContain('task.dependency_added');
    });
  });
});
