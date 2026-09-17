import { Router } from 'express';
import { MeetingTypeController } from './meeting-type.controller.js';
import { MeetingController } from './meeting.controller.js';
import { MeetingParticipantController } from './meeting-participant.controller.js';
import { MeetingAgendaController } from './meeting-agenda.controller.js';
import { MeetingNotesController } from './meeting-notes.controller.js';
import { MeetingDecisionController } from './meeting-decision.controller.js';
import { MeetingActionItemController } from './meeting-action-item.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireRole } from '../../../permissions/permissions.middleware.js';

export const meetingRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

// --- MEETING TYPES ENDPOINTS ---
tenantProtected.get('/meeting-types', requireRole(['org_admin', 'org_member']), MeetingTypeController.listTypes);
tenantProtected.post('/meeting-types', requireRole(['org_admin', 'org_member']), MeetingTypeController.createType);
tenantProtected.patch('/meeting-types/:meetingTypeId', requireRole(['org_admin', 'org_member']), MeetingTypeController.updateType);

tenantProtected.get('/organizations/:organizationId/meeting-types', requireRole(['org_admin', 'org_member']), MeetingTypeController.listTypes);
tenantProtected.post('/organizations/:organizationId/meeting-types', requireRole(['org_admin', 'org_member']), MeetingTypeController.createType);
tenantProtected.patch('/organizations/:organizationId/meeting-types/:meetingTypeId', requireRole(['org_admin', 'org_member']), MeetingTypeController.updateType);

// --- MEETINGS ENDPOINTS ---
tenantProtected.get('/meetings', requireRole(['org_admin', 'org_member']), MeetingController.listMeetings);
tenantProtected.post('/meetings', requireRole(['org_admin', 'org_member']), MeetingController.createMeeting);
tenantProtected.get('/meetings/:meetingId', requireRole(['org_admin', 'org_member']), MeetingController.getMeetingById);
tenantProtected.patch('/meetings/:meetingId', requireRole(['org_admin', 'org_member']), MeetingController.updateMeeting);

// Lifecycle transitions
tenantProtected.post('/meetings/:meetingId/start', requireRole(['org_admin', 'org_member']), MeetingController.createTransitionHandler('in_progress'));
tenantProtected.post('/meetings/:meetingId/complete', requireRole(['org_admin', 'org_member']), MeetingController.createTransitionHandler('completed'));
tenantProtected.post('/meetings/:meetingId/cancel', requireRole(['org_admin', 'org_member']), MeetingController.createTransitionHandler('cancelled'));

// Participants
tenantProtected.get('/meetings/:meetingId/participants', requireRole(['org_admin', 'org_member']), MeetingParticipantController.listParticipants);
tenantProtected.post('/meetings/:meetingId/participants', requireRole(['org_admin', 'org_member']), MeetingParticipantController.addParticipant);
tenantProtected.patch('/meetings/:meetingId/participants/:participantId', requireRole(['org_admin', 'org_member']), MeetingParticipantController.updateParticipant);
tenantProtected.delete('/meetings/:meetingId/participants/:participantId', requireRole(['org_admin', 'org_member']), MeetingParticipantController.removeParticipant);

// Agenda
tenantProtected.get('/meetings/:meetingId/agenda', requireRole(['org_admin', 'org_member']), MeetingAgendaController.listAgendaItems);
tenantProtected.post('/meetings/:meetingId/agenda', requireRole(['org_admin', 'org_member']), MeetingAgendaController.addAgendaItem);
tenantProtected.patch('/meetings/:meetingId/agenda/:agendaItemId', requireRole(['org_admin', 'org_member']), MeetingAgendaController.updateAgendaItem);
tenantProtected.delete('/meetings/:meetingId/agenda/:agendaItemId', requireRole(['org_admin', 'org_member']), MeetingAgendaController.removeAgendaItem);

// Notes / Minutes
tenantProtected.get('/meetings/:meetingId/notes', requireRole(['org_admin', 'org_member']), MeetingNotesController.getNotes);
tenantProtected.put('/meetings/:meetingId/notes', requireRole(['org_admin', 'org_member']), MeetingNotesController.upsertDraftNotes);
tenantProtected.post('/meetings/:meetingId/notes/finalize', requireRole(['org_admin', 'org_member']), MeetingNotesController.finalizeNotes);

// Decisions
tenantProtected.get('/meetings/:meetingId/decisions', requireRole(['org_admin', 'org_member']), MeetingDecisionController.listDecisions);
tenantProtected.post('/meetings/:meetingId/decisions', requireRole(['org_admin', 'org_member']), MeetingDecisionController.createDecision);
tenantProtected.patch('/meetings/:meetingId/decisions/:decisionId', requireRole(['org_admin', 'org_member']), MeetingDecisionController.updateDecision);
tenantProtected.delete('/meetings/:meetingId/decisions/:decisionId', requireRole(['org_admin', 'org_member']), MeetingDecisionController.deleteDecision);

