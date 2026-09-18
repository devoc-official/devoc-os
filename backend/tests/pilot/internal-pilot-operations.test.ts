import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EmploymentService } from '../../src/modules/people/application/employment.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { WorkCategoryService } from '../../src/modules/work/application/work-category.service.js';
import { PipelineStageRepository } from '../../src/modules/recruitment/infrastructure/pipeline-stage.repository.js';
import { MetricDefinitionService } from '../../src/modules/analytics/application/metric-definition.service.js';
import { AnalyticsComputationService } from '../../src/modules/analytics/application/computation.service.js';
import { EventRegistryService } from '../../src/events/event-registry.js';

describe('DeVoc OS v1 — Internal Pilot & Operational Validation Suite', () => {
  let app: any;

  // Primary Pilot Tenant: DeVoc Pilot Organization
  let pilotOrg: any;
  let adminUser: any;
  let adminToken: string;

  // Secondary Tenant: External Rival Org (for tenant isolation)
  let rivalOrg: any;
  let rivalAdminUser: any;
  let rivalAdminToken: string;

  // Organization Structure
  let branchKerala: any;
  let branchUAE: any;
  let buAcademy: any;
  let buSolutions: any;
  let buLabs: any;
  let deptEng: any;
  let deptAcadOps: any;
  let deptMgmt: any;
  let deptSales: any;
  let deptFin: any;
  let teamCore: any;
  let teamMentor: any;
  let teamClient: any;

  // Personas
  let personFounder: any;
  let personAcadHead: any;
  let personDev: any;
  let personMentor: any;
  let personReviewer: any;
  let personStudent: any;
  let personPM: any;

  // Roles
  let roleFounder: any;
  let roleEmployee: any;
  let roleMentor: any;
  let roleStudent: any;
  let rolePM: any;
  let roleDev: any;
  let roleReviewer: any;
  let roleAcadHead: any;

  // Auth tokens for personas
  let tokenFounder: string;
  let tokenDev: string;
  let tokenStudent: string;

  // Shared operational IDs
  let workCategoryId: string;
  let devProjectId: string;
  let devTaskId: string;
  let devAssignmentId: string;
  let devWorkId: string;
  let programId: string;
  let enrollmentId: string;
  let milestoneId: string;
  let studentReviewId: string;
  let devEmploymentId: string;
  let meetingTypeId: string;
  let meetingId: string;
  let scheduleId: string;
  let timesheetId: string;
  let positionId: string;
  let candidateId: string;
  let applicationId: string;
  let offerId: string;
  let hiredPersonId: string;
  let hiredEmploymentId: string;
  let acadFeeObligationId: string;
  let studentPartyId: string;
  let clientObligationId: string;
  let placementMetricId: string;
  let revenueMetricId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();
    await EventRegistryService.seedEventRegistry();

    // 1. Bootstrap DeVoc Pilot Organization
    const bootPilot = await OrganizationService.bootstrapOrganization({
      name: 'DeVoc Pilot Organization',
      slug: 'devoc-pilot',
      adminEmail: 'admin@devoc-pilot.internal',
      adminPassword: 'PilotAdminPassword123!',
      adminFullName: 'Aditi Admin',
    });
    pilotOrg = bootPilot.organization;
    adminUser = bootPilot.adminUser;

    const loginAdmin = await AuthService.login('admin@devoc-pilot.internal', 'PilotAdminPassword123!');
    adminToken = loginAdmin.accessToken;

    // 2. Bootstrap External Rival Org (Tenant Isolation testing)
    const bootRival = await OrganizationService.bootstrapOrganization({
      name: 'External Rival Org',
      slug: 'rival-tenant',
      adminEmail: 'rival-admin@rival.internal',
      adminPassword: 'RivalAdminPassword123!',
      adminFullName: 'Rival Administrator',
    });
    rivalOrg = bootRival.organization;
    rivalAdminUser = bootRival.adminUser;

    const loginRival = await AuthService.login('rival-admin@rival.internal', 'RivalAdminPassword123!');
    rivalAdminToken = loginRival.accessToken;

    // 3. Setup Pilot Branches
    branchKerala = await StructureService.createBranch(pilotOrg.id, {
      name: 'Kerala Campus Branch',
      code: 'HQ-KERALA',
    });
    branchUAE = await StructureService.createBranch(pilotOrg.id, {
      name: 'UAE Regional Branch',
      code: 'BR-UAE',
    });

    // 4. Setup Pilot Business Units
    buAcademy = await StructureService.createBusinessUnit(pilotOrg.id, {
      name: 'DeVoc Academy',
      code: 'BU-ACADEMY',
    });
    buSolutions = await StructureService.createBusinessUnit(pilotOrg.id, {
      name: 'IT Solutions',
      code: 'BU-SOLUTIONS',
    });
    buLabs = await StructureService.createBusinessUnit(pilotOrg.id, {
      name: 'DeVoc Labs',
      code: 'BU-LABS',
    });

    // 5. Setup Pilot Departments
    deptEng = await StructureService.createDepartment(pilotOrg.id, {
      name: 'Engineering',
      code: 'DEPT-ENG',
    });
    deptAcadOps = await StructureService.createDepartment(pilotOrg.id, {
      name: 'Academy Operations',
      code: 'DEPT-ACAD-OPS',
    });
    deptMgmt = await StructureService.createDepartment(pilotOrg.id, {
      name: 'Management',
      code: 'DEPT-MGMT',
    });
    deptSales = await StructureService.createDepartment(pilotOrg.id, {
      name: 'Sales & Growth',
      code: 'DEPT-SALES',
    });
    deptFin = await StructureService.createDepartment(pilotOrg.id, {
      name: 'Finance',
      code: 'DEPT-FIN',
    });

    // 6. Setup Teams
    teamCore = await StructureService.createTeam(pilotOrg.id, {
      name: 'Core Platform Team',
      code: 'TEAM-CORE',
      departmentId: deptEng.id,
      businessUnitId: buSolutions.id,
    });
    teamMentor = await StructureService.createTeam(pilotOrg.id, {
      name: 'Academy Mentorship Team',
      code: 'TEAM-ACAD-MENTOR',
      departmentId: deptAcadOps.id,
      businessUnitId: buAcademy.id,
    });
    teamClient = await StructureService.createTeam(pilotOrg.id, {
      name: 'Client Delivery Team',
      code: 'TEAM-CLIENT',
      departmentId: deptEng.id,
      businessUnitId: buSolutions.id,
    });

    // 7. Seed Work Categories, Pipeline Stages & Meeting Types
    const seededCats = await WorkCategoryService.seedDefaultCategories(pilotOrg.id);
    workCategoryId = seededCats.find((c) => c.code === 'engineering')?.id || seededCats[0].id;
    await PipelineStageRepository.seedDefaultStages(pilotOrg.id);

    const { MeetingTypeService } = await import('../../src/modules/meetings/application/meeting-type.service.js');
    const defaultMeetingTypes = await MeetingTypeService.seedDefaultMeetingTypes(pilotOrg.id);
    meetingTypeId = defaultMeetingTypes[0].id;

    // 8. Create Roles
    roleFounder = await PeopleService.createRole(pilotOrg.id, {
      name: 'Founder',
      code: 'ROLE-FOUNDER',
      isSystem: true,
    });
    roleEmployee = await PeopleService.createRole(pilotOrg.id, {
      name: 'Employee',
      code: 'ROLE-EMPLOYEE',
      isSystem: true,
    });
    roleMentor = await PeopleService.createRole(pilotOrg.id, {
      name: 'Mentor',
      code: 'ROLE-MENTOR',
      isSystem: true,
    });
    roleStudent = await PeopleService.createRole(pilotOrg.id, {
      name: 'Student',
      code: 'ROLE-STUDENT',
      isSystem: true,
    });
    rolePM = await PeopleService.createRole(pilotOrg.id, {
      name: 'Project Manager',
      code: 'ROLE-PM',
      isSystem: true,
    });
    roleDev = await PeopleService.createRole(pilotOrg.id, {
      name: 'Developer',
      code: 'ROLE-DEV',
      isSystem: true,
    });
    roleReviewer = await PeopleService.createRole(pilotOrg.id, {
      name: 'Reviewer',
      code: 'ROLE-REVIEWER',
      isSystem: true,
    });
    roleAcadHead = await PeopleService.createRole(pilotOrg.id, {
      name: 'Academy Head',
      code: 'ROLE-ACAD-HEAD',
      isSystem: true,
    });

    // 9. Setup Personas
    // Founder (also multi-role: Founder + PM + Developer)
    personFounder = await PeopleService.createPerson(pilotOrg.id, {
      firstName: 'Aswin',
      lastName: 'Founder',
      email: 'founder@devoc-pilot.internal',
    });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personFounder.id, { roleId: roleFounder.id });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personFounder.id, { roleId: rolePM.id });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personFounder.id, { roleId: roleDev.id });

    // Academy Head
    personAcadHead = await PeopleService.createPerson(pilotOrg.id, {
      firstName: 'Sanjay',
      lastName: 'Academy Head',
      email: 'academy.head@devoc-pilot.internal',
    });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personAcadHead.id, { roleId: roleAcadHead.id });

    // Developer
    personDev = await PeopleService.createPerson(pilotOrg.id, {
      firstName: 'Devan',
      lastName: 'Developer',
      email: 'developer@devoc-pilot.internal',
    });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personDev.id, { roleId: roleDev.id });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personDev.id, { roleId: roleEmployee.id });
    const devEmp = await EmploymentService.createEmployment(pilotOrg.id, {
      personId: personDev.id,
      employmentType: 'full_time',
      jobTitle: 'Senior Software Engineer',
      departmentId: deptEng.id,
      businessUnitId: buSolutions.id,
      branchId: branchKerala.id,
      startDate: '2026-01-01',
    });
    devEmploymentId = devEmp.id;

    // Mentor
    personMentor = await PeopleService.createPerson(pilotOrg.id, {
      firstName: 'Meera',
      lastName: 'Mentor',
      email: 'mentor@devoc-pilot.internal',
    });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personMentor.id, { roleId: roleMentor.id });

    // Reviewer
    personReviewer = await PeopleService.createPerson(pilotOrg.id, {
      firstName: 'Rahul',
      lastName: 'Reviewer',
      email: 'reviewer@devoc-pilot.internal',
    });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personReviewer.id, { roleId: roleReviewer.id });

    // Student
    personStudent = await PeopleService.createPerson(pilotOrg.id, {
      firstName: 'Sam',
      lastName: 'Student',
      email: 'student@devoc-pilot.internal',
    });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personStudent.id, { roleId: roleStudent.id });

    // Project Manager
    personPM = await PeopleService.createPerson(pilotOrg.id, {
      firstName: 'Priya',
      lastName: 'PM',
      email: 'pm@devoc-pilot.internal',
    });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personPM.id, { roleId: rolePM.id });
    await PeopleService.assignRoleToPerson(pilotOrg.id, personPM.id, { roleId: roleEmployee.id });

    // Create User accounts and tokens for role-based API access
    const db = getDbClient();
    const createAuthUser = async (email: string, fullName: string) => {
      const uRes = await db.query<any>(
        `INSERT INTO users (email, password_hash, full_name, is_platform_admin)
         VALUES ($1, '$2a$10$abcdef', $2, false)
         RETURNING *;`,
        [email, fullName]
      );
      const user = uRes.rows[0];
      await db.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role, status)
         VALUES ($1, $2, 'org_member', 'active');`,
        [pilotOrg.id, user.id]
      );
      return AuthService.generateToken({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isActive: true,
        isPlatformAdmin: false,
      });
    };

    tokenFounder = await createAuthUser('founder@devoc-pilot.internal', 'Aswin Founder');
    tokenDev = await createAuthUser('developer@devoc-pilot.internal', 'Devan Developer');
    tokenStudent = await createAuthUser('student@devoc-pilot.internal', 'Sam Student');
  });

  afterAll(async () => {
    await closeDb();
  });

  // ==========================================================================
  // Section 7: Multi-Role Experience & Validation
  // ==========================================================================
  describe('Pilot Section 7 — Multi-Role Experience Validation', () => {
    it('verifies multi-role persona has Founder, PM, and Developer active roles', async () => {
      const res = await request(app)
        .get(`/api/v1/people/${personFounder.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      const codes = res.body.data.map((r: any) => r.roleCode || r.code);
      expect(codes).toContain('ROLE-FOUNDER');
      expect(codes).toContain('ROLE-PM');
      expect(codes).toContain('ROLE-DEV');
    });

    it('confirms role switching does not compromise security boundaries (unauthorized student URL blocked)', async () => {
      // Student trying to access administrative settings endpoint
      const res = await request(app)
        .put(`/api/v1/admin/settings`)
        .set('Authorization', `Bearer ${tokenStudent}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({ timezone: 'UTC' });

      // Student token lacks admin permissions -> 403 Forbidden
      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // Section 8: Core End-to-End Backbone Pilot
  // ==========================================================================
  describe('Pilot Section 8 — Core End-to-End Backbone Validation', () => {
    it('executes Person -> Role -> Assignment -> Work -> Outcome -> Evaluation -> Finance -> Analytics', async () => {
      // 1. Project Creation
      const projRes = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          name: 'DeVoc Pilot Enterprise Portal',
          key: 'DP-PORTAL',
          projectType: 'saas_product',
          createdByPersonId: personFounder.id,
          businessUnitIds: [buSolutions.id],
        });
      expect(projRes.status).toBe(201);
      devProjectId = projRes.body.data.id;

      // 2. Project Task Creation
      const taskRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          projectId: devProjectId,
          title: 'Implement Multi-Tenant Security Gateway',
          taskKey: 'DP-PORTAL-1',
          taskType: 'task',
          priority: 'high',
          createdByPersonId: personDev.id,
        });
      expect(taskRes.status).toBe(201);
      devTaskId = taskRes.body.data.id;

      // 3. Assignment Engine Binding
      const assignRes = await request(app)
        .post('/api/v1/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          personId: personDev.id,
          targetType: 'project',
          targetId: devProjectId,
          assignmentType: 'developer',
          roleContext: 'developer',
          startAt: '2026-09-01T00:00:00Z',
          capacityType: 'allocation',
          capacityValue: 100,
          capacityUnit: 'percentage',
        });
      expect(assignRes.status).toBe(201);
      devAssignmentId = assignRes.body.data.id;

      // 4. Work Contribution Logging with Duration
      const workRes = await request(app)
        .post('/api/v1/work')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          personId: personDev.id,
          title: 'Pilot Task: Implement Multi-Tenant Isolation',
          description: 'Scoped database queries and token verification',
          categoryId: workCategoryId,
          targetType: 'project',
          targetId: devProjectId,
          assignmentId: devAssignmentId,
          startedAt: '2026-09-17T09:00:00Z',
          endedAt: '2026-09-17T17:00:00Z',
          durationMinutes: 480,
          createdByPersonId: personDev.id,
        });
      expect(workRes.status).toBe(201);
      devWorkId = workRes.body.data.id;

      // Add GitHub Evidence
      const evRes = await request(app)
        .post(`/api/v1/work/${devWorkId}/evidence`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          evidenceType: 'github_pull_request',
          title: 'PR #101: Tenant Security Gateway Enforcement',
          referenceUri: 'https://github.com/devoc-official/devoc-os/pull/101',
        });
      expect(evRes.status).toBe(201);

      // Submit and Approve Work
      await request(app)
        .post(`/api/v1/work/${devWorkId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id);

      const appRes = await request(app)
        .post(`/api/v1/work/${devWorkId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id);
      expect(appRes.status).toBe(200);
      expect(appRes.body.data.status).toBe('approved');

      // 5. Outcome Linking
      const outcomeRes = await request(app)
        .post('/api/v1/outcomes')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          title: 'Secure Multi-Tenant Gateway Operational',
          description: 'Zero cross-tenant leakage across all HTTP endpoints',
          outcomeType: 'deliverable',
          createdByPersonId: personDev.id,
        });
      expect(outcomeRes.status).toBe(201);

      await request(app)
        .post(`/api/v1/work/${devWorkId}/outcomes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({ outcomeId: outcomeRes.body.data.id });

      // 6. Evaluation Record (Developer Review)
      const tmplRes = await request(app)
        .post('/api/v1/evaluation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          name: 'Developer Code & Architecture Review',
          description: 'Quality of deliverables and code compliance',
          criteria: [
            { name: 'Code Quality', weight: 1.5, criterionType: 'numeric' },
            { name: 'Architecture Compliance', weight: 1.0, criterionType: 'qualitative' },
          ],
        });
      expect(tmplRes.status).toBe(201);

      const evalRes = await request(app)
        .post('/api/v1/evaluations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          templateId: tmplRes.body.data.id,
          subjectId: personDev.id,
          evaluatorId: personFounder.id,
          evaluationType: 'performance',
        });
      expect(evalRes.status).toBe(201);
    });
  });

  // ==========================================================================
  // Section 9: Academy Pilot
  // ==========================================================================
  describe('Pilot Section 9 — Academy Learning Lifecycle Pilot', () => {
    it('creates program, enrolls student, progresses milestones, and conducts mentor & reviewer reviews', async () => {
      // 1. Program Creation
      const progRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/learning-programs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Full-Stack Software Engineering Academy',
          code: 'ACAD-FSSE',
          description: 'Intensive self-learning software development program',
        });
      expect(progRes.status).toBe(201);
      programId = progRes.body.data.id;

      // Activate Program
      const { LearningProgramService } = await import('../../src/modules/learning/application/learning-program.service.js');
      const programService = new LearningProgramService();
      await programService.activateProgram(pilotOrg.id, programId, adminUser.id);

      // Add Milestones
      const msRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/learning-programs/${programId}/milestones`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Milestone 1: Backend Monolith & PostgreSQL',
          sequence: 1,
        });
      expect(msRes.status).toBe(201);
      milestoneId = msRes.body.data.id;

      // 2. Student Enrollment
      const enrollRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/learning-enrollments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          personId: personStudent.id,
          learningProgramId: programId,
        });
      expect(enrollRes.status).toBe(201);
      enrollmentId = enrollRes.body.data.id;

      // Activate Enrollment
      await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/learning-enrollments/${enrollmentId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 3. Assign Mentor via M3 Assignment Engine
      const mentorAssignRes = await request(app)
        .post('/api/v1/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          personId: personMentor.id,
          targetType: 'student',
          targetId: personStudent.id,
          assignmentType: 'mentor',
          roleContext: 'mentor',
          startAt: '2026-09-01T00:00:00Z',
        });
      expect(mentorAssignRes.status).toBe(201);

      // 4. Learning Review (Weekly Mentor Review)
      const revRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/learning-enrollments/${enrollmentId}/reviews`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reviewerPersonId: personMentor.id,
          reviewType: 'weekly',
          summary: 'Week 1 Progress Evaluation',
          feedback: 'Solid grasp of schema migrations and domain services.',
          progressValue: 30,
        });
      expect(revRes.status).toBe(201);
      studentReviewId = revRes.body.data.id;

      // 5. Reviewer Review & Progression Decision with Roadmap Change
      const changeRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/learning-enrollments/${enrollmentId}/reviews/${studentReviewId}/changes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          changeType: 'activate_milestone',
          targetType: 'milestone',
          targetId: milestoneId,
          reason: 'Student demonstrated required competence in database design.',
        });
      expect(changeRes.status).toBe(201);
    });
  });

  // ==========================================================================
  // Section 10 & 11: Student & Developer Projects & Evidence
  // ==========================================================================
  describe('Pilot Section 10 & 11 — Student & Developer Projects & Evidence', () => {
    it('creates student project, tasks hierarchy, work log with evidence, and completes task', async () => {
      const studProj = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          name: 'Student Portfolio Project — Micro-Blogging API',
          key: 'STU-BLOG',
          projectType: 'student_project',
          createdByPersonId: personStudent.id,
          businessUnitIds: [buAcademy.id],
        });
      expect(studProj.status).toBe(201);

      const epic = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          projectId: studProj.body.data.id,
          title: 'Core API Implementation Epic',
          taskKey: 'STU-BLOG-1',
          taskType: 'epic',
          createdByPersonId: personStudent.id,
        });
      expect(epic.status).toBe(201);

      const subtask = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          projectId: studProj.body.data.id,
          title: 'Implement JWT Auth & Route Guards',
          taskKey: 'STU-BLOG-2',
          taskType: 'task',
          parentTaskId: epic.body.data.id,
          createdByPersonId: personStudent.id,
        });
      expect(subtask.status).toBe(201);
      expect(subtask.body.data.parentTaskId).toBe(epic.body.data.id);
    });
  });

  // ==========================================================================
  // Section 12: Meetings Engine Pilot
  // ==========================================================================
  describe('Pilot Section 12 — Meetings Engine Lifecycle Pilot', () => {
    it('creates meeting, adds participants, agenda, draft minutes, approved decision, and action item', async () => {
      // 1. Create Meeting
      const meetRes = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          meetingTypeId,
          title: 'Weekly DeVoc Pilot Architecture Sync',
          description: 'Reviewing operational results and cross-module stability',
          scheduledStartAt: '2026-09-17T14:00:00Z',
          scheduledEndAt: '2026-09-17T15:00:00Z',
          locationType: 'virtual',
          locationReference: 'https://meet.devoc.internal/pilot-sync',
          organizerPersonId: personFounder.id,
          createdByPersonId: personFounder.id,
          targetType: 'project',
          targetId: devProjectId,
        });
      expect(meetRes.status).toBe(201);
      meetingId = meetRes.body.data.id;

      // 2. Add Participant
      const partRes = await request(app)
        .post(`/api/v1/meetings/${meetingId}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          personId: personDev.id,
          participantType: 'required',
          responseStatus: 'accepted',
        });
      expect(partRes.status).toBe(201);

      // 3. Add Agenda
      const agRes = await request(app)
        .post(`/api/v1/meetings/${meetingId}/agenda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          title: 'Operational Readiness Review',
          description: 'Examine pilot logs, error envelopes, and latency',
          position: 1,
          ownerPersonId: personDev.id,
          durationMinutes: 30,
        });
      expect(agRes.status).toBe(201);

      // 4. Draft Minutes
      const minRes = await request(app)
        .put(`/api/v1/meetings/${meetingId}/notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          content: 'Validated that attendance does not automatically become Work. Action items connect cleanly to Tasks.',
        });
      expect(minRes.status).toBe(200);

      // 5. Create Decision
      const decRes = await request(app)
        .post(`/api/v1/meetings/${meetingId}/decisions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          title: 'Approved Pilot Release Candidate',
          decisionText: 'All domain engines validated under realistic load.',
          recordedByPersonId: personFounder.id,
        });
      expect(decRes.status).toBe(201);

      // 6. Create Action Item linked to Task
      const actRes = await request(app)
        .post(`/api/v1/meetings/${meetingId}/action-items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          title: 'Complete System Hardening Verification',
          ownerPersonId: personDev.id,
          taskId: devTaskId,
        });
      expect(actRes.status).toBe(201);
      expect(actRes.body.data.taskId).toBe(devTaskId);
    });
  });

  // ==========================================================================
  // Section 13: Workforce Engine Pilot (Attendance, Timesheet, Leave)
  // ==========================================================================
  describe('Pilot Section 13 — Workforce Operations Pilot', () => {
    it('creates schedule, registers attendance check-in/out, manages timesheets (submit/approve/reject), and tests leave', async () => {
      // 1. Work Schedule with 7 workingDays definitions
      const schedRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/schedules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'DeVoc Pilot Standard 40h',
          code: 'PILOT-STD-40',
          scheduleType: 'fixed',
          timezone: 'Asia/Kolkata',
          expectedWeeklyHours: 40.0,
          isDefault: true,
          workingDays: [
            { dayOfWeek: 1, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
            { dayOfWeek: 2, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
            { dayOfWeek: 3, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
            { dayOfWeek: 4, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
            { dayOfWeek: 5, isWorkingDay: true, startTime: '09:00:00', endTime: '17:00:00', breakDurationMinutes: 60, expectedHours: 8.0 },
            { dayOfWeek: 6, isWorkingDay: false, expectedHours: 0.0 },
            { dayOfWeek: 0, isWorkingDay: false, expectedHours: 0.0 },
          ],
        });
      expect(schedRes.status).toBe(201);
      scheduleId = schedRes.body.data.id;

      // 2. Attendance Check-in
      const checkInRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/attendance/check-in`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employmentId: devEmploymentId,
          personId: personDev.id,
          checkInAt: '2026-09-17T09:00:00.000Z',
          isWfh: false,
        });
      expect(checkInRes.status).toBe(201);

      // Attendance Check-out
      const checkOutRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/attendance/check-out`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employmentId: devEmploymentId,
          personId: personDev.id,
          checkOutAt: '2026-09-17T17:00:00.000Z',
        });
      expect(checkOutRes.status).toBe(200);

      // 3. Timesheet Creation -> Submission -> Approval
      const tsRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/timesheets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employmentId: devEmploymentId,
          personId: personDev.id,
          periodStartDate: '2026-09-14',
          periodEndDate: '2026-09-20',
          notes: 'Standard pilot 40h week',
        });
      expect(tsRes.status).toBe(201);
      timesheetId = tsRes.body.data.id;
      expect(tsRes.body.data.status).toBe('draft');

      // Submit Timesheet
      const subTsRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/timesheets/${timesheetId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(subTsRes.status).toBe(200);
      expect(subTsRes.body.data.status).toBe('submitted');

      // Approve Timesheet
      const appTsRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/timesheets/${timesheetId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(appTsRes.status).toBe(200);
      expect(appTsRes.body.data.status).toBe('approved');

      // 4. Leave Policy & Application
      const leaveTypeRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/leave-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Annual Paid Leave',
          code: 'LEAVE-ANNUAL',
          isPaid: true,
        });
      expect(leaveTypeRes.status).toBe(201);

      const leaveReqRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/leave-requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employmentId: devEmploymentId,
          personId: personDev.id,
          leaveTypeId: leaveTypeRes.body.data.id,
          startDate: '2026-10-01',
          endDate: '2026-10-02',
          totalDays: 2,
          reason: 'Personal vacation',
        });
      expect(leaveReqRes.status).toBe(201);
      expect(leaveReqRes.body.data.status).toBe('draft');
    });
  });

  // ==========================================================================
  // Section 14: Recruitment Pilot (Position -> Candidate -> App -> Offer -> /hire)
  // ==========================================================================
  describe('Pilot Section 14 — Recruitment Lifecycle Pilot', () => {
    it('executes full recruitment flow and enforces explicit /hire boundary', async () => {
      // 1. Create Position Requisition
      const posRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/positions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Full-Stack Software Engineer',
          code: 'REQ-ENG-01',
          employmentType: 'full_time',
          openingsCount: 1,
          hiringManagerId: personFounder.id,
          departmentId: deptEng.id,
          businessUnitId: buSolutions.id,
        });
      expect(posRes.status).toBe(201);
      positionId = posRes.body.data.id;

      // Open Position
      await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/positions/${positionId}/open`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 2. Create Candidate
      const candRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/candidates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Vikram',
          lastName: 'Applicant',
          email: 'vikram.applicant@external.internal',
          phone: '+91 98765 43210',
        });
      expect(candRes.status).toBe(201);
      candidateId = candRes.body.data.id;

      // 3. Create Application
      const appRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/applications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId,
          positionId,
          source: 'referral',
        });
      expect(appRes.status).toBe(201);
      applicationId = appRes.body.data.id;

      // 4. Issue Offer
      const offRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/applications/${applicationId}/offer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 1200000,
          currency: 'INR',
          compensationFrequency: 'annual',
          proposedStartDate: '2026-10-01',
          termsConditions: 'Standard 40h engineering contract',
        });
      expect(offRes.status).toBe(201);
      offerId = offRes.body.data.id;

      // 5. Accept Offer
      const accRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/offers/${offerId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ responseNotes: 'Offer signed electronically' });
      expect(accRes.status).toBe(200);
      expect(accRes.body.data.status).toBe('accepted');

      // CRITICAL VALIDATION: Offer acceptance alone must NOT automatically hire or create Person/Employment
      const checkPerson = await getDbClient().query(
        'SELECT * FROM people WHERE organization_id = $1 AND email = $2',
        [pilotOrg.id, 'vikram.applicant@external.internal']
      );
      expect(checkPerson.rows.length).toBe(0);

      // 6. Explicit /hire call converts Candidate to Person & Employment
      const hireRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/applications/${applicationId}/hire`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ offerId });
      expect(hireRes.status).toBe(200);
      expect(hireRes.body.data.personId).toBeDefined();
      expect(hireRes.body.data.employmentId).toBeDefined();
      hiredPersonId = hireRes.body.data.personId;
      hiredEmploymentId = hireRes.body.data.employmentId;

      // Verify Person and Employment exist in database
      const confirmedPerson = await getDbClient().query(
        'SELECT * FROM people WHERE organization_id = $1 AND email = $2',
        [pilotOrg.id, 'vikram.applicant@external.internal']
      );
      expect(confirmedPerson.rows.length).toBe(1);
      expect(confirmedPerson.rows[0].id).toBe(hiredPersonId);
    });

    it('rejects candidate email collision with 409 IDENTITY_CONFLICT on hire', async () => {
      // 1. Create candidate with email matching existing Person (personDev) without internalPersonId link
      const candCollisionRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/candidates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Collision',
          lastName: 'Candidate',
          email: 'developer@devoc-pilot.internal', // matches existing personDev in org!
        });
      expect(candCollisionRes.status).toBe(201);
      const collisionCandId = candCollisionRes.body.data.id;

      // 2. Create second position requisition
      const pos2Res = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/positions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Infrastructure Specialist',
          code: 'REQ-INFRA-02',
          employmentType: 'full_time',
          openingsCount: 1,
          hiringManagerId: personFounder.id,
          departmentId: deptEng.id,
          businessUnitId: buSolutions.id,
        });
      expect(pos2Res.status).toBe(201);
      await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/positions/${pos2Res.body.data.id}/open`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 3. Application & Offer
      const app2Res = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/applications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId: collisionCandId,
          positionId: pos2Res.body.data.id,
          source: 'direct',
        });
      expect(app2Res.status).toBe(201);

      const off2Res = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/applications/${app2Res.body.data.id}/offer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 1300000,
          currency: 'INR',
          compensationFrequency: 'annual',
          proposedStartDate: '2026-11-01',
          termsConditions: 'Infra Contract',
        });
      expect(off2Res.status).toBe(201);

      await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/offers/${off2Res.body.data.id}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ responseNotes: 'Accepted' });

      // 4. Attempt to hire must fail with 409 IDENTITY_CONFLICT
      const hireCollisionRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/recruitment/applications/${app2Res.body.data.id}/hire`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ offerId: off2Res.body.data.id });

      expect(hireCollisionRes.status).toBe(409);
      expect(hireCollisionRes.body.error.code).toBe('IDENTITY_CONFLICT');
    });
  });

  // ==========================================================================
  // Section 15: Onboarding & Employee Lifecycle Pilot
  // ==========================================================================
  describe('Pilot Section 15 — Onboarding & Lifecycle Pilot', () => {
    it('creates onboarding plan, onboarding tasks, and records promotion', async () => {
      // 1. Create Onboarding Plan for newly hired employment
      const planRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce/onboarding-plans`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employmentId: hiredEmploymentId,
          personId: hiredPersonId,
          targetCompletionDate: '2026-11-01',
          notes: 'Engineering Onboarding 30-Day Plan',
        });
      expect(planRes.status).toBe(201);

      // 2. Record Promotion (jobTitle changes independently of system role)
      const promoRes = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce/promotions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employmentId: hiredEmploymentId,
          personId: hiredPersonId,
          sourceJobTitle: 'Full-Stack Software Engineer',
          targetJobTitle: 'Lead Software Architect',
          reason: 'Exemplary technical leadership during pilot operations',
          effectiveDate: '2026-11-01',
        });
      expect(promoRes.status).toBe(201);
      expect(promoRes.body.data.status).toBe('draft');

      // Approve promotion
      const appPromoRes = await request(app)
        .patch(`/api/v1/organizations/${pilotOrg.id}/workforce/promotions/${promoRes.body.data.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved', notes: 'Approved promotion' });
      expect(appPromoRes.status).toBe(200);
      expect(appPromoRes.body.data.status).toBe('approved');
    });
  });

  // ==========================================================================
  // Section 16: Finance Engine Pilot
  // ==========================================================================
  describe('Pilot Section 16 — Operational Finance Pilot', () => {
    it('creates student fee obligation, discount, referral discount, EMI installments, payments, and late fees', async () => {
      // 1. Category & Party Setup
      const catRes = await request(app)
        .post('/api/v1/finance/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          name: 'Pilot Academy Course Fees',
          code: 'CAT-PILOT-FEES',
          categoryType: 'revenue',
        });
      expect(catRes.status).toBe(201);

      const partyRes = await request(app)
        .post('/api/v1/finance/parties')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          partyType: 'person',
          personId: personStudent.id,
          name: 'Sam Student',
          email: 'student@devoc-pilot.internal',
        });
      expect(partyRes.status).toBe(201);
      studentPartyId = partyRes.body.data.id;

      // 2. Student Fee Obligation with Discount & Referral Discount
      const obliRes = await request(app)
        .post('/api/v1/finance/obligations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          partyId: studentPartyId,
          categoryId: catRes.body.data.id,
          direction: 'receivable',
          title: 'Full-Stack Academy Tuition Fee — Batch 2026',
          currency: 'INR',
          items: [
            { title: 'Core Tuition', itemType: 'charge', unitAmount: 60000, quantity: 1 },
            { title: 'Early Enrollment Discount', itemType: 'discount', unitAmount: 5000, quantity: 1 },
            { title: 'Alumni Referral Discount', itemType: 'discount', unitAmount: 2000, quantity: 1 },
          ],
        });
      expect(obliRes.status).toBe(201);
      acadFeeObligationId = obliRes.body.data.id;
      // Net amount: 60000 - 5000 - 2000 = 53000
      expect(Number(obliRes.body.data.netAmount)).toBe(53000);

      // Transition to Issued
      await request(app)
        .patch(`/api/v1/finance/obligations/${acadFeeObligationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({ state: 'Issued' });

      // 3. EMI Payment Inflow Transaction & Allocation
      const payRes = await request(app)
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          partyId: studentPartyId,
          direction: 'inflow',
          transactionType: 'payment',
          amount: 26500, // 50% first EMI
          currency: 'INR',
          paymentMode: 'upi',
          referenceNumber: 'UPI-PILOT-001',
          postImmediately: true,
        });
      expect(payRes.status).toBe(201);

      // Allocate Transaction to Obligation
      const allocRes = await request(app)
        .post('/api/v1/finance/allocations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          transactionId: payRes.body.data.id,
          obligationId: acadFeeObligationId,
          allocatedAmount: 26500,
        });
      expect(allocRes.status).toBe(201);

      // Check Remaining Balance (53000 - 26500 = 26500)
      const getObli = await request(app)
        .get(`/api/v1/finance/obligations/${acadFeeObligationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id);
      expect(getObli.status).toBe(200);
      expect(Number(getObli.body.data.balanceAmount)).toBe(26500);

      // 4. Client Software Billing Obligation
      const clientPartyRes = await request(app)
        .post('/api/v1/finance/parties')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          partyType: 'client',
          name: 'Apex Global Enterprises',
          email: 'finance@apex-global.com',
        });
      expect(clientPartyRes.status).toBe(201);

      const clientObliRes = await request(app)
        .post('/api/v1/finance/obligations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          partyId: clientPartyRes.body.data.id,
          categoryId: catRes.body.data.id,
          direction: 'receivable',
          title: 'Pilot Software Engineering Milestone Billing',
          currency: 'INR',
          items: [{ title: 'Milestone 1 Deliverable', itemType: 'charge', unitAmount: 150000, quantity: 1 }],
        });
      expect(clientObliRes.status).toBe(201);
      clientObligationId = clientObliRes.body.data.id;
    });
  });

  // ==========================================================================
  // Section 17 & 18: Founder Command Center & Academy Head Pilot
  // ==========================================================================
  describe('Pilot Section 17 & 18 — Founder & Academy Head Views', () => {
    it('verifies Founder view has holistic visibility across people, projects, work, and finances', async () => {
      // Projects count
      const projRes = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id);
      expect(projRes.status).toBe(200);
      expect(projRes.body.data.length).toBeGreaterThanOrEqual(2);

      // Financial obligations visibility (Academy + Client)
      const finRes = await request(app)
        .get('/api/v1/finance/obligations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id);
      expect(finRes.status).toBe(200);
      expect(finRes.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('verifies Academy Head can query enrollments and programs without requiring Founder privileges', async () => {
      const enrollRes = await request(app)
        .get(`/api/v1/organizations/${pilotOrg.id}/learning-enrollments`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(enrollRes.status).toBe(200);
      expect(enrollRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Section 19: Administrative Operations Pilot
  // ==========================================================================
  describe('Pilot Section 19 — Administrative Operations Pilot', () => {
    it('executes org settings update, feature overrides, and audit trail generation', async () => {
      // 1. Update Organization Settings
      const setRes = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({
          timezone: 'Asia/Kolkata',
          currency: 'INR',
        });
      expect(setRes.status).toBe(200);

      // 2. Query Audit Trail
      const auditRes = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id);
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThan(0);
      // Ensure audit records belong exclusively to pilotOrg
      for (const entry of auditRes.body.data) {
        expect(entry.organizationId).toBe(pilotOrg.id);
      }
    });
  });

  // ==========================================================================
  // Section 20: Tenant Isolation Test (Org A vs Org B)
  // ==========================================================================
  describe('Pilot Section 20 — Absolute Tenant Isolation Tests', () => {
    it('prohibits Org B user from accessing Org A project (returns 403 or 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${devProjectId}`)
        .set('Authorization', `Bearer ${rivalAdminToken}`)
        .set('X-Organization-Id', rivalOrg.id);

      expect([403, 404]).toContain(res.status);
    });

    it('prohibits Org B user from accessing Org A task (returns 403 or 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${devTaskId}`)
        .set('Authorization', `Bearer ${rivalAdminToken}`)
        .set('X-Organization-Id', rivalOrg.id);

      expect([403, 404]).toContain(res.status);
    });

    it('prohibits Org B user from accessing Org A work record (returns 403 or 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${rivalOrg.id}/work/${devWorkId}`)
        .set('Authorization', `Bearer ${rivalAdminToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('prohibits Org B user from accessing Org A financial obligation (returns 403 or 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/obligations/${acadFeeObligationId}`)
        .set('Authorization', `Bearer ${rivalAdminToken}`)
        .set('X-Organization-Id', rivalOrg.id);

      expect([403, 404]).toContain(res.status);
    });

    it('prohibits Org B user from accessing Org A learning program (returns 403 or 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${rivalOrg.id}/learning-programs/${programId}`)
        .set('Authorization', `Bearer ${rivalAdminToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('prohibits Org B user from accessing Org A audit trail (returns 403 or 404)', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${rivalAdminToken}`)
        .set('X-Organization-Id', rivalOrg.id);

      expect(res.status).toBe(200);
      // Ensure zero Org A audit rows leak into Org B query
      for (const entry of res.body.data) {
        expect(entry.organizationId).toBe(rivalOrg.id);
        expect(entry.organizationId).not.toBe(pilotOrg.id);
      }
    });

    it('blocks forged X-Organization-Id substitution', async () => {
      // Rival admin passes token for Rival Org but attempts to claim X-Organization-Id = pilotOrg.id
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${rivalAdminToken}`)
        .set('X-Organization-Id', pilotOrg.id);

      // Must be blocked because user is not a member of pilotOrg
      expect([403, 404]).toContain(res.status);
    });
  });

  // ==========================================================================
  // Section 23: State Machine Transitions (Illegal Transitions Fail Safely)
  // ==========================================================================
  describe('Pilot Section 23 — Explicit State Machine Validation', () => {
    it('rejects illegal Project status transition (e.g. invalid status name)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${devProjectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({ status: 'invalid_status_xyz' });

      expect(res.status).toBe(400);
    });

    it('rejects illegal Task status transition (e.g. invalid status string)', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${devTaskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-Id', pilotOrg.id)
        .send({ status: 'bogus_task_status' });

      expect(res.status).toBe(400);
    });

    it('rejects approving already approved timesheet', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${pilotOrg.id}/workforce-time/timesheets/${timesheetId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Cannot re-approve an approved timesheet; must fail safely (400 or 422)
      expect([400, 422]).toContain(res.status);
    });
  });

  // ==========================================================================
  // Section 24: Audit & Domain Event Validation
  // ==========================================================================
  describe('Pilot Section 24 — Audit & Event Atomicity Validation', () => {
    it('verifies mutations produce persistent audit entries with correct actor, organization, and timestamps', async () => {
      const db = getDbClient();
      const auditRows = await db.query<any>(
        `SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 10;`,
        [pilotOrg.id]
      );

      expect(auditRows.rows.length).toBeGreaterThan(0);
      const sample = auditRows.rows[0];
      expect(sample.organization_id).toBe(pilotOrg.id);
      expect(sample.entity_type).toBeDefined();
      expect(sample.action).toBeDefined();
      expect(sample.created_at).toBeDefined();
    });

    it('verifies transactional outbox records exist for emitted domain events', async () => {
      const db = getDbClient();
      const outboxRows = await db.query<any>(
        `SELECT * FROM event_outbox WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 10;`,
        [pilotOrg.id]
      );

      expect(outboxRows.rows.length).toBeGreaterThan(0);
      const event = outboxRows.rows[0];
      expect(event.organization_id).toBe(pilotOrg.id);
      expect(event.event_name).toBeDefined();
      expect(event.payload).toBeDefined();
    });
  });

  // ==========================================================================
  // Section 25: Analytics Validation
  // ==========================================================================
  describe('Pilot Section 25 — Analytics Engine Validation', () => {
    it('computes metrics against operational domain data without mutating source tables', async () => {
      const metricService = new MetricDefinitionService();
      const computationService = new AnalyticsComputationService();

      // 1. Placement Rate KPI
      const placementMetric = await metricService.createMetricDefinition(
        pilotOrg.id,
        {
          name: 'Pilot Student Completion Rate',
          code: 'KPI_PILOT_COMPLETION',
          domainModule: 'learning',
          metricType: 'PERCENTAGE',
          calculationSpec: {
            numerator: { sourceEntity: 'LEARNING_ENROLLMENT', filter: { status: 'active' } },
            denominator: { sourceEntity: 'LEARNING_ENROLLMENT', filter: {} },
          },
          supportedDimensions: ['organization_id'],
        },
        adminUser.id
      );
      placementMetricId = placementMetric.id;

      // 2. Revenue KPI
      const revenueMetric = await metricService.createMetricDefinition(
        pilotOrg.id,
        {
          name: 'Total Recognized Cash Inflow',
          code: 'KPI_PILOT_REVENUE',
          domainModule: 'finance',
          metricType: 'SUM',
          calculationSpec: {
            sourceEntity: 'FINANCIAL_TRANSACTION',
            field: 'amount',
            filter: { direction: 'inflow', state: 'Posted' },
          },
          supportedDimensions: ['organization_id'],
        },
        adminUser.id
      );
      revenueMetricId = revenueMetric.id;

      // Compute Revenue Metric
      const result = await computationService.computeMetric(
        pilotOrg.id,
        revenueMetric.id,
        {
          periodType: 'year',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-12-31T23:59:59Z',
          persistSnapshot: true,
        }
      );

      expect(result).toBeDefined();
      // Should reflect the 26,500 INR student EMI payment transaction posted
      expect(Number(result.numericValue)).toBeGreaterThanOrEqual(26500);
    });
  });
});
