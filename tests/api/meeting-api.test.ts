import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { StructureService } from '../../src/modules/organization/application/structure.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { ProjectService } from '../../src/modules/projects-tasks/application/project.service.js';
import { TaskService } from '../../src/modules/projects-tasks/application/task.service.js';
import { MeetingTypeService } from '../../src/modules/meetings/application/meeting-type.service.js';
import { MeetingService } from '../../src/modules/meetings/application/meeting.service.js';
import { AuthService } from '../../src/auth/auth.service.js';

describe('Milestone 6 — Meetings Engine API Integration Tests', () => {
  let app: any;
  let org: any;
  let token: string;
  let adminUser: any;
  let personOrganizer: any;
  let personParticipant: any;
  let project: any;
  let task: any;
  let defaultTypes: any[];
  let projectType: any;
  let createdMeetingId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    app = createApp();

    // Setup Organization
    const res = await OrganizationService.bootstrapOrganization({
      name: 'Meeting API Test Org',
      slug: 'meeting-api-org',
      adminEmail: 'admin@meeting-api.test',
      adminPassword: 'Password123!',
      adminFullName: 'Meeting Admin',
    });
    org = res.organization;
    adminUser = res.adminUser;

    const login = await AuthService.login('admin@meeting-api.test', 'Password123!');
    token = login.accessToken;

    personOrganizer = await PeopleService.createPerson(org.id, {
      firstName: 'Alice',
      lastName: 'Organizer',
      email: 'alice.org@meeting-api.test',
      userId: adminUser.id,
    });

    personParticipant = await PeopleService.createPerson(org.id, {
      firstName: 'Bob',
      lastName: 'Attendee',
      email: 'bob.att@meeting-api.test',
    });

    project = await ProjectService.createProject({
      organizationId: org.id,
      name: 'DeVoc Meetings Platform',
      key: 'MEET',
      projectType: 'saas_product',
      createdByPersonId: personOrganizer.id,
    });

    task = await TaskService.createTask({
      organizationId: org.id,
      projectId: project.id,
      title: 'Action Item Task Followup',
      createdByPersonId: personOrganizer.id,
    });

    defaultTypes = await MeetingTypeService.seedDefaultMeetingTypes(org.id);
    projectType = defaultTypes.find((t) => t.code === 'project');
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('Meeting Types API', () => {
    it('GET /meeting-types - retrieves seeded default meeting types', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/meeting-types`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(9);
      const codes = res.body.data.map((t: any) => t.code);
      expect(codes).toContain('project');
      expect(codes).toContain('team');
      expect(codes).toContain('one_on_one');
    });

    it('POST /meeting-types - creates custom meeting type', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meeting-types`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Retrospective Session',
          code: 'retro_session',
          description: 'Team retrospective meeting',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('retro_session');
      expect(res.body.data.isActive).toBe(true);
    });

    it('PATCH /meeting-types/:id - updates meeting type', async () => {
      const createRes = await request(app)
        .post(`/api/v1/organizations/${org.id}/meeting-types`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Temp Meeting Type',
          code: 'temp_type',
        });

      const typeId = createRes.body.data.id;

      const patchRes = await request(app)
        .patch(`/api/v1/organizations/${org.id}/meeting-types/${typeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          name: 'Updated Temp Type',
          description: 'Updated description',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.name).toBe('Updated Temp Type');
    });
  });

  describe('Meetings CRUD & Target Validation API', () => {
    it('POST /meetings - creates meeting with organizer and project target context', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'M6 Meetings Architecture Sync',
          description: 'Review schema, target resolution, and API contracts',
          meetingTypeId: projectType.id,
          scheduledStartAt: '2026-09-15T10:00:00Z',
          scheduledEndAt: '2026-09-15T11:00:00Z',
          locationType: 'virtual',
          locationReference: 'https://meet.devoc.internal/m6-sync',
          organizerPersonId: personOrganizer.id,
          createdByPersonId: personOrganizer.id,
          targetType: 'project',
          targetId: project.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('scheduled');
      expect(res.body.data.organizerPersonId).toBe(personOrganizer.id);
      expect(res.body.data.target).toBeDefined();
      expect(res.body.data.target.targetId).toBe(project.id);
      expect(res.body.data.participants.length).toBe(1);
      expect(res.body.data.participants[0].personId).toBe(personOrganizer.id);

      createdMeetingId = res.body.data.id;
    });

    it('GET /meetings/:id - gets full meeting details', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdMeetingId);
      expect(res.body.data.title).toBe('M6 Meetings Architecture Sync');
    });

    it('GET /meetings - lists meetings with filtering', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/meetings?targetType=project&targetId=${project.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(createdMeetingId);
    });

    it('PATCH /meetings/:id - updates meeting details', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'M6 Meetings Architecture Sync v2',
          locationReference: 'https://meet.devoc.internal/m6-updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('M6 Meetings Architecture Sync v2');
    });
  });

  describe('Meeting Lifecycle Status Transitions API', () => {
    let meetingId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'Lifecycle Meeting',
          meetingTypeId: projectType.id,
          scheduledStartAt: '2026-09-15T14:00:00Z',
          scheduledEndAt: '2026-09-15T15:00:00Z',
          organizerPersonId: personOrganizer.id,
          createdByPersonId: personOrganizer.id,
        });
      meetingId = res.body.data.id;
    });

    it('POST /meetings/:id/start - starts meeting (scheduled -> in_progress)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${meetingId}/start`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ actualStartAt: '2026-09-15T14:00:00Z' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
      expect(res.body.data.actualStartAt).toBeDefined();
    });

    it('POST /meetings/:id/complete - completes meeting (in_progress -> completed)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${meetingId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ actualEndAt: '2026-09-15T15:00:00Z' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.actualEndAt).toBeDefined();
    });

    it('PATCH /meetings/:id - fails to update completed meeting (terminal)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ title: 'Terminal Meeting Title' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /meetings/:id/cancel - cancels a scheduled meeting', async () => {
      const schRes = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'Meeting To Cancel',
          meetingTypeId: projectType.id,
          scheduledStartAt: '2026-09-16T10:00:00Z',
          scheduledEndAt: '2026-09-16T11:00:00Z',
          organizerPersonId: personOrganizer.id,
          createdByPersonId: personOrganizer.id,
        });

      const cancelMeetingId = schRes.body.data.id;

      const cancelRes = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${cancelMeetingId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');
    });
  });

  describe('Participants API', () => {
    let participantId: string;
    let organizerParticipantId: string;

    beforeAll(async () => {
      const meetingDetail = await MeetingService.getMeetingById(org.id, createdMeetingId);
      const organizerP = meetingDetail.participants.find((p) => p.personId === personOrganizer.id);
      organizerParticipantId = organizerP!.id;
    });

    it('POST /meetings/:id/participants - adds participant to meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/participants`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          personId: personParticipant.id,
          participantType: 'required',
          responseStatus: 'invited',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.personId).toBe(personParticipant.id);
      participantId = res.body.data.id;
    });

    it('GET /meetings/:id/participants - lists participants', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/participants`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('PATCH /meetings/:id/participants/:participantId - updates participant status', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/participants/${participantId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          responseStatus: 'accepted',
          notes: 'Joining via web link',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.responseStatus).toBe('accepted');
      expect(res.body.data.notes).toBe('Joining via web link');
    });

    it('DELETE /meetings/:id/participants/:participantId - prevents removing meeting organizer', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/participants/${organizerParticipantId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('DELETE /meetings/:id/participants/:participantId - removes regular participant', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/participants/${participantId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Participant removed successfully');
    });
  });

  describe('Agenda Items API', () => {
    let agendaItemId: string;

    it('POST /meetings/:id/agenda - adds agenda item', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/agenda`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'Review M6 Schema & Migration',
          description: '8 tables with indexes',
          position: 1,
          durationMinutes: 20,
          ownerPersonId: personOrganizer.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Review M6 Schema & Migration');
      agendaItemId = res.body.data.id;
    });

    it('GET /meetings/:id/agenda - lists agenda items', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/agenda`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(agendaItemId);
    });

    it('PATCH /meetings/:id/agenda/:agendaItemId - updates agenda item', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/agenda/${agendaItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          status: 'discussed',
          durationMinutes: 25,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('discussed');
      expect(res.body.data.durationMinutes).toBe(25);
    });

    it('DELETE /meetings/:id/agenda/:agendaItemId - removes agenda item', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/agenda/${agendaItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Agenda item removed successfully');
    });
  });

  describe('Notes / Minutes API', () => {
    it('PUT /meetings/:id/notes - creates draft notes', async () => {
      const res = await request(app)
        .put(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          content: 'Draft minutes for M6 Meetings Sync.',
          preparedByPersonId: personOrganizer.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Draft minutes for M6 Meetings Sync.');
      expect(res.body.data.status).toBe('draft');
    });

    it('GET /meetings/:id/notes - retrieves meeting notes', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Draft minutes for M6 Meetings Sync.');
    });

    it('POST /meetings/:id/notes/finalize - finalizes meeting notes', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/notes/finalize`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ preparedByPersonId: personOrganizer.id });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('finalized');
      expect(res.body.data.finalizedAt).toBeDefined();
    });

    it('PUT /meetings/:id/notes - fails to edit finalized notes (immutable)', async () => {
      const res = await request(app)
        .put(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({ content: 'Attempt to overwrite finalized notes' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Decisions API', () => {
    let decisionId: string;

    it('POST /meetings/:id/decisions - creates explicit decision', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/decisions`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'M6 Architecture Approval',
          decisionText: 'Approved M6 Meetings Engine modular monolith design.',
          recordedByPersonId: personOrganizer.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('M6 Architecture Approval');
      decisionId = res.body.data.id;
    });

    it('GET /meetings/:id/decisions - lists decisions', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/decisions`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(decisionId);
    });

    it('PATCH /meetings/:id/decisions/:decisionId - updates decision', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/decisions/${decisionId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'M6 Architecture Final Approval',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('M6 Architecture Final Approval');
    });
  });

  describe('Action Items & Task Linking API', () => {
    let actionItemId: string;

    it('POST /meetings/:id/action-items - creates action item', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/action-items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id)
        .send({
          title: 'Implement Meetings Controllers',
          description: 'API handlers for all M6 endpoints',
          ownerPersonId: personOrganizer.id,
          dueAt: '2026-09-20T17:00:00Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Implement Meetings Controllers');
      expect(res.body.data.status).toBe('open');
      actionItemId = res.body.data.id;
    });

    it('POST /meetings/:id/action-items/:actionItemId/link-task/:taskId - links to M4 Task', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/action-items/${actionItemId}/link-task/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.taskId).toBe(task.id);
    });

    it('POST /meetings/:id/action-items/:actionItemId/complete - completes action item', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/action-items/${actionItemId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
    });

    it('DELETE /meetings/:id/action-items/:actionItemId/task - unlinks task', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${org.id}/meetings/${createdMeetingId}/action-items/${actionItemId}/task`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', org.id);

      expect(res.status).toBe(200);
      expect(res.body.data.taskId).toBeNull();
    });
  });

  describe('Audit Logs & Domain Events Verification', () => {
    it('verifies audit logs recorded M6 meeting events', async () => {
      const db = getDbClient();
      const res = await db.query(
        `SELECT action FROM audit_logs WHERE organization_id = $1 AND (action LIKE 'meeting.%' OR action LIKE 'participant.%' OR action LIKE 'notes.%' OR action LIKE 'decision.%' OR action LIKE 'action_item.%');`,
        [org.id]
      );

      const actions = res.rows.map((r: any) => r.action);
      expect(actions).toContain('meeting.created');
      expect(actions).toContain('participant.added');
      expect(actions).toContain('notes.finalized');
      expect(actions).toContain('decision.created');
      expect(actions).toContain('action_item.created');
    });
  });
});
