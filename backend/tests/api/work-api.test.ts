import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { ProjectService } from '../../src/modules/projects-tasks/application/project.service.js';
import { TaskService } from '../../src/modules/projects-tasks/application/task.service.js';
import { AssignmentService } from '../../src/modules/assignments/application/assignment.service.js';
import { WorkCategoryService } from '../../src/modules/work/application/work-category.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 5 — Work Engine API Integration Tests', () => {
  let app: any;
  let org: any;
  let token: string;
  let adminUser: any;
  let person: any;
  let bu: any;
  let project: any;
  let task: any;
  let assignment: any;
  let defaultCategories: any[];
  let engCategory: any;
  let stratCategory: any;

  const assignmentService = new AssignmentService();

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // Setup Organization
    const res = await OrganizationService.bootstrapOrganization({
      name: 'Work API Test Org',
      slug: 'work-api-org',
      adminEmail: 'admin@work-api.test',
      adminPassword: 'Password123!',
      adminFullName: 'Work Admin',
    });
    org = res.organization;
    adminUser = res.adminUser;

    const login = await AuthService.login('admin@work-api.test', 'Password123!');
    token = login.accessToken;

    person = await PeopleService.createPerson(org.id, {
      firstName: 'Dev',
      lastName: 'Lead',
      email: 'dev.lead@work-api.test',
      userId: adminUser.id,
    });

    bu = await StructureService.createBusinessUnit(org.id, {
      name: 'Engineering BU',
      code: 'BU-ENG-WORK',
    });

    project = await ProjectService.createProject({
      organizationId: org.id,
      name: 'OS Development',
      key: 'OSDEV',
      projectType: 'saas_product',
      createdByPersonId: person.id,
    });

    task = await TaskService.createTask({
      organizationId: org.id,
      projectId: project.id,
      title: 'M5 Work Engine Task',
      createdByPersonId: person.id,
    });

    const assignmentRes = await assignmentService.createAssignment({
      organizationId: org.id,
      personId: person.id,
      targetType: 'project',
      targetId: project.id,
      assignmentType: 'developer',
      startAt: new Date('2026-01-01'),
    });
    assignment = assignmentRes.assignment;

    defaultCategories = await WorkCategoryService.seedDefaultCategories(org.id);
    engCategory = defaultCategories.find((c) => c.code === 'engineering');
    stratCategory = defaultCategories.find((c) => c.code === 'strategy');
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('Work Categories API', () => {
    it('GET /work-categories - retrieves seeded default categories', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/work-categories`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(12);
      const codes = res.body.data.map((c: any) => c.code);
      expect(codes).toContain('engineering');
      expect(codes).toContain('strategy');
      expect(codes).toContain('management');
    });

    it('POST /work-categories - creates custom work category', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work-categories`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Custom Innovation Lab',
          code: 'custom_innovation',
          description: 'Special innovation work category',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('custom_innovation');
      expect(res.body.data.active).toBe(true);
    });

    it('PATCH /work-categories/:id - updates work category', async () => {
      const createRes = await request(app)
        .post(`/api/v1/organizations/${org.id}/work-categories`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Temp Category',
          code: 'temp_cat',
        });

      const catId = createRes.body.data.id;

      const patchRes = await request(app)
        .patch(`/api/v1/organizations/${org.id}/work-categories/${catId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Updated Temp Category',
          description: 'Updated description',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.name).toBe('Updated Temp Category');
    });
  });

  describe('Work Records CRUD & Target Validation API', () => {
    let createdWorkId: string;

    it('POST /work - creates work record targeting project with valid duration', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: person.id,
          title: 'Engine Architecture Design',
          description: 'Designed work domain entity & schema',
          categoryId: engCategory.id,
          targetType: 'project',
          targetId: project.id,
          assignmentId: assignment.id,
          durationMinutes: 240,
          startedAt: '2026-09-10T08:00:00Z',
          endedAt: '2026-09-10T12:00:00Z',
          createdByPersonId: person.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.durationMinutes).toBe(240);
      expect(res.body.data.personId).toBe(person.id);
      expect(res.body.data.targetType).toBe('project');
      expect(res.body.data.targetId).toBe(project.id);
      createdWorkId = res.body.data.id;
    });

    it('POST /work - creates targetless work record', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: person.id,
          title: 'General Team Sync & Strategy',
          categoryId: stratCategory.id,
          durationMinutes: 60,
          createdByPersonId: person.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.targetType).toBeNull();
      expect(res.body.data.targetId).toBeNull();
    });

    it('GET /work/:id - gets work record by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/work/${createdWorkId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdWorkId);
      expect(res.body.data.title).toBe('Engine Architecture Design');
    });

    it('GET /work - lists work records with filtering', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/work?targetType=project&targetId=${project.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].targetId).toBe(project.id);
    });

    it('PATCH /work/:id - updates draft work record', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/work/${createdWorkId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'Engine Architecture Design v2',
          durationMinutes: 300,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Engine Architecture Design v2');
      expect(res.body.data.durationMinutes).toBe(300);
    });
  });

  describe('Work Lifecycle Status Transitions API', () => {
    let workId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: person.id,
          title: 'Lifecycle Test Work',
          categoryId: engCategory.id,
          durationMinutes: 120,
          createdByPersonId: person.id,
        });
      workId = res.body.data.id;
    });

    it('POST /work/:id/submit - submits draft work record', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work/${workId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('submitted');
    });

    it('POST /work/:id/reject - rejects submitted work record back to draft', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work/${workId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
    });

    it('POST /work/:id/submit - resubmits rejected work record', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work/${workId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('submitted');
    });

    it('POST /work/:id/approve - approves submitted work record', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work/${workId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
    });

    it('PATCH /work/:id - fails to update approved work record (terminal)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/work/${workId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ title: 'New Title Should Fail' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /work/:id/cancel - cancels a draft work record', async () => {
      const draftRes = await request(app)
        .post(`/api/v1/organizations/${org.id}/work`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: person.id,
          title: 'Work To Be Cancelled',
          categoryId: engCategory.id,
          durationMinutes: 30,
          createdByPersonId: person.id,
        });

      const cancelWorkId = draftRes.body.data.id;

      const cancelRes = await request(app)
        .post(`/api/v1/organizations/${org.id}/work/${cancelWorkId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');
    });
  });

  describe('Work Evidence API', () => {
    let workId: string;
    let evidenceId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: person.id,
          title: 'Evidence Test Work',
          categoryId: engCategory.id,
          durationMinutes: 60,
          createdByPersonId: person.id,
        });
      workId = res.body.data.id;
    });

    it('POST /work/:id/evidence - adds evidence to work record', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work/${workId}/evidence`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          evidenceType: 'github_pull_request',
          title: 'Pull Request #42',
          referenceUri: 'https://github.com/devoc-official/devoc-os/pull/42',
          description: 'Added work evidence endpoints',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.evidenceType).toBe('github_pull_request');
      evidenceId = res.body.data.id;
    });

    it('GET /work/:id/evidence - lists evidence for work record', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/work/${workId}/evidence`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(evidenceId);
    });

    it('DELETE /work/:id/evidence/:evidenceId - removes evidence', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${org.id}/work/${workId}/evidence/${evidenceId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Evidence removed successfully');

      // Verify deletion
      const listRes = await request(app)
        .get(`/api/v1/organizations/${org.id}/work/${workId}/evidence`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('Outcomes & Work Outcomes API', () => {
    let outcomeId: string;
    let workId: string;

    beforeAll(async () => {
      const workRes = await request(app)
        .post(`/api/v1/organizations/${org.id}/work`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: person.id,
          title: 'Outcome Test Work',
          categoryId: engCategory.id,
          durationMinutes: 90,
          createdByPersonId: person.id,
        });
      workId = workRes.body.data.id;
    });

    it('POST /outcomes - creates an outcome', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/outcomes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'M5 Work Engine Schema Finalized',
          description: 'PostgreSQL schema with 5 tables and indexes',
          outcomeType: 'deliverable',
          createdByPersonId: person.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('M5 Work Engine Schema Finalized');
      outcomeId = res.body.data.id;
    });

    it('GET /outcomes - lists outcomes', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/outcomes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /outcomes/:outcomeId - gets outcome details', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/outcomes/${outcomeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(outcomeId);
    });

    it('POST /work/:workId/outcomes - associates outcome to work record', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/work/${workId}/outcomes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ outcomeId });

      expect(res.status).toBe(201);
      expect(res.body.data.outcomeId).toBe(outcomeId);
      expect(res.body.data.workRecordId).toBe(workId);
    });

    it('GET /work/:workId/outcomes - lists outcomes for work record', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/work/${workId}/outcomes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(outcomeId);
    });

    it('DELETE /work/:workId/outcomes/:outcomeId - removes outcome association', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${org.id}/work/${workId}/outcomes/${outcomeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Work outcome unlinked successfully');

      // Verify deletion
      const listRes = await request(app)
        .get(`/api/v1/organizations/${org.id}/work/${workId}/outcomes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('Audit Logs & Domain Events Verification', () => {
    it('verifies audit logs recorded M5 work events', async () => {
      const db = getDbClient();
      const res = await db.query(
        `SELECT action FROM audit_logs WHERE organization_id = $1 AND (action LIKE 'work.%' OR action LIKE 'outcome.%' OR action LIKE 'evidence.%');`,
        [org.id]
      );

      const actions = res.rows.map((r: any) => r.action);
      expect(actions).toContain('work.created');
      expect(actions).toContain('work.submitted');
      expect(actions).toContain('work.approved');
      expect(actions).toContain('outcome.created');
      expect(actions).toContain('evidence.added');
    });
  });
});
