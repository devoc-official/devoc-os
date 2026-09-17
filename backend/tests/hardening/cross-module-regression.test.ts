import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { WorkCategoryService } from '../../src/modules/work/application/work-category.service.js';

describe('System Hardening — End-to-End Cross-Module Backbone Journey', () => {
  let app: any;
  let org: any;
  let token: string;
  let adminUser: any;
  let personId: string;
  let employmentId: string;
  let projectId: string;
  let assignmentId: string;
  let workCategoryId: string;
  let workId: string;
  let outcomeId: string;
  let templateId: string;
  let evaluationId: string;
  let metricId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Backbone Journey Org',
      slug: 'backbone-journey-org',
      adminEmail: 'admin@backbone.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Backbone',
    });
    org = boot.organization;
    adminUser = boot.adminUser;

    const login = await AuthService.login('admin@backbone.internal', 'Password123!');
    token = login.accessToken;

    const seededCats = await WorkCategoryService.seedDefaultCategories(org.id);
    workCategoryId = seededCats[0].id;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. Person: POST /api/v1/people — creates individual record', async () => {
    const res = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        firstName: 'Alan',
        lastName: 'Turing',
        email: 'alan.turing@backbone.internal',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    personId = res.body.data.id;
  });

  it('2. Employment: POST /api/v1/employments — binds person to employment', async () => {
    const res = await request(app)
      .post('/api/v1/employments')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId,
        employmentType: 'full_time',
        startDate: '2026-09-01',
        jobTitle: 'Lead Cryptanalyst',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('active');
    employmentId = res.body.data.id;
  });

  it('3. Project & Assignment: links person to operational project', async () => {
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Bombe Decryption Engine',
        key: 'BOMBE',
        projectType: 'saas_product',
        createdByPersonId: personId,
      });

    expect(projRes.status).toBe(201);
    projectId = projRes.body.data.id;

    const assignRes = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId,
        targetType: 'project',
        targetId: projectId,
        assignmentType: 'tech_lead',
        startAt: '2026-09-01T00:00:00Z',
      });

    expect(assignRes.status).toBe(201);
    assignmentId = assignRes.body.data.id;
  });

  it('4. Work: records, submits, and approves work record', async () => {
    const workRes = await request(app)
      .post('/api/v1/work')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        personId,
        title: 'Design Rotational Enigma Rotor Logic',
        description: 'Implemented multi-rotor rotor permutation algorithm',
        categoryId: workCategoryId,
        targetType: 'project',
        targetId: projectId,
        assignmentId,
        startedAt: '2026-09-16T08:00:00Z',
        endedAt: '2026-09-16T16:00:00Z',
        durationMinutes: 480,
        createdByPersonId: personId,
      });

    expect(workRes.status).toBe(201);
    workId = workRes.body.data.id;
    expect(workRes.body.data.status).toBe('draft');

    // Submit work
    const submitRes = await request(app)
      .post(`/api/v1/work/${workId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');

    // Approve work
    const approveRes = await request(app)
      .post(`/api/v1/work/${workId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
  });

  it('5. Outcome: creates outcome and links to work record', async () => {
    const outcomeRes = await request(app)
      .post('/api/v1/outcomes')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        title: 'Naval Enigma Deciphered',
        description: 'First live operational intercept decrypted successfully',
        outcomeType: 'milestone',
        createdByPersonId: personId,
      });

    expect(outcomeRes.status).toBe(201);
    outcomeId = outcomeRes.body.data.id;

    const linkRes = await request(app)
      .post(`/api/v1/work/${workId}/outcomes`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ outcomeId });

    expect(linkRes.status).toBe(201);
  });

  it('6. Evaluation: creates template, conducts review, and persists decision', async () => {
    const tmplRes = await request(app)
      .post('/api/v1/evaluation-templates')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Technical Impact Review',
        description: 'Quarterly evaluation of algorithmic breakthroughs',
        criteria: [
          { name: 'Algorithmic Precision', weight: 1.0, criterionType: 'numeric' },
          { name: 'Leadership Impact', weight: 1.0, criterionType: 'qualitative' },
        ],
      });

    expect(tmplRes.status).toBe(201);
    templateId = tmplRes.body.data.id;
    const criteria = tmplRes.body.data.criteria;

    const evalRes = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        templateId,
        subjectId: personId,
        evaluatorId: personId,
        evaluationType: 'performance',
      });

    expect(evalRes.status).toBe(201);
    evaluationId = evalRes.body.data.id;

    // Transition Draft -> InProgress
    const inProgRes = await request(app)
      .patch(`/api/v1/evaluations/${evaluationId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ state: 'InProgress' });
    expect(inProgRes.status).toBe(200);

    // Submit criterion results
    for (const crit of criteria) {
      await request(app)
        .post(`/api/v1/evaluations/${evaluationId}/criteria/${crit.id}/result`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ value: '5.0', comments: 'Exemplary' });
    }

    // Transition InProgress -> Submitted
    const submitEvalRes = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);
    expect(submitEvalRes.status).toBe(200);

    // Complete evaluation
    const completeRes = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ decision: 'promoted', summary: 'Exceptional mathematical contributions' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.state).toBe('Completed');
  });

  it('7. Analytics: defines metric and executes read-only aggregation', async () => {
    const metricRes = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Total Work Duration Hours',
        code: 'WORK_HOURS_TOTAL',
        domainModule: 'work',
        metricType: 'SUM',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
          field: 'duration_minutes',
        },
      });

    expect(metricRes.status).toBe(201);
    metricId = metricRes.body.data.id;

    const computeRes = await request(app)
      .post(`/api/v1/analytics/metrics/${metricId}/compute`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        startDate: '2026-09-01T00:00:00Z',
        endDate: '2026-09-30T23:59:59Z',
      });

    expect(computeRes.status).toBe(200);
    expect(computeRes.body.data.numericValue).toBe(480);
  });
});
