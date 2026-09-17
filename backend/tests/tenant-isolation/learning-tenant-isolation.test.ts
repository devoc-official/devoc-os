import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { LearningProgramService } from '../../src/modules/learning/application/learning-program.service.js';
import { EnrollmentService } from '../../src/modules/learning/application/enrollment.service.js';
import { LearningReviewService } from '../../src/modules/learning/application/learning-review.service.js';
import { AssessmentService } from '../../src/modules/learning/application/assessment.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 7 — Learning Engine Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let personA: any;
  let personB: any;
  let programA: any;
  let programB: any;
  let enrollmentA: any;
  let reviewA: any;
  let assessmentA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Org Learning A',
      slug: 'org-learning-a',
      adminEmail: 'admin@org-learning-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Learning A',
    });
    orgA = bootA.organization;
    const loginA = await AuthService.login('admin@org-learning-a.internal', 'Password123!');
    tokenA = loginA.accessToken;

    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Org Learning B',
      slug: 'org-learning-b',
      adminEmail: 'admin@org-learning-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Learning B',
    });
    orgB = bootB.organization;
    const loginB = await AuthService.login('admin@org-learning-b.internal', 'Password123!');
    tokenB = loginB.accessToken;

    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Alice',
      lastName: 'Student',
      email: 'alice@orga.com',
    });

    personB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Bob',
      lastName: 'Student',
      email: 'bob@orgb.com',
    });

    const progService = new LearningProgramService();
    programA = await progService.createProgram(orgA.id, { name: 'Track A', code: 'TRK-A' }, bootA.adminUser.id);
    await progService.activateProgram(orgA.id, programA.id, bootA.adminUser.id);

    programB = await progService.createProgram(orgB.id, { name: 'Track B', code: 'TRK-B' }, bootB.adminUser.id);
    await progService.activateProgram(orgB.id, programB.id, bootB.adminUser.id);

    const enrService = new EnrollmentService();
    enrollmentA = await enrService.createEnrollment(orgA.id, { personId: personA.id, learningProgramId: programA.id }, bootA.adminUser.id);
    await enrService.activateEnrollment(orgA.id, enrollmentA.id, bootA.adminUser.id);

    const revService = new LearningReviewService();
    reviewA = await revService.createReview(
      orgA.id,
      enrollmentA.id,
      { reviewerPersonId: personA.id, summary: 'Weekly Org A Sync' },
      bootA.adminUser.id
    );

    const assService = new AssessmentService();
    assessmentA = await assService.createAssessment(
      orgA.id,
      enrollmentA.id,
      { title: 'Org A Assessment' },
      bootA.adminUser.id
    );
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should return 404 when Org B attempts to fetch Org A learning program', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/learning-programs/${programA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to fetch Org A enrollment', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/learning-enrollments/${enrollmentA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to activate Org A enrollment', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/learning-enrollments/${enrollmentA.id}/activate`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to view Org A enrollment reviews', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/learning-enrollments/${enrollmentA.id}/reviews`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should return 404 when Org B attempts to view Org A assessment', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/assessments/${assessmentA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('should reject enrollment into cross-tenant program', async () => {
    const enrService = new EnrollmentService();
    await expect(
      enrService.createEnrollment(orgB.id, { personId: personB.id, learningProgramId: programA.id }, 'actor')
    ).rejects.toThrow();
  });
});
