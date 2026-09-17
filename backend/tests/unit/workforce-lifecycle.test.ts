import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runMigrations, closeDb, getDbClient } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { EmploymentService } from '../../src/modules/people/application/employment.service.js';
import { WorkforceService } from '../../src/modules/workforce/application/workforce.service.js';
import { WorkforceRepository } from '../../src/modules/workforce/infrastructure/workforce.repository.js';
import { WorkforceEventConsumer } from '../../src/modules/workforce/application/consumer/workforce.event.consumer.js';
import { EventRegistryService } from '../../src/events/event-registry.js';
import { eventBus, DomainEventPayload } from '../../src/events/event-bus.js';

describe('Milestone 14 — Workforce Onboarding & Lifecycle Unit Tests', () => {
  let orgA: any;
  let orgB: any;
  let personA: any;
  let employmentA: any;
  let adminPersonA: any;
  let workforceService: WorkforceService;
  let workforceRepo: WorkforceRepository;
  let workforceConsumer: WorkforceEventConsumer;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
    await EventRegistryService.seedEventRegistry();

    workforceRepo = new WorkforceRepository();
    workforceService = new WorkforceService(workforceRepo);
    workforceConsumer = new WorkforceEventConsumer(workforceService, workforceRepo);

    const bootA = await OrganizationService.bootstrapOrganization({
      name: 'Workforce Unit Org A',
      slug: 'wf-unit-org-a',
      adminEmail: 'admin-a@wfunit.internal',
      adminPassword: 'Password123!',
      adminFullName: 'WF Unit Admin A',
    });
    orgA = bootA.organization;

    const bootB = await OrganizationService.bootstrapOrganization({
      name: 'Workforce Unit Org B',
      slug: 'wf-unit-org-b',
      adminEmail: 'admin-b@wfunit.internal',
      adminPassword: 'Password123!',
      adminFullName: 'WF Unit Admin B',
    });
    orgB = bootB.organization;

    adminPersonA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Admin',
      lastName: 'Approver',
      email: 'approver@wfunit.internal',
    });

    personA = await PeopleService.createPerson(orgA.id, {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob.smith@wfunit.internal',
    });

    employmentA = await EmploymentService.createEmployment(orgA.id, {
      personId: personA.id,
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'Backend Engineer',
      startDate: new Date(),
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('1. M13 -> M14 Event Consumer (recruitment.candidate.hired)', () => {
    it('resolves existing Person & Employment without creating new Employment or shadow Person', async () => {
      const db = getDbClient();
      const initialPeopleCount = (await db.query(`SELECT COUNT(*) FROM people WHERE organization_id = $1`, [orgA.id])).rows[0].count;
      const initialEmpCount = (await db.query(`SELECT COUNT(*) FROM employments WHERE organization_id = $1`, [orgA.id])).rows[0].count;

      const eventPayload: DomainEventPayload = {
        eventId: '00000000-0000-0000-0000-000000000010',
        eventType: 'recruitment.candidate.hired',
        organizationId: orgA.id,
        timestamp: new Date().toISOString(),
        payload: {
          candidateId: '00000000-0000-0000-0000-000000000001',
          personId: personA.id,
          employmentId: employmentA.id,
          positionTitle: 'Backend Engineer',
          hiredAt: new Date().toISOString(),
        },
      };

      const plan = await workforceConsumer.handleCandidateHired(eventPayload);

      expect(plan).toBeDefined();
      expect(plan?.organizationId).toBe(orgA.id);
      expect(plan?.personId).toBe(personA.id);
      expect(plan?.employmentId).toBe(employmentA.id);
      expect(plan?.status).toBe('initiated');

      // Verify no duplicate Person or Employment was created
      const finalPeopleCount = (await db.query(`SELECT COUNT(*) FROM people WHERE organization_id = $1`, [orgA.id])).rows[0].count;
      const finalEmpCount = (await db.query(`SELECT COUNT(*) FROM employments WHERE organization_id = $1`, [orgA.id])).rows[0].count;

      expect(finalPeopleCount).toBe(initialPeopleCount);
      expect(finalEmpCount).toBe(initialEmpCount);
    });

    it('is idempotent on duplicate event delivery', async () => {
      const db = getDbClient();
      const initialPlansCount = (await db.query(`SELECT COUNT(*) FROM workforce_onboarding_plans WHERE organization_id = $1`, [orgA.id])).rows[0].count;

      const eventPayload: DomainEventPayload = {
        eventId: '00000000-0000-0000-0000-000000000011',
        eventType: 'recruitment.candidate.hired',
        organizationId: orgA.id,
        timestamp: new Date().toISOString(),
        payload: {
          candidateId: '00000000-0000-0000-0000-000000000001',
          personId: personA.id,
          employmentId: employmentA.id,
          positionTitle: 'Backend Engineer',
          hiredAt: new Date().toISOString(),
        },
      };

      // Call handleCandidateHired again with same payload
      const secondPlan = await workforceConsumer.handleCandidateHired(eventPayload);
      expect(secondPlan).toBeDefined();
      expect(secondPlan?.personId).toBe(personA.id);

      const finalPlansCount = (await db.query(`SELECT COUNT(*) FROM workforce_onboarding_plans WHERE organization_id = $1`, [orgA.id])).rows[0].count;
      expect(finalPlansCount).toBe(initialPlansCount);
    });
  });

  describe('2. Transfer Lifecycle & Transitions', () => {
    it('creates transfer in draft and transitions to approved', async () => {
      const transfer = await workforceService.transferEmployee({
        organizationId: orgA.id,
        employmentId: employmentA.id,
        personId: personA.id,
        reason: 'Internal Mobility',
        effectiveDate: '2026-11-01',
      });

      expect(transfer.status).toBe('draft');
      expect(transfer.organizationId).toBe(orgA.id);

      const approved = await workforceService.approveTransfer(
        {
          organizationId: orgA.id,
          transferId: transfer.id,
          status: 'approved',
          notes: 'Approved by management',
          approvedBy: adminPersonA.id,
        },
        adminPersonA.id
      );

      expect(approved.status).toBe('approved');
    });

    it('fails on invalid status transition', async () => {
      const transfer = await workforceService.transferEmployee({
        organizationId: orgA.id,
        employmentId: employmentA.id,
        personId: personA.id,
        reason: 'Temporary Transfer',
        effectiveDate: '2026-11-15',
      });

      // Approve it into terminal state
      await workforceService.approveTransfer(
        {
          organizationId: orgA.id,
          transferId: transfer.id,
          status: 'approved',
        },
        adminPersonA.id
      );

      // Cannot transition transfer from terminal approved state
      await expect(
        workforceService.approveTransfer(
          {
            organizationId: orgA.id,
            transferId: transfer.id,
            status: 'approved',
          },
          adminPersonA.id
        )
      ).rejects.toThrow(/Cannot transition transfer from terminal state/i);
    });
  });

  describe('3. Promotion Lifecycle & Employment Integration', () => {
    it('creates promotion and updates employment jobTitle on approval', async () => {
      const promotion = await workforceService.promoteEmployee({
        organizationId: orgA.id,
        employmentId: employmentA.id,
        personId: personA.id,
        sourceJobTitle: 'Backend Engineer',
        targetJobTitle: 'Staff Backend Engineer',
        reason: 'Exceptional architectural delivery',
        effectiveDate: '2026-12-01',
      });

      expect(promotion.status).toBe('draft');

      const approved = await workforceService.approvePromotion(
        {
          organizationId: orgA.id,
          promotionId: promotion.id,
          status: 'approved',
          notes: 'Well deserved',
          approvedBy: adminPersonA.id,
        },
        adminPersonA.id
      );

      expect(approved.status).toBe('approved');

      // Verify Employment jobTitle was updated
      const updatedEmp = await EmploymentService.getEmployment(orgA.id, employmentA.id);
      expect(updatedEmp.jobTitle).toBe('Staff Backend Engineer');
    });
  });

  describe('4. Offboarding Lifecycle & Financial Obligation Validation', () => {
    let offboarding: any;

    it('cross-tenant financial obligation verification throws 404', async () => {
      offboarding = await workforceService.initiateOffboarding({
        organizationId: orgA.id,
        employmentId: employmentA.id,
        personId: personA.id,
        exitReason: 'resignation',
        exitDate: '2026-12-31',
        notes: 'Notice period served',
      });

      expect(offboarding.status).toBe('initiated');

      const clearances = await workforceRepo.listClearancesByOffboarding(orgA.id, offboarding.id);
      const finClearance = clearances.find((c) => c.clearanceType === 'financial_settlement');
      expect(finClearance).toBeDefined();

      const db = getDbClient();
      // Insert party and category in Org B
      const catRes = await db.query(
        `INSERT INTO finance_categories (organization_id, name, code, category_type)
         VALUES ($1, 'Org B Category', 'OBCAT', 'expense')
         RETURNING id;`,
        [orgB.id]
      );
      const partyRes = await db.query(
        `INSERT INTO financial_parties (organization_id, party_type, name)
         VALUES ($1, 'vendor', 'Org B Vendor')
         RETURNING id;`,
        [orgB.id]
      );

      // Insert financial obligation in Org B
      const foRes = await db.query(
        `INSERT INTO financial_obligations (organization_id, party_id, category_id, direction, title, state)
         VALUES ($1, $2, $3, 'payable', 'Org B Obligation', 'Draft')
         RETURNING id;`,
        [orgB.id, partyRes.rows[0].id, catRes.rows[0].id]
      );
      const orgBObligationId = foRes.rows[0].id;

      // Verifying Org A clearance with Org B financial obligation must throw 404
      await expect(
        workforceService.verifyFinancialClearance(
          orgA.id,
          finClearance!.id,
          orgBObligationId,
          adminPersonA.id,
          'Attempted cross-tenant clearance'
        )
      ).rejects.toThrow(/not found/i);
    });

    it('completes offboarding and transitions M2 employment to resigned', async () => {
      const completed = await workforceService.completeOffboarding(
        {
          organizationId: orgA.id,
          offboardingId: offboarding.id,
          notes: 'All handovers and access revocations confirmed',
        },
        adminPersonA.id
      );

      expect(completed.status).toBe('completed');

      const terminalEmp = await EmploymentService.getEmployment(orgA.id, employmentA.id);
      expect(terminalEmp.status).toBe('resigned');
    });
  });

  describe('5. Transaction Rollback & Outbox Conformance', () => {
    it('rolls back database modifications and stages zero outbox records on failure', async () => {
      const db = getDbClient();
      const initialOutboxCount = (await db.query(`SELECT COUNT(*) FROM event_outbox WHERE organization_id = $1`, [orgA.id])).rows[0].count;

      const eventSpy = vi.fn();
      eventBus.on('workforce.transfer.created', eventSpy);

      // Attempt to create a transfer with an invalid/nonexistent employment
      let thrown: any = null;
      try {
        await workforceService.transferEmployee({
          organizationId: orgA.id,
          employmentId: '00000000-0000-0000-0000-000000000099', // Nonexistent
          personId: personA.id,
          reason: 'Will fail',
          effectiveDate: '2026-12-31',
        });
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeDefined();

      // Ensure no outbox event was recorded
      const finalOutboxCount = (await db.query(`SELECT COUNT(*) FROM event_outbox WHERE organization_id = $1`, [orgA.id])).rows[0].count;
      expect(finalOutboxCount).toBe(initialOutboxCount);

      // Ensure no event was dispatched to eventBus
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });
});
