import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EvaluationTemplateService } from '../../src/modules/evaluation/application/evaluation-template.service.js';
import { EvaluationService } from '../../src/modules/evaluation/application/evaluation.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 8 — Evaluation Engine Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let personA: any;
  let personB: any;
  let templateA: any;
  let evaluationA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Org Eval Isolation A',
      slug: 'org-eval-iso-a',
      adminEmail: 'admin@eval-iso-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Eval A',
    });
    orgA = bootA.organization;
    const loginA = await AuthService.login('admin@eval-iso-a.internal', 'Password123!');
    tokenA = loginA.accessToken;

    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Org Eval Isolation B',
      slug: 'org-eval-iso-b',
      adminEmail: 'admin@eval-iso-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Eval B',
    });
    orgB = bootB.organization;
    const loginB = await AuthService.login('admin@eval-iso-b.internal', 'Password123!');
    tokenB = loginB.accessToken;

    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Worker',
      email: 'alice@orga-eval.com',
    });

    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'Worker',
      email: 'bob@orgb-eval.com',
    });

    const tmplService = new EvaluationTemplateService();
    templateA = await tmplService.createTemplate(
      orgA.id,
      {
        name: 'Org A Template',
        criteria: [{ name: 'Quality', criterionType: 'numeric' }],
      },
      bootA.adminUser.id
    );

    const evalService = new EvaluationService();
    evaluationA = await evalService.createEvaluation(
      orgA.id,
      {
        templateId: templateA.id,
        subjectId: personA.id,
      },
      bootA.adminUser.id
    );
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should return 404 when Org B attempts to fetch Org A template', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/evaluation-templates/${templateA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to fetch Org A evaluation', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/evaluations/${evaluationA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to complete Org A evaluation', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/evaluations/${evaluationA.id}/complete`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should reject evaluation creation referencing cross-tenant subject or template', async () => {
    const evalService = new EvaluationService();

    // Org B trying to use Org A template
    await expect(
      evalService.createEvaluation(orgB.id, { templateId: templateA.id, subjectId: personB.id }, 'actor')
    ).rejects.toThrow();

    // Org B trying to evaluate Org A subject
    await expect(
      evalService.createEvaluation(orgA.id, { templateId: templateA.id, subjectId: personB.id }, 'actor')
    ).rejects.toThrow();
  });
});
