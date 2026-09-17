import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { PipelineStageRepository } from '../../src/modules/recruitment/infrastructure/pipeline-stage.repository.js';
import { PositionService } from '../../src/modules/recruitment/application/position.service.js';
import { CandidateService } from '../../src/modules/recruitment/application/candidate.service.js';

describe('Milestone 13 — Recruitment Engine Multi-Tenant Isolation Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let tokenA: string;
  let tokenB: string;
  let positionA: any;
  let candidateA: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // Bootstrap Org A
    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Tenant A Org',
      slug: 'tenant-a-org',
      adminEmail: 'admin@tenant-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin A',
    });
    orgA = bootA.organization;
    const loginA = await AuthService.login('admin@tenant-a.internal', 'Password123!');
    tokenA = loginA.accessToken;
    await PipelineStageRepository.seedDefaultStages(orgA.id);

    // Bootstrap Org B
    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Tenant B Org',
      slug: 'tenant-b-org',
      adminEmail: 'admin@tenant-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin B',
    });
    orgB = bootB.organization;
    const loginB = await AuthService.login('admin@tenant-b.internal', 'Password123!');
    tokenB = loginB.accessToken;
    await PipelineStageRepository.seedDefaultStages(orgB.id);

    // Create Position & Candidate in Org A
    positionA = await PositionService.createPosition({
      organizationId: orgA.id,
      title: 'Secret Lead Eng',
      code: 'REQ-A-01',
      openingsCount: 1,
    });

    candidateA = await CandidateService.createCandidate({
      organizationId: orgA.id,
      firstName: 'Confidential',
      lastName: 'Candidate',
      email: 'confidential@tenant-a.internal',
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. GET /api/v1/organizations/:orgId/recruitment/positions/:id — Org B user cannot access Org A position (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/recruitment/positions/${positionA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  it('2. GET /api/v1/organizations/:orgId/recruitment/candidates/:id — Org B user cannot access Org A candidate (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/recruitment/candidates/${candidateA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  it('3. Cross-Tenant Header Impersonation — Header Org B with Org A token is rejected with 403', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB.id}/recruitment/positions/${positionA.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
  });

  it('4. POST .../positions — Referencing Org A Business Unit in Org B position creation is rejected (404)', async () => {
    const buA = await StructureService.createBusinessUnit(orgA.id, {
      name: 'Tenant A Engineering',
      code: 'BU-ENG-A',
    });

    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/recruitment/positions`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        title: 'Cross-Tenant Position',
        code: 'REQ-B-CROSS',
        businessUnitId: buA.id,
      });

    expect(res.status).toBe(404);
  });

  it('5. POST .../applications — Applying candidate from Org A to position in Org B is rejected (404)', async () => {
    const posB = await PositionService.createPosition({
      organizationId: orgB.id,
      title: 'Org B Position',
      code: 'REQ-B-01',
      openingsCount: 1,
    });
    await PositionService.transitionStatus(orgB.id, posB.id, 'open');

    const res = await request(app)
      .post(`/api/v1/organizations/${orgB.id}/recruitment/applications`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        candidateId: candidateA.id,
        positionId: posB.id,
      });

    expect(res.status).toBe(404);
  });
});
