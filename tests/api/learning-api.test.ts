import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { ProjectService } from '../../src/modules/projects-tasks/application/project.service.js';
import { TaskService } from '../../src/modules/projects-tasks/application/task.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 7 — Learning Engine REST API E2E Integration Tests', () => {
  let app: any;
  let org: any;
  let token: string;
  let adminUser: any;
  let studentPerson: any;
  let reviewerPerson: any;
  let project: any;
  let task: any;
  let programId: string;
  let milestoneId: string;
  let activityDefId: string;
  let enrollmentId: string;
  let enrollmentMilestoneId: string;
  let learningActivityId: string;
  let reviewId: string;
  let assessmentId: string;
  let attemptId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Learning Academy Org',
      slug: 'learning-academy-org',
      adminEmail: 'admin@learning-academy.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Academy Administrator',
    });

    org = boot.organization;
    adminUser = boot.adminUser;
    const login = await AuthService.login('admin@learning-academy.internal', 'Password123!');
    token = login.accessToken;

    studentPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Alice',
      lastName: 'Student',
      email: 'alice.student@academy.internal',
    });

    reviewerPerson = await PeopleService.createPerson(org.id, {
      firstName: 'Mentor',
      lastName: 'Instructor',
      email: 'instructor@academy.internal',
    });

    project = await ProjectService.createProject({
      organizationId: org.id,
      name: 'Academy Capstone Project',
      key: 'CAPSTONE',
      projectType: 'student_project',
      createdByPersonId: reviewerPerson.id,
      actorUserId: adminUser.id,
    });

    task = await TaskService.createTask({
      organizationId: org.id,
      projectId: project.id,
      title: 'Build Capstone Microservice',
      taskKey: 'CAPSTONE-1',
      createdByPersonId: reviewerPerson.id,
      actorUserId: adminUser.id,
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('1. Learning Programs API', () => {
    it('POST /learning-programs — should create a new learning program track in draft status', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-programs`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Software Development Curriculum',
          code: 'PROG-SW-DEV',
          description: 'Comprehensive software development track',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Software Development Curriculum');
      expect(res.body.data.code).toBe('PROG-SW-DEV');
      expect(res.body.data.status).toBe('draft');
      programId = res.body.data.id;
    });

    it('GET /learning-programs — should list learning programs', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/learning-programs`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /learning-programs/:programId/milestones — should add a program milestone', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-programs/${programId}/milestones`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Foundation & Core Syntax',
          description: 'Basics of programming and data structures',
          sequence: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Foundation & Core Syntax');
      milestoneId = res.body.data.id;
    });

    it('POST /learning-programs/:programId/milestones/:milestoneId/activities — should add an activity definition', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-programs/${programId}/milestones/${milestoneId}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'Implement CLI Tool Project',
          activityType: 'practical_project',
          sequence: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Implement CLI Tool Project');
      activityDefId = res.body.data.id;
    });

    it('PATCH /learning-programs/:programId — should update program metadata and activate it', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/organizations/${org.id}/learning-programs/${programId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ description: 'Updated track description' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe('Updated track description');

      const progService = new (await import('../../src/modules/learning/application/learning-program.service.js')).LearningProgramService();
      await progService.activateProgram(org.id, programId, adminUser.id);
    });
  });

  describe('2. Learning Enrollments API', () => {
    it('POST /learning-enrollments — should create student enrollment and auto-populate personalized plan', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: studentPerson.id,
          learningProgramId: programId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.personId).toBe(studentPerson.id);
      expect(res.body.data.status).toBe('pending');
      enrollmentId = res.body.data.id;
    });

    it('POST /learning-enrollments/:enrollmentId/activate — should activate enrollment', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-enrollments/${enrollmentId}/activate`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });

    it('GET /people/:personId/learning-enrollments — should fetch enrollments for student', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/people/${studentPerson.id}/learning-enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(enrollmentId);
    });
  });

  describe('3. Personalized Plan API', () => {
    it('GET /learning-enrollments/:enrollmentId/milestones — should fetch enrollment milestones', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/learning-enrollments/${enrollmentId}/milestones`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Foundation & Core Syntax');
      enrollmentMilestoneId = res.body.data[0].id;
    });

    it('POST /learning-enrollments/:enrollmentId/milestones/:milestoneId/activate — should activate milestone', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-enrollments/${enrollmentId}/milestones/${enrollmentMilestoneId}/activate`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });

    it('GET /learning-enrollments/:enrollmentId/activities — should fetch learning activities', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/learning-enrollments/${enrollmentId}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Implement CLI Tool Project');
      learningActivityId = res.body.data[0].id;
    });

    it('POST /learning-activities/:activityId/references — should link activity to M4 Project/Task target', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-activities/${learningActivityId}/references`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          referenceType: 'project',
          referenceId: project.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.referenceType).toBe('project');
      expect(res.body.data.referenceId).toBe(project.id);
    });

    it('POST /learning-activities/:activityId/complete — should complete learning activity', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-activities/${learningActivityId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
    });
  });

  describe('4. Learning Reviews API', () => {
    it('POST /learning-enrollments/:enrollmentId/reviews — should create a learning review', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-enrollments/${enrollmentId}/reviews`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          reviewerPersonId: reviewerPerson.id,
          reviewType: 'weekly',
          summary: 'Weekly review: Foundation milestone completed successfully',
          feedback: 'Great grasp of software design patterns',
          progressValue: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reviewerPersonId).toBe(reviewerPerson.id);
      expect(res.body.data.progressValue).toBe(50);
      reviewId = res.body.data.id;
    });

    it('POST /learning-enrollments/:enrollmentId/reviews/:reviewId/changes — should record a roadmap change', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-enrollments/${enrollmentId}/reviews/${reviewId}/changes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          changeType: 'complete_milestone',
          targetType: 'enrollment_milestone',
          targetId: enrollmentMilestoneId,
          reason: 'Passed review evaluation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.changeType).toBe('complete_milestone');
    });
  });

  describe('5. Learning Assessments API', () => {
    it('POST /learning-enrollments/:enrollmentId/assessments — should create an assessment', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/learning-enrollments/${enrollmentId}/assessments`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          learningActivityId,
          title: 'Core Software Architecture Practical Assessment',
          assessmentType: 'practical',
          maxScore: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Core Software Architecture Practical Assessment');
      expect(res.body.data.maxScore).toBe(100);
      assessmentId = res.body.data.id;
    });

    it('POST /assessments/:assessmentId/attempts — should submit an assessment attempt', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/assessments/${assessmentId}/attempts`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: studentPerson.id,
          evidenceMetadata: { repoUrl: 'https://github.com/student/capstone' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.attemptNumber).toBe(1);
      expect(res.body.data.status).toBe('submitted');
      attemptId = res.body.data.id;
    });

    it('POST /assessment-attempts/:attemptId/complete — should grade/complete the assessment attempt', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/assessment-attempts/${attemptId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          status: 'passed',
          score: 98,
          qualitativeResult: 'Outstanding practical submission',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('passed');
      expect(res.body.data.score).toBe(98);
    });
  });
});
