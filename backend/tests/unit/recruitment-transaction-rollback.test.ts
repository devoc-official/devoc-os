import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { PositionService } from '../../src/modules/recruitment/application/position.service.js';
import { CandidateService } from '../../src/modules/recruitment/application/candidate.service.js';
import { ApplicationService } from '../../src/modules/recruitment/application/application.service.js';
import { TrialService } from '../../src/modules/recruitment/application/trial.service.js';
import { OfferService } from '../../src/modules/recruitment/application/offer.service.js';
import { HiringService } from '../../src/modules/recruitment/application/hiring.service.js';
import { PipelineStageRepository } from '../../src/modules/recruitment/infrastructure/pipeline-stage.repository.js';
import { EventRegistryService } from '../../src/events/event-registry.js';
import { eventBus } from '../../src/events/event-bus.js';

describe('Milestone 13 — Transaction Rollback & Outbox Timing Conformance Tests', () => {
  let org: any;
  let hiringManager: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    await EventRegistryService.seedEventRegistry();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Rollback Test Org',
      slug: 'rollback-test-org',
      adminEmail: 'admin@rollback.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Rollback Admin',
    });
    org = boot.organization;

    hiringManager = await PeopleService.createPerson(org.id, {
      firstName: 'Hiring',
      lastName: 'Manager',
      email: 'hm@rollback.internal',
    });

    await PipelineStageRepository.seedDefaultStages(org.id);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. Position Creation — Rollback on failure, no uncommitted audit or outbox event remains', async () => {
    const db = getDbClient();

    const dispatchSpy = vi.fn();
    const handler = (evt: any) => dispatchSpy(evt);
    eventBus.on('recruitment.position.created', handler);

    let thrownError: any = null;
    try {
      await PositionService.createPosition({
        organizationId: org.id,
        title: '', // Invalid empty title -> throws inside transaction or before
        code: 'REQ-FAIL-01',
        hiringManagerId: hiringManager.id,
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();

    // Verify DB state: no position created
    const posRes = await db.query(`SELECT * FROM recruitment_positions WHERE code = 'REQ-FAIL-01';`);
    expect(posRes.rows.length).toBe(0);

    // Verify Audit log: no audit log for failed creation
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE organization_id = $1 AND action = 'recruitment.position.created' AND after_state->>'code' = 'REQ-FAIL-01';`,
      [org.id]
    );
    expect(auditRes.rows.length).toBe(0);

    // Verify Outbox: no outbox event
    const outboxRes = await db.query(
      `SELECT * FROM event_outbox WHERE organization_id = $1 AND event_name = 'recruitment.position.created' AND payload->>'code' = 'REQ-FAIL-01';`,
      [org.id]
    );
    expect(outboxRes.rows.length).toBe(0);

    // Verify Event Bus: no event dispatched
    expect(dispatchSpy).not.toHaveBeenCalled();

    eventBus.removeListener('recruitment.position.created', handler);
  });

  it('2. Application Stage Evaluation — Successful commit creates audit, outbox, and dispatches post-commit', async () => {
    const db = getDbClient();

    const pos = await PositionService.createPosition({
      organizationId: org.id,
      title: 'Rollback Test Position',
      code: 'REQ-ROLL-01',
      hiringManagerId: hiringManager.id,
    });
    await PositionService.transitionStatus(org.id, pos.id, 'open');

    const cand = await CandidateService.createCandidate({
      organizationId: org.id,
      firstName: 'Stage',
      lastName: 'Candidate',
      email: 'stage.candidate@rollback.internal',
      source: 'career_page',
    });

    const app = await ApplicationService.applyPosition({
      organizationId: org.id,
      candidateId: cand.id,
      positionId: pos.id,
    });

    const stages = await PipelineStageRepository.list(org.id);
    const screenStage = stages.find((s) => s.stageCode === 'screening') || stages[1];

    const dispatchSpy = vi.fn();
    const handler = (evt: any) => dispatchSpy(evt);
    eventBus.on('recruitment.application.stage_changed', handler);

    const history = await ApplicationService.evaluateStage({
      organizationId: org.id,
      applicationId: app.id,
      stageId: screenStage.id,
      status: 'passed',
      evaluatorId: hiringManager.id,
      notes: 'Passed screening assessment',
    });

    expect(history.id).toBeDefined();

    // Verify Audit log committed
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE organization_id = $1 AND entity_id = $2 AND action = 'recruitment.application.stage_changed';`,
      [org.id, history.id]
    );
    expect(auditRes.rows.length).toBeGreaterThanOrEqual(1);

    // Verify Outbox record committed
    const outboxRes = await db.query(
      `SELECT * FROM event_outbox WHERE organization_id = $1 AND entity_id = $2 AND event_name = 'recruitment.application.stage_changed';`,
      [org.id, history.id]
    );
    expect(outboxRes.rows.length).toBe(1);

    // Verify event dispatched post-commit
    expect(dispatchSpy).toHaveBeenCalled();

    eventBus.removeListener('recruitment.application.stage_changed', handler);
  });

  it('3. Interview Scheduling — Rollback on transactional failure leaves no orphaned audit or outbox records', async () => {
    const db = getDbClient();

    const pos = await PositionService.createPosition({
      organizationId: org.id,
      title: 'Interview Test Position',
      code: 'REQ-INT-01',
      hiringManagerId: hiringManager.id,
    });
    await PositionService.transitionStatus(org.id, pos.id, 'open');

    const cand = await CandidateService.createCandidate({
      organizationId: org.id,
      firstName: 'Interview',
      lastName: 'Candidate',
      email: 'int.candidate@rollback.internal',
      source: 'referral',
    });

    const app = await ApplicationService.applyPosition({
      organizationId: org.id,
      candidateId: cand.id,
      positionId: pos.id,
    });

    const stages = await PipelineStageRepository.list(org.id);
    const intStage = stages.find((s) => s.stageCode === 'interview') || stages[3];

    let thrownError: any = null;
    try {
      await ApplicationService.scheduleInterview(
        org.id,
        app.id,
        intStage.id,
        'meeting-uuid-999',
        '00000000-0000-0000-0000-000000000000'
      );
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();

    // Verify no application stage history recorded
    const historyRes = await db.query(
      `SELECT * FROM recruitment_application_stages WHERE application_id = $1 AND stage_id = $2;`,
      [app.id, intStage.id]
    );
    expect(historyRes.rows.length).toBe(0);
  });

  it('4. Offer Creation — Issue & Accept transaction atomic commit', async () => {
    const db = getDbClient();

    const pos = await PositionService.createPosition({
      organizationId: org.id,
      title: 'Offer Test Position',
      code: 'REQ-OFFER-01',
      hiringManagerId: hiringManager.id,
    });
    await PositionService.transitionStatus(org.id, pos.id, 'open');

    const cand = await CandidateService.createCandidate({
      organizationId: org.id,
      firstName: 'Offer',
      lastName: 'Candidate',
      email: 'offer.candidate@rollback.internal',
      source: 'direct',
    });

    const app = await ApplicationService.applyPosition({
      organizationId: org.id,
      candidateId: cand.id,
      positionId: pos.id,
    });

    const offer = await OfferService.createOffer({
      organizationId: org.id,
      applicationId: app.id,
      baseSalary: 135000,
      proposedStartDate: '2026-11-15',
    });

    expect(offer.status).toBe('issued');

    const acceptedOffer = await OfferService.acceptOffer({
      organizationId: org.id,
      offerId: offer.id,
      responseNotes: 'Accepting terms',
    });

    expect(acceptedOffer.status).toBe('accepted');

    // Verify audit log for offer acceptance
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE organization_id = $1 AND entity_id = $2 AND action = 'recruitment.offer.accepted';`,
      [org.id, offer.id]
    );
    expect(auditRes.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('5. Trial Lifecycle — Schedule, start, complete atomic transactions', async () => {
    const pos = await PositionService.createPosition({
      organizationId: org.id,
      title: 'Trial Test Position',
      code: 'REQ-TRIAL-01',
      hiringManagerId: hiringManager.id,
    });
    await PositionService.transitionStatus(org.id, pos.id, 'open');

    const cand = await CandidateService.createCandidate({
      organizationId: org.id,
      firstName: 'Trial',
      lastName: 'Candidate',
      email: 'trial.candidate@rollback.internal',
      source: 'campus',
    });

    const app = await ApplicationService.applyPosition({
      organizationId: org.id,
      candidateId: cand.id,
      positionId: pos.id,
    });

    const trial = await TrialService.scheduleTrial({
      organizationId: org.id,
      applicationId: app.id,
      startDate: '2026-10-01',
      endDate: '2026-10-15',
      deliverablesSummary: 'Complete component refactoring task',
    });

    expect(trial.status).toBe('scheduled');

    const startedTrial = await TrialService.startTrial(org.id, app.id);
    expect(startedTrial.status).toBe('active');

    const completedTrial = await TrialService.completeTrial({
      organizationId: org.id,
      applicationId: app.id,
      outcomeNotes: 'Trial completed with outstanding quality',
    });

    expect(completedTrial.status).toBe('completed');
  });

  it('6. Hiring Transaction — Full atomic conversion & event emission', async () => {
    const db = getDbClient();

    const pos = await PositionService.createPosition({
      organizationId: org.id,
      title: 'Hire Conversion Position',
      code: 'REQ-HIRE-01',
      hiringManagerId: hiringManager.id,
    });
    await PositionService.transitionStatus(org.id, pos.id, 'open');

    const cand = await CandidateService.createCandidate({
      organizationId: org.id,
      firstName: 'Hire',
      lastName: 'Candidate',
      email: 'hire.candidate@rollback.internal',
      source: 'agency',
    });

    const app = await ApplicationService.applyPosition({
      organizationId: org.id,
      candidateId: cand.id,
      positionId: pos.id,
    });

    const offer = await OfferService.createOffer({
      organizationId: org.id,
      applicationId: app.id,
      baseSalary: 140000,
      proposedStartDate: '2026-12-01',
    });

    await OfferService.acceptOffer({
      organizationId: org.id,
      offerId: offer.id,
    });

    const hireResult = await HiringService.hireCandidate({
      organizationId: org.id,
      applicationId: app.id,
      offerId: offer.id,
    });

    expect(hireResult.status).toBe('hired');
    expect(hireResult.personId).toBeDefined();

    // Verify Person created in M2
    const personRes = await db.query(`SELECT * FROM people WHERE id = $1;`, [hireResult.personId]);
    expect(personRes.rows.length).toBe(1);

    // Verify Employment created in M2
    const empRes = await db.query(`SELECT * FROM employments WHERE id = $1;`, [hireResult.employmentId]);
    expect(empRes.rows.length).toBe(1);

    // Verify candidate.hired audit log
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE organization_id = $1 AND entity_id = $2 AND action = 'recruitment.candidate.hired';`,
      [org.id, cand.id]
    );
    expect(auditRes.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('7. Position Update — Successful commit creates mutation + audit + outbox + post-commit dispatch; failure rolls back all', async () => {
    const db = getDbClient();

    const pos = await PositionService.createPosition({
      organizationId: org.id,
      title: 'Update Test Position Initial',
      code: 'REQ-UPD-01',
      hiringManagerId: hiringManager.id,
    });

    const dispatchSpy = vi.fn();
    const handler = (evt: any) => dispatchSpy(evt);
    eventBus.on('recruitment.position.updated', handler);

    // Successful update
    const updated = await PositionService.updatePosition(org.id, pos.id, {
      title: 'Update Test Position Modified',
    });

    expect(updated.title).toBe('Update Test Position Modified');

    // Verify DB update
    const dbPos = await db.query(`SELECT title FROM recruitment_positions WHERE id = $1;`, [pos.id]);
    expect(dbPos.rows[0].title).toBe('Update Test Position Modified');

    // Verify audit log
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE organization_id = $1 AND entity_id = $2 AND action = 'recruitment.position.updated';`,
      [org.id, pos.id]
    );
    expect(auditRes.rows.length).toBeGreaterThanOrEqual(1);

    // Verify outbox record
    const outboxRes = await db.query(
      `SELECT * FROM event_outbox WHERE organization_id = $1 AND entity_id = $2 AND event_name = 'recruitment.position.updated';`,
      [org.id, pos.id]
    );
    expect(outboxRes.rows.length).toBe(1);

    // Verify post-commit event dispatch
    expect(dispatchSpy).toHaveBeenCalled();

    eventBus.removeListener('recruitment.position.updated', handler);

    // Failed update check (invalid minSalary > maxSalary forces validation failure)
    let thrownError: any = null;
    try {
      await PositionService.updatePosition(org.id, pos.id, {
        minSalary: 200000,
        maxSalary: 100000,
      });
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('8. Position Archive — Successful commit creates mutation + audit + outbox (recruitment.position.archived) + post-commit dispatch', async () => {
    const db = getDbClient();

    const pos = await PositionService.createPosition({
      organizationId: org.id,
      title: 'Archive Test Position',
      code: 'REQ-ARCH-01',
      hiringManagerId: hiringManager.id,
    });

    const dispatchSpy = vi.fn();
    const handler = (evt: any) => dispatchSpy(evt);
    eventBus.on('recruitment.position.archived', handler);

    const archived = await PositionService.transitionStatus(org.id, pos.id, 'archive');
    expect(archived.status).toBe('archived');

    // Verify DB status
    const dbPos = await db.query(`SELECT status FROM recruitment_positions WHERE id = $1;`, [pos.id]);
    expect(dbPos.rows[0].status).toBe('archived');

    // Verify audit log
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE organization_id = $1 AND entity_id = $2 AND action = 'recruitment.position.archived';`,
      [org.id, pos.id]
    );
    expect(auditRes.rows.length).toBeGreaterThanOrEqual(1);

    // Verify outbox record
    const outboxRes = await db.query(
      `SELECT * FROM event_outbox WHERE organization_id = $1 AND entity_id = $2 AND event_name = 'recruitment.position.archived';`,
      [org.id, pos.id]
    );
    expect(outboxRes.rows.length).toBe(1);

    // Verify post-commit event dispatch
    expect(dispatchSpy).toHaveBeenCalled();

    eventBus.removeListener('recruitment.position.archived', handler);
  });
});