// Action Items
tenantProtected.get('/meetings/:meetingId/action-items', requireRole(['org_admin', 'org_member']), MeetingActionItemController.listActionItems);
tenantProtected.post('/meetings/:meetingId/action-items', requireRole(['org_admin', 'org_member']), MeetingActionItemController.createActionItem);
tenantProtected.patch('/meetings/:meetingId/action-items/:actionItemId', requireRole(['org_admin', 'org_member']), MeetingActionItemController.updateActionItem);
tenantProtected.post('/meetings/:meetingId/action-items/:actionItemId/complete', requireRole(['org_admin', 'org_member']), MeetingActionItemController.completeActionItem);
tenantProtected.post('/meetings/:meetingId/action-items/:actionItemId/cancel', requireRole(['org_admin', 'org_member']), MeetingActionItemController.cancelActionItem);
tenantProtected.post('/meetings/:meetingId/action-items/:actionItemId/link-task/:taskId', requireRole(['org_admin', 'org_member']), MeetingActionItemController.linkTask);
tenantProtected.delete('/meetings/:meetingId/action-items/:actionItemId/task', requireRole(['org_admin', 'org_member']), MeetingActionItemController.unlinkTask);

// Explicit /organizations/:organizationId/... variants
tenantProtected.get('/organizations/:organizationId/meetings', requireRole(['org_admin', 'org_member']), MeetingController.listMeetings);
tenantProtected.post('/organizations/:organizationId/meetings', requireRole(['org_admin', 'org_member']), MeetingController.createMeeting);
tenantProtected.get('/organizations/:organizationId/meetings/:meetingId', requireRole(['org_admin', 'org_member']), MeetingController.getMeetingById);
tenantProtected.patch('/organizations/:organizationId/meetings/:meetingId', requireRole(['org_admin', 'org_member']), MeetingController.updateMeeting);

tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/start', requireRole(['org_admin', 'org_member']), MeetingController.createTransitionHandler('in_progress'));
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/complete', requireRole(['org_admin', 'org_member']), MeetingController.createTransitionHandler('completed'));
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/cancel', requireRole(['org_admin', 'org_member']), MeetingController.createTransitionHandler('cancelled'));

tenantProtected.get('/organizations/:organizationId/meetings/:meetingId/participants', requireRole(['org_admin', 'org_member']), MeetingParticipantController.listParticipants);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/participants', requireRole(['org_admin', 'org_member']), MeetingParticipantController.addParticipant);
tenantProtected.patch('/organizations/:organizationId/meetings/:meetingId/participants/:participantId', requireRole(['org_admin', 'org_member']), MeetingParticipantController.updateParticipant);
tenantProtected.delete('/organizations/:organizationId/meetings/:meetingId/participants/:participantId', requireRole(['org_admin', 'org_member']), MeetingParticipantController.removeParticipant);

tenantProtected.get('/organizations/:organizationId/meetings/:meetingId/agenda', requireRole(['org_admin', 'org_member']), MeetingAgendaController.listAgendaItems);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/agenda', requireRole(['org_admin', 'org_member']), MeetingAgendaController.addAgendaItem);
tenantProtected.patch('/organizations/:organizationId/meetings/:meetingId/agenda/:agendaItemId', requireRole(['org_admin', 'org_member']), MeetingAgendaController.updateAgendaItem);
tenantProtected.delete('/organizations/:organizationId/meetings/:meetingId/agenda/:agendaItemId', requireRole(['org_admin', 'org_member']), MeetingAgendaController.removeAgendaItem);

tenantProtected.get('/organizations/:organizationId/meetings/:meetingId/notes', requireRole(['org_admin', 'org_member']), MeetingNotesController.getNotes);
tenantProtected.put('/organizations/:organizationId/meetings/:meetingId/notes', requireRole(['org_admin', 'org_member']), MeetingNotesController.upsertDraftNotes);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/notes/finalize', requireRole(['org_admin', 'org_member']), MeetingNotesController.finalizeNotes);

tenantProtected.get('/organizations/:organizationId/meetings/:meetingId/decisions', requireRole(['org_admin', 'org_member']), MeetingDecisionController.listDecisions);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/decisions', requireRole(['org_admin', 'org_member']), MeetingDecisionController.createDecision);
tenantProtected.patch('/organizations/:organizationId/meetings/:meetingId/decisions/:decisionId', requireRole(['org_admin', 'org_member']), MeetingDecisionController.updateDecision);
tenantProtected.delete('/organizations/:organizationId/meetings/:meetingId/decisions/:decisionId', requireRole(['org_admin', 'org_member']), MeetingDecisionController.deleteDecision);

tenantProtected.get('/organizations/:organizationId/meetings/:meetingId/action-items', requireRole(['org_admin', 'org_member']), MeetingActionItemController.listActionItems);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/action-items', requireRole(['org_admin', 'org_member']), MeetingActionItemController.createActionItem);
tenantProtected.patch('/organizations/:organizationId/meetings/:meetingId/action-items/:actionItemId', requireRole(['org_admin', 'org_member']), MeetingActionItemController.updateActionItem);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/action-items/:actionItemId/complete', requireRole(['org_admin', 'org_member']), MeetingActionItemController.completeActionItem);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/action-items/:actionItemId/cancel', requireRole(['org_admin', 'org_member']), MeetingActionItemController.cancelActionItem);
tenantProtected.post('/organizations/:organizationId/meetings/:meetingId/action-items/:actionItemId/link-task/:taskId', requireRole(['org_admin', 'org_member']), MeetingActionItemController.linkTask);
tenantProtected.delete('/organizations/:organizationId/meetings/:meetingId/action-items/:actionItemId/task', requireRole(['org_admin', 'org_member']), MeetingActionItemController.unlinkTask);

meetingRouter.use(tenantProtected);
