import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 8 — Evaluation Engine API Integration Tests', () => {
  let app: any;
  let org: any;
  let adminUser: any;
  let token: string;
  let subjectPerson: any;
  let evaluatorPerson: any;
  let templateId: string;
  let evaluationId: string;
  let criterionId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Evaluation Test Org',
      slug: 'eval-test-org',
      adminEmail: 'admin@eval-test.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Eval',
    });

    org = boot.organization;
    adminUser = boot.adminUser;

    const loginRes = await AuthService.login('admin@eval-test.internal', 'Password123!');
    token = loginRes.accessToken;

    subjectPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Jane',
      lastName: 'Developer',
      email: 'jane@eval-test.internal',
    });

    evaluatorPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Bob',
      lastName: 'Manager',
      email: 'bob@eval-test.internal',
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. POST /api/v1/evaluation-templates — create template with criteria', async () => {
    const res = await request(app)
      .post('/api/v1/evaluation-templates')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        name: 'Quarterly Developer Performance Review',
        description: 'Comprehensive review of software deliverables and design',
        criteria: [
          { name: 'Code Quality', weight: 2.0, criterionType: 'numeric' },
          { name: 'Architecture Compliance', weight: 1.0, criterionType: 'rating' },
          { name: 'Overall Comments', weight: 1.0, criterionType: 'qualitative' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('Quarterly Developer Performance Review');
    expect(res.body.data.criteria.length).toBe(3);

    templateId = res.body.data.id;
    criterionId = res.body.data.criteria[0].id;
  });

  it('2. GET /api/v1/evaluation-templates — list templates', async () => {
    const res = await request(app)
      .get('/api/v1/evaluation-templates')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('3. GET /api/v1/evaluation-templates/:id — retrieve single template', async () => {
    const res = await request(app)
      .get(`/api/v1/evaluation-templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(templateId);
  });

  it('4. POST /api/v1/evaluations — create evaluation in Draft state', async () => {
    const res = await request(app)
      .post('/api/v1/evaluations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        templateId,
        subjectId: subjectPerson.id,
        evaluatorIds: [evaluatorPerson.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.state).toBe('Draft');
    expect(res.body.data.subjectId).toBe(subjectPerson.id);

    evaluationId = res.body.data.id;
  });

  it('5. PATCH /api/v1/evaluations/:id — transition state to InProgress', async () => {
    const res = await request(app)
      .patch(`/api/v1/evaluations/${evaluationId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ state: 'InProgress' });

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('InProgress');
  });

  it('6. POST /api/v1/evaluations/:id/criteria/:criterionId/result — submit criterion results', async () => {
    // Fetch template to get all criteria IDs
    const tmplRes = await request(app)
      .get(`/api/v1/evaluation-templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    const criteria = tmplRes.body.data.criteria;

    // Submit result for criterion 1 (numeric)
    const res1 = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/criteria/${criteria[0].id}/result`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ value: '4.8', comments: 'Excellent modular monolith design' });
    expect(res1.status).toBe(201);

    // Submit result for criterion 2 (rating)
    const res2 = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/criteria/${criteria[1].id}/result`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ value: 'Exceptional', comments: 'Follows ADR-012 guidelines' });
    expect(res2.status).toBe(201);

    // Submit result for criterion 3 (qualitative)
    const res3 = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/criteria/${criteria[2].id}/result`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({ value: 'Exceeded all quarter expectations' });
    expect(res3.status).toBe(201);
  });

  it('7. POST /api/v1/evaluations/:id/feedback — attach evidence feedback', async () => {
    const res = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/feedback`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id)
      .send({
        feedbackType: 'text',
        payload: { summary: 'Strong peer recommendations and zero regression bugs' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.feedbackType).toBe('text');
  });

  it('8. POST /api/v1/evaluations/:id/submit — transition to Submitted', async () => {
    const res = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('Submitted');
  });

  it('9. POST /api/v1/evaluations/:id/complete — mark Completed and derive outcomes & history', async () => {
    const res = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('Completed');
    expect(res.body.data.outcomes).toBeDefined();
    expect(res.body.data.outcomes.length).toBeGreaterThan(0);
  });

  it('10. GET /api/v1/evaluations/history/:id — fetch immutable JSON snapshot', async () => {
    const res = await request(app)
      .get(`/api/v1/evaluations/history/${evaluationId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.evaluationId).toBe(evaluationId);
    expect(res.body.data.state).toBe('Completed');
    expect(res.body.data.template.name).toBe('Quarterly Developer Performance Review');
  });
});
