import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { MetricDefinitionService } from '../../src/modules/analytics/application/metric-definition.service.js';
import { AnalyticsComputationService } from '../../src/modules/analytics/application/computation.service.js';
import { SavedReportService } from '../../src/modules/analytics/application/saved-report.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 11 — Analytics Engine Security & Conformance Tests', () => {
  let app: any;
  let orgA: any;
  let orgB: any;
  let adminTokenA: string;
  let memberTokenA: string;
  let adminTokenB: string;
  let platformToken: string;
  let tokenNoPerson: string;
  let userMember: any;
  let userNoPerson: any;
  let personMember: any;
  let otherPerson: any;
  let buA1: any;
  let buA2: any;
  let teamA1: any;
  let teamA2: any;
  let projA1: any;
  let projA2: any;
  let buB: any;
  let teamB: any;
  let projB: any;
  let metricA: any;
  let metricRole: any;
  let metricBudget: any;
  let reportA: any;
  let reportRestrictedBu: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();
    const db = getDbClient();

    // Bootstrap Org A
    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Security Test Org A',
      slug: 'security-test-org-a',
      adminEmail: 'admin@sec-test-a.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Sec A',
    });
    orgA = bootA.organization;
    const loginAdminA = await AuthService.login('admin@sec-test-a.internal', 'Password123!');
    adminTokenA = loginAdminA.accessToken;

    // Structure in Org A: Business Units
    buA1 = await StructureService.createBusinessUnit(orgA.id, {
      name: 'BU Alpha',
      code: 'BU_ALPHA',
    });
    buA2 = await StructureService.createBusinessUnit(orgA.id, {
      name: 'BU Beta',
      code: 'BU_BETA',
    });

    // Structure in Org A: Department and Teams
    const deptA = await StructureService.createDepartment(orgA.id, {
      name: 'Dept A',
      code: 'DEPT_A',
    });
    teamA1 = await StructureService.createTeam(orgA.id, {
      name: 'Team Alpha',
      code: 'TEAM_ALPHA',
      departmentId: deptA.id,
      businessUnitId: buA1.id,
    });
    teamA2 = await StructureService.createTeam(orgA.id, {
      name: 'Team Beta',
      code: 'TEAM_BETA',
      departmentId: deptA.id,
      businessUnitId: buA2.id,
    });

    // Create a regular member user in Org A
    userMember = await AuthService.createUser({
      email: 'member@sec-test-a.internal',
      password: 'Password123!',
      fullName: 'Member A',
    });
    await db.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'org_member', 'active');`,
      [orgA.id, userMember.id]
    );
    const loginMemberA = await AuthService.login('member@sec-test-a.internal', 'Password123!');
    memberTokenA = loginMemberA.accessToken;

    // Create Person identity for userMember (Person ID != User ID)
    personMember = await PeopleService.createPerson(orgA.id, {
      firstName: 'Member',
      lastName: 'Person',
      email: 'member@sec-test-a.internal',
    });
    await db.query(`UPDATE people SET user_id = $1 WHERE id = $2;`, [userMember.id, personMember.id]);

    // Create an unlinked other Person in Org A
    otherPerson = await PeopleService.createPerson(orgA.id, {
      firstName: 'Other',
      lastName: 'Colleague',
      email: 'other@sec-test-a.internal',
    });

    // Admin person
    const personAdmin = await PeopleService.createPerson(orgA.id, {
      firstName: 'Admin',
      lastName: 'Sec',
      email: 'admin@sec-test-a.internal',
    });

    // Role in Org A
    const roleDev = await PeopleService.createRole(orgA.id, {
      name: 'Developer',
      code: 'ROLE_DEV',
    });

    // Assign personMember to BU Alpha (buA1) and Team Alpha (teamA1) via person_roles
    await db.query(
      `INSERT INTO person_roles (organization_id, person_id, role_id, business_unit_id, team_id, status)
       VALUES ($1, $2, $3, $4, $5, 'active');`,
      [orgA.id, personMember.id, roleDev.id, buA1.id, teamA1.id]
    );

    // Projects in Org A
    const proj1Res = await db.query<any>(
      `INSERT INTO projects (organization_id, name, key, project_type, created_by_person_id)
       VALUES ($1, 'Project Alpha', 'PROJ_ALPHA', 'internal', $2) RETURNING *;`,
      [orgA.id, personAdmin.id]
    );
    projA1 = proj1Res.rows[0];

    const proj2Res = await db.query<any>(
      `INSERT INTO projects (organization_id, name, key, project_type, created_by_person_id)
       VALUES ($1, 'Project Beta', 'PROJ_BETA', 'internal', $2) RETURNING *;`,
      [orgA.id, personAdmin.id]
    );
    projA2 = proj2Res.rows[0];

    // Assign personMember to projA1
    await db.query(
      `INSERT INTO assignments (organization_id, person_id, target_type, target_id, assignment_type, status, start_at)
       VALUES ($1, $2, 'project', $3, 'member', 'active', NOW());`,
      [orgA.id, personMember.id, projA1.id]
    );

    // User without Person identity in Org A
    userNoPerson = await AuthService.createUser({
      email: 'noperson@sec-test-a.internal',
      password: 'Password123!',
      fullName: 'No Person User',
    });
    await db.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'org_member', 'active');`,
      [orgA.id, userNoPerson.id]
    );
    const loginNoPerson = await AuthService.login('noperson@sec-test-a.internal', 'Password123!');
    tokenNoPerson = loginNoPerson.accessToken;

    // Platform admin
    await AuthService.createUser({
      email: 'platform@devoc.internal',
      password: 'Password123!',
      fullName: 'Platform Admin',
      isPlatformAdmin: true,
    });
    const loginPlatform = await AuthService.login('platform@devoc.internal', 'Password123!');
    platformToken = loginPlatform.accessToken;

    // Bootstrap Org B
    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Security Test Org B',
      slug: 'security-test-org-b',
      adminEmail: 'admin@sec-test-b.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Sec B',
    });
    orgB = bootB.organization;
    const loginAdminB = await AuthService.login('admin@sec-test-b.internal', 'Password123!');
    adminTokenB = loginAdminB.accessToken;

    // Org B structure
    buB = await StructureService.createBusinessUnit(orgB.id, {
      name: 'BU Org B',
      code: 'BU_B',
    });
    const deptB = await StructureService.createDepartment(orgB.id, {
      name: 'Dept B',
      code: 'DEPT_B',
    });
    teamB = await StructureService.createTeam(orgB.id, {
      name: 'Team Org B',
      code: 'TEAM_B',
      departmentId: deptB.id,
    });
    const personAdminB = await PeopleService.createPerson(orgB.id, {
      firstName: 'Admin',
      lastName: 'B',
      email: 'admin@sec-test-b.internal',
    });
    const projBRes = await db.query<any>(
      `INSERT INTO projects (organization_id, name, key, project_type, created_by_person_id)
       VALUES ($1, 'Project B', 'PROJ_B', 'internal', $2) RETURNING *;`,
      [orgB.id, personAdminB.id]
    );
    projB = projBRes.rows[0];

    // Create valid metric and public report in Org A
    const metricService = new MetricDefinitionService();
    metricA = await metricService.createMetricDefinition(
      orgA.id,
      {
        name: 'Sec Metric A',
        code: 'SEC_METRIC_A',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
        },
      },
      bootA.adminUser.id
    );

    metricRole = await metricService.createMetricDefinition(
      orgA.id,
      {
        name: 'Sec Metric Role',
        code: 'SEC_METRIC_ROLE',
        domainModule: 'people',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'PERSON_ROLE',
        },
      },
      bootA.adminUser.id
    );

    metricBudget = await metricService.createMetricDefinition(
      orgA.id,
      {
        name: 'Sec Metric Budget',
        code: 'SEC_METRIC_BUDGET',
        domainModule: 'finance',
        metricType: 'SUM',
        calculationSpec: {
          sourceEntity: 'FINANCIAL_BUDGET',
          field: 'budget_amount',
        },
      },
      bootA.adminUser.id
    );

    const reportService = new SavedReportService();
    reportA = await reportService.createReport(
      orgA.id,
      {
        name: 'Sec Report A',
        metricIds: [metricA.id],
        isPublic: true,
      },
      bootA.adminUser.id
    );

    // Create public report restricted to BU Beta (buA2)
    reportRestrictedBu = await reportService.createReport(
      orgA.id,
      {
        name: 'Restricted BU Report',
        metricIds: [metricRole.id],
        filters: { business_unit_id: buA2.id },
        isPublic: true,
      },
      bootA.adminUser.id
    );
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. SQL Injection attempt through metric definition fails safely', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: "Test'; DROP TABLE users; --",
        code: "DROP_CODE'; --",
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
          filter: {
            "status'; DROP TABLE users; --": 'test',
          },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();

    const db = getDbClient();
    const userCheck = await db.query('SELECT COUNT(*) FROM users;');
    expect(parseInt(userCheck.rows[0].count, 10)).toBeGreaterThan(0);
  });

  it('2. Arbitrary table selection is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Attempt Arbitrary Table',
        code: 'ATTEMPT_TABLE',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'pg_shadow',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Unknown or disallowed source entity/);
  });

  it('3. Arbitrary column selection is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Attempt Password Hash Leak',
        code: 'ATTEMPT_PASSWORD_LEAK',
        domainModule: 'people',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'USER',
          field: 'password_hash',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Field 'password_hash' is not allowed/);
  });

  it('4. Unauthorized joins are rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Unauthorized Join Attempt',
        code: 'ATTEMPT_BAD_JOIN',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
          join: {
            targetEntity: 'FINANCIAL_BUDGET',
            onField: 'id',
          },
        },
      });

    expect(res.status).toBe(400);
  });

  it('5. Cross-tenant metric access fails with 404 (no existence leak)', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/metrics/${metricA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  it('6. Cross-tenant saved report execution fails with 404', async () => {
    const res = await request(app)
      .post(`/api/v1/analytics/reports/${reportA.id}/execute`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .set('X-Organization-Id', orgB.id)
      .send({});

    expect(res.status).toBe(404);
  });

  it('7. Unauthorized metric definition creation (org_member without define permission) fails with 403', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/metrics')
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        name: 'Unauthorized Metric Creation',
        code: 'FAIL_METRIC',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/analytics:define/);
  });

  it('8. Public report does NOT bypass tenant boundary (cross-tenant 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/reports/${reportA.id}`)
      .set('Authorization', `Bearer ${adminTokenB}`)
      .set('X-Organization-Id', orgB.id);

    expect(res.status).toBe(404);
  });

  // --- M11 CONFORMANCE: Contextual Authorization Tests ---

  it('9. User cannot access unauthorized Business Unit via header or filter (returns 403)', async () => {
    // Member assigned to BU Alpha (buA1) requests unauthorized BU Beta (buA2) via header
    const resHeader = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Business-Unit-Id', buA2.id)
      .send({});

    expect(resHeader.status).toBe(403);
    expect(resHeader.body.error.code).toBe('FORBIDDEN');
    expect(resHeader.body.error.message).toMatch(/business unit/i);

    // Member requests unauthorized BU Beta via body dimensionFilters
    const resFilter = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { business_unit_id: buA2.id },
      });

    expect(resFilter.status).toBe(403);
    expect(resFilter.body.error.code).toBe('FORBIDDEN');

    // Authorized BU Alpha succeeds
    const resSuccess = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Business-Unit-Id', buA1.id)
      .send({});

    expect(resSuccess.status).toBe(200);
  });

  it('10. User cannot access unauthorized Team via header or filter (returns 403)', async () => {
    // Member assigned to teamA1 requests unauthorized teamA2 via header
    const resHeader = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Team-Id', teamA2.id)
      .send({});

    expect(resHeader.status).toBe(403);
    expect(resHeader.body.error.code).toBe('FORBIDDEN');
    expect(resHeader.body.error.message).toMatch(/team/i);

    // Member requests unauthorized teamA2 via filter
    const resFilter = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { team_id: teamA2.id },
      });

    expect(resFilter.status).toBe(403);

    // Authorized teamA1 succeeds
    const resSuccess = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Team-Id', teamA1.id)
      .send({});

    expect(resSuccess.status).toBe(200);
  });

  it('11. User cannot access unauthorized Project via header or filter (returns 403)', async () => {
    // Member assigned to projA1 requests unauthorized projA2 via header
    const resHeader = await request(app)
      .post(`/api/v1/analytics/metrics/${metricBudget.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Project-Id', projA2.id)
      .send({});

    expect(resHeader.status).toBe(403);
    expect(resHeader.body.error.code).toBe('FORBIDDEN');
    expect(resHeader.body.error.message).toMatch(/project/i);

    // Member requests unauthorized projA2 via filter
    const resFilter = await request(app)
      .post(`/api/v1/analytics/metrics/${metricBudget.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { project_id: projA2.id },
      });

    expect(resFilter.status).toBe(403);

    // Authorized projA1 succeeds
    const resSuccess = await request(app)
      .post(`/api/v1/analytics/metrics/${metricBudget.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Project-Id', projA1.id)
      .send({});

    expect(resSuccess.status).toBe(200);
  });

  it('12. User cannot impersonate another person by supplying person_id (returns 403)', async () => {
    // Impersonation via body dimensionFilters
    const resBody = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { person_id: otherPerson.id },
      });

    expect(resBody.status).toBe(403);
    expect(resBody.body.error.code).toBe('FORBIDDEN');
    expect(resBody.body.error.message).toMatch(/another person/i);

    // Impersonation via header x-person-id
    const resHeader = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('x-person-id', otherPerson.id)
      .send({});

    expect(resHeader.status).toBe(403);
    expect(resHeader.body.error.code).toBe('FORBIDDEN');

    // Querying own person_id succeeds
    const resOwn = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { person_id: personMember.id },
      });

    expect(resOwn.status).toBe(200);
  });

  it('13. User identity is NOT treated as Person identity (User ID != Person ID)', async () => {
    expect(userMember.id).toBeDefined();
    expect(personMember.id).toBeDefined();
    expect(userMember.id).not.toBe(personMember.id);

    // Supplying User ID as person_id is rejected because User ID is not a Person ID
    const resUserId = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { person_id: userMember.id },
      });

    expect(resUserId.status).toBe(403);
    expect(resUserId.body.error.code).toBe('FORBIDDEN');

    // Member with no Person record cannot impersonate or treat User ID as Person ID
    const resNoPerson = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${tokenNoPerson}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { person_id: userNoPerson.id },
      });

    expect(resNoPerson.status).toBe(403);
  });

  it('14. Organization Admin behavior remains correct (full tenant scope and filter access)', async () => {
    // Admin can scope by BU Alpha
    const resBu1 = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Business-Unit-Id', buA1.id)
      .send({});
    expect(resBu1.status).toBe(200);

    // Admin can scope by BU Beta
    const resBu2 = await request(app)
      .post(`/api/v1/analytics/metrics/${metricRole.id}/compute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Business-Unit-Id', buA2.id)
      .send({});
    expect(resBu2.status).toBe(200);

    // Admin can filter by any person in the tenant
    const resPerson = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        dimensionFilters: { person_id: otherPerson.id },
      });
    expect(resPerson.status).toBe(200);

    // Admin without headers has full tenant scope
    const resAll = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({});
    expect(resAll.status).toBe(200);
  });

  it('15. Platform Admin behavior remains correct across tenants', async () => {
    const resOrgA = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${platformToken}`)
      .set('X-Organization-Id', orgA.id)
      .send({});
    expect(resOrgA.status).toBe(200);
  });

  it('16. Public saved reports CANNOT bypass contextual authorization', async () => {
    // reportRestrictedBu is a public report that targets BU Beta (buA2).
    // memberTokenA is only authorized for BU Alpha (buA1).
    // Executing the report must be rejected with 403 Forbidden!
    const resMember = await request(app)
      .post(`/api/v1/analytics/reports/${reportRestrictedBu.id}/execute`)
      .set('Authorization', `Bearer ${memberTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({});

    expect(resMember.status).toBe(403);
    expect(resMember.body.error.code).toBe('FORBIDDEN');
    expect(resMember.body.error.message).toMatch(/business unit/i);

    // Admin can execute the report
    const resAdmin = await request(app)
      .post(`/api/v1/analytics/reports/${reportRestrictedBu.id}/execute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .send({});

    expect(resAdmin.status).toBe(200);
  });

  it('17. Cross-tenant context headers return 404 Not Found (no existence leak)', async () => {
    // Cross-tenant BU
    const resBu = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Business-Unit-Id', buB.id)
      .send({});
    expect(resBu.status).toBe(404);

    // Cross-tenant Team
    const resTeam = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Team-Id', teamB.id)
      .send({});
    expect(resTeam.status).toBe(404);

    // Cross-tenant Project
    const resProj = await request(app)
      .post(`/api/v1/analytics/metrics/${metricA.id}/compute`)
      .set('Authorization', `Bearer ${adminTokenA}`)
      .set('X-Organization-Id', orgA.id)
      .set('X-Project-Id', projB.id)
      .send({});
    expect(resProj.status).toBe(404);
  });

  // --- M11 CONFORMANCE: Snapshot Immutability & Retirement Tests ---

  it('18. Historical snapshots are preserved on metric retirement and protected from cascade deletion', async () => {
    const metricService = new MetricDefinitionService();
    const computationService = new AnalyticsComputationService();
    const db = getDbClient();

    // 1. Create a metric definition
    const snapMetric = await metricService.createMetricDefinition(
      orgA.id,
      {
        name: 'Snapshot Preservation Metric',
        code: 'SNAP_PRESERVE_METRIC',
        domainModule: 'work',
        metricType: 'COUNT',
        calculationSpec: {
          sourceEntity: 'WORK_RECORD',
        },
      },
      userMember.id
    );

    // 2. Compute and persist a snapshot
    await computationService.computeMetric(
      orgA.id,
      snapMetric.id,
      {
        periodType: 'month',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        persistSnapshot: true,
      }
    );

    // Verify snapshot exists in analytics_metric_results
    const snapshotsBefore = await db.query<any>(
      `SELECT * FROM analytics_metric_results WHERE metric_definition_id = $1;`,
      [snapMetric.id]
    );
    expect(snapshotsBefore.rows.length).toBe(1);

    // 3. Attempt destructive raw deletion of metric definition with historical snapshots:
    // MUST FAIL with foreign key violation (ON DELETE RESTRICT)
    let deleteFailed = false;
    try {
      await db.query(`DELETE FROM analytics_metric_definitions WHERE id = $1;`, [snapMetric.id]);
    } catch (err: any) {
      deleteFailed = true;
      expect(err.message).toMatch(/violates foreign key constraint/i);
    }
    expect(deleteFailed).toBe(true);

    // 4. Retire metric definition gracefully (is_active = false)
    const retired = await metricService.updateMetricDefinition(
      orgA.id,
      snapMetric.id,
      { isActive: false },
      userMember.id
    );
    expect(retired.isActive).toBe(false);

    // 5. Verify historical snapshots remain available and intact
    const snapshotsAfter = await db.query<any>(
      `SELECT * FROM analytics_metric_results WHERE metric_definition_id = $1;`,
      [snapMetric.id]
    );
    expect(snapshotsAfter.rows.length).toBe(1);
    expect(snapshotsAfter.rows[0].id).toBe(snapshotsBefore.rows[0].id);
  });
});
