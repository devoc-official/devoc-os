import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { PipelineStageRepository } from '../../src/modules/recruitment/infrastructure/pipeline-stage.repository.js';
import { PositionRepository } from '../../src/modules/recruitment/infrastructure/position.repository.js';

describe('Milestone 13 — Recruitment Engine REST API Integration Tests', () => {
  let app: any;
  let org: any;
  let adminUser: any;
  let token: string;
  let hiringManager: any;
  let positionId: string;
  let candidateId: string;
  let applicationId: string;
  let offerId: string;
  let stages: any[];

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Recruitment E2E Org',
      slug: 'recruitment-e2e-org',
      adminEmail: 'recruiter@devoc.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Recruitment Admin',
    });

    org = boot.organization;
    adminUser = boot.adminUser;

    const loginRes = await AuthService.login('recruiter@devoc.internal', 'Password123!');
    token = loginRes.accessToken;

    hiringManager = await PeopleService.createPerson(org.id, {
      firstName: 'Sarah',
      lastName: 'Director',
      email: 'sarah.director@devoc.internal',
    });

    stages = await PipelineStageRepository.seedDefaultStages(org.id);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. POST /api/v1/organizations/:orgId/recruitment/positions — create job requisition', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/positions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Senior TypeScript Architect',
        code: 'REQ-ARCH-01',
        employmentType: 'full_time',
        openingsCount: 2,
        hiringManagerId: hiringManager.id,
        minSalary: 120000,
        maxSalary: 160000,
        currency: 'USD',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.openingsCount).toBe(2);

    positionId = res.body.data.id;
  });

  it('2. POST /api/v1/organizations/:orgId/recruitment/positions/:id/open — open position', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/positions/${positionId}/open`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('open');
  });

  it('3. POST /api/v1/organizations/:orgId/recruitment/candidates — register external candidate', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/candidates`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Alex',
        lastName: 'Applicant',
        email: 'alex.applicant@external.org',
        phone: '+15550199',
        source: 'career_page',
        skills: ['TypeScript', 'PostgreSQL', 'Node.js'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.email).toBe('alex.applicant@external.org');
    expect(res.body.data.internalPersonId).toBeNull();

    candidateId = res.body.data.id;
  });

  it('4. POST /api/v1/organizations/:orgId/recruitment/applications — apply for position', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        candidateId,
        positionId,
        notes: 'Applied via company career portal',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('applied');

    applicationId = res.body.data.id;
  });

  it('5. POST /api/v1/organizations/:orgId/recruitment/applications — reject duplicate active application', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        candidateId,
        positionId,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('6. POST .../stages/:stageId/evaluate — record triage notes (reject external M8 evaluation link)', async () => {
    const screeningStage = stages.find((s) => s.stageCode === 'screening');

    // External candidate trying to supply M8 evaluationId must be rejected
    const badRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/stages/${screeningStage.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'passed',
        notes: 'Passed resume screening',
        evaluationId: '00000000-0000-0000-0000-000000000000',
      });

    expect(badRes.status).toBe(400);

    // Valid external candidate triage evaluation (notes only)
    const validRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/stages/${screeningStage.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'passed',
        notes: 'Passed initial screening; strong experience with vitest and postgresql.',
        evaluatorId: hiringManager.id,
      });

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.evaluationId).toBeNull();
  });

  it('7. POST .../applications/:id/trial — schedule external candidate trial audition', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/trial`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        startDate: '2026-09-20',
        endDate: '2026-09-27',
        mentorId: hiringManager.id,
        objectives: 'Implement multi-tenant test suite deliverable.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
  });

  it('8. POST .../applications/:id/trial/complete — conclude trial with deliverables', async () => {
    const startRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/trial/start`)
      .set('Authorization', `Bearer ${token}`);
    expect(startRes.status).toBe(200);

    const completeRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/trial/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliverablesSummary: 'Submitted PR containing complete unit test suite.',
        outcomeNotes: 'Exceeded performance expectations.',
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('completed');
    expect(completeRes.body.data.deliverablesSummary).toBe('Submitted PR containing complete unit test suite.');
  });

  it('9. POST .../applications/:id/offer — issue compensation offer', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/offer`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        baseSalary: 140000,
        currency: 'USD',
        compensationFrequency: 'annual',
        proposedStartDate: '2026-10-15',
        termsConditions: 'Full-time senior software engineer role.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('issued');

    offerId = res.body.data.id;
  });

  it('10. POST .../offers/:offerId/accept — record offer acceptance', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        responseNotes: 'Candidate signed employment offer.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  it('11. POST .../applications/:id/hire — execute single authoritative candidate conversion', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/hire`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        offerId,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.applicationId).toBe(applicationId);
    expect(res.body.data.candidateId).toBe(candidateId);
    expect(res.body.data.personId).toBeDefined();
    expect(res.body.data.employmentId).toBeDefined();
    expect(res.body.data.status).toBe('hired');
    expect(res.body.data.positionHiredCount).toBe(1);
  });

  it('12. Identity Safety — external candidate email collision produces 409 IDENTITY_CONFLICT', async () => {
    // 1. Create a person in the org
    const existingPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Existing',
      lastName: 'User',
      email: 'collision.candidate@external.org',
    });

    // 2. Register external candidate with matching email
    const candRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/candidates`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'External',
        lastName: 'Collision',
        email: 'collision.candidate@external.org',
      });
    const colCandidateId = candRes.body.data.id;

    // 3. Apply, offer, accept
    const appRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId: colCandidateId, positionId });
    const colAppId = appRes.body.data.id;

    const offerRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${colAppId}/offer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ baseSalary: 130000, proposedStartDate: '2026-11-01' });
    const colOfferId = offerRes.body.data.id;

    await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/offers/${colOfferId}/accept`)
      .set('Authorization', `Bearer ${token}`);

    // 4. Attempt hire -> must fail with 409 IDENTITY_CONFLICT
    const hireRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${colAppId}/hire`)
      .set('Authorization', `Bearer ${token}`)
      .send({ offerId: colOfferId });

    expect(hireRes.status).toBe(409);
    expect(hireRes.body.error.code).toBe('IDENTITY_CONFLICT');
  });

  it('13. Headcount Invariant & Position Closure — filling last opening auto-closes position and blocks further hires', async () => {
    // Current hiredCount = 1, openingsCount = 2.
    // Fill final opening
    const candRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/candidates`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Final',
        lastName: 'Hire',
        email: 'final.hire@external.org',
      });
    const finalCandidateId = candRes.body.data.id;

    const appRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId: finalCandidateId, positionId });
    const finalAppId = appRes.body.data.id;

    const offerRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${finalAppId}/offer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ baseSalary: 150000, proposedStartDate: '2026-11-01' });
    const finalOfferId = offerRes.body.data.id;

    await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/offers/${finalOfferId}/accept`)
      .set('Authorization', `Bearer ${token}`);

    const hireRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${finalAppId}/hire`)
      .set('Authorization', `Bearer ${token}`);

    expect(hireRes.status).toBe(200);
    expect(hireRes.body.data.positionStatus).toBe('closed');
    expect(hireRes.body.data.positionHiredCount).toBe(2);

    // Verify position is now closed in DB
    const pos = await PositionRepository.findById(org.id, positionId);
    expect(pos?.status).toBe('closed');

    // Attempting to reopen position must fail
    const reopenRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/positions/${positionId}/open`)
      .set('Authorization', `Bearer ${token}`);
    expect(reopenRes.status).toBe(400);
  });

  it('14. Capability Authorization — org_member is forbidden from recruitment:admin and recruitment:decide endpoints', async () => {
    const db = (await import('../../src/database/index.js')).getDbClient();
    const userMember = await AuthService.createUser({
      email: 'member.user@devoc.internal',
      password: 'Password123!',
      fullName: 'Member User',
    });
    await db.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'org_member', 'active');`,
      [org.id, userMember.id]
    );

    const memberLogin = await AuthService.login('member.user@devoc.internal', 'Password123!');
    const memberToken = memberLogin.accessToken;

    // 1. POST /stages requires recruitment:admin (org_admin only)
    const stageRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/stages`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-organization-id', org.id)
      .send({ stageName: 'Custom Member Stage', stageCode: 'member_stage', stageType: 'assessment', displayOrder: 99 });

    expect(stageRes.status).toBe(403);
    expect(stageRes.body.error.message).toContain('recruitment:admin');

    // 2. POST /applications/:id/hire requires recruitment:decide (org_admin only)
    const hireRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${applicationId}/hire`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-organization-id', org.id);

    expect(hireRes.status).toBe(403);
    expect(hireRes.body.error.message).toContain('recruitment:decide');
  });

  it('15. Paused/Draft Position Hiring Protection — reject hiring against non-open position', async () => {
    // 1. Create and open position
    const posRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/positions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Paused Position Test', code: 'REQ-PAUSE-01', employmentType: 'full_time', openingsCount: 1 });
    const testPosId = posRes.body.data.id;

    await request(app).post(`/api/v1/organizations/${org.id}/recruitment/positions/${testPosId}/open`).set('Authorization', `Bearer ${token}`);

    // 2. Register candidate, apply, offer, accept while open
    const candRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/candidates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Paused', lastName: 'Candidate', email: 'paused.candidate@external.org' });
    const pCandId = candRes.body.data.id;

    const appRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ candidateId: pCandId, positionId: testPosId });
    const pAppId = appRes.body.data.id;

    const offerRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${pAppId}/offer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ baseSalary: 110000, proposedStartDate: '2026-11-01' });
    const pOfferId = offerRes.body.data.id;

    await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/offers/${pOfferId}/accept`)
      .set('Authorization', `Bearer ${token}`);

    // 3. Pause position
    await request(app).post(`/api/v1/organizations/${org.id}/recruitment/positions/${testPosId}/pause`).set('Authorization', `Bearer ${token}`);

    // 4. Attempt hire against paused position -> must be rejected with 400
    const hirePausedRes = await request(app)
      .post(`/api/v1/organizations/${org.id}/recruitment/applications/${pAppId}/hire`)
      .set('Authorization', `Bearer ${token}`);

    expect(hirePausedRes.status).toBe(400);
  });
});
