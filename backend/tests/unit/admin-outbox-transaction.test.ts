import { describe, it, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { eventBus, DomainEventPayload } from '../../src/events/event-bus.js';
import { getDbClient, withTransaction } from '../../src/database/index.js';
import { runMigrations } from '../../src/database/migrate.js';
import { OutboxService } from '../../src/events/outbox.service.js';
import { AuditService } from '../../src/audit/audit.service.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { PeopleService } from '../../src/modules/people/application/people.service.js';
import { OrganizationAdminService } from '../../src/modules/admin/application/organization-admin.service.js';
import { PlatformAdminService } from '../../src/modules/admin/application/platform-admin.service.js';
import { SettingsService } from '../../src/modules/admin/application/settings.service.js';

describe('Milestone 12 — Event Transaction Semantics & Outbox Invariants', () => {
  let testOrgId: string;
  let adminUserId: string;
  let memberUserId: string;
  let testPersonId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Event Invariant Org',
      slug: 'event-invariant-org',
      adminEmail: 'admin@event-inv.test',
      adminPassword: 'Password123!',
      adminFullName: 'Invariant Admin',
    });
    testOrgId = boot.organization.id;

    const adminLogin = await AuthService.login('admin@event-inv.test', 'Password123!');
    adminUserId = adminLogin.user.id;

    const member = await AuthService.createUser({
      email: 'member@event-inv.test',
      password: 'Password123!',
      fullName: 'Invariant Member',
    });
    memberUserId = member.id;

    await OrganizationService.addMembership(testOrgId, {
      userEmail: member.email,
      role: 'org_member',
    });

    const person = await PeopleService.createPerson(
      testOrgId,
      { firstName: 'Grace', lastName: 'Hopper', email: 'grace.hopper@event-inv.test' },
      adminUserId
    );
    testPersonId = person.id;
  });

  describe('1. Rollback Invariant — Transaction rollback produces ZERO eventBus dispatches', () => {
    it('does NOT publish event to eventBus when Person-User linking transaction rolls back', async () => {
      const db = getDbClient();
      let eventPublished = false;

      const listener = () => {
        eventPublished = true;
      };
      eventBus.on('person.user_linked', listener);

      // Attempt linking inside a transaction that fails before commit
      await expect(
        withTransaction(async (txClient) => {
          await txClient.query(
            `UPDATE people SET user_id = $1 WHERE id = $2 AND organization_id = $3;`,
            [memberUserId, testPersonId, testOrgId]
          );

          await AuditService.recordLog({
            organizationId: testOrgId,
            actorId: adminUserId,
            action: 'PERSON_USER_LINKED',
            entityType: 'person',
            entityId: testPersonId,
            payload: { testPersonId, memberUserId },
            dbClient: txClient,
          });

          await OutboxService.stageOutboxEvent({
            organizationId: testOrgId,
            eventName: 'person.user_linked',
            entityType: 'person',
            entityId: testPersonId,
            actorId: adminUserId,
            payload: { organizationId: testOrgId, personId: testPersonId, userId: memberUserId },
            dbClient: txClient,
          });

          // Simulate mid-transaction business rule failure or unexpected DB crash
          throw new Error('Simulated abort before transaction commit');
        })
      ).rejects.toThrow('Simulated abort before transaction commit');

      eventBus.off('person.user_linked', listener);

      // INVARIANT 1: EventBus MUST NOT have received the event
      expect(eventPublished).toBe(false);

      // INVARIANT 2: No outbox event persisted in DB
      const outboxCheck = await db.query(
        `SELECT * FROM event_outbox WHERE entity_id = $1 AND event_name = 'person.user_linked';`,
        [testPersonId]
      );
      expect(outboxCheck.rows).toHaveLength(0);

      // INVARIANT 3: No audit log persisted in DB
      const auditCheck = await db.query(
        `SELECT * FROM audit_logs WHERE entity_id = $1 AND action = 'PERSON_USER_LINKED';`,
        [testPersonId]
      );
      expect(auditCheck.rows).toHaveLength(0);

      // INVARIANT 4: Domain entity remained unmutated
      const personCheck = await db.query<any>(`SELECT user_id FROM people WHERE id = $1;`, [testPersonId]);
      expect(personCheck.rows[0].user_id).toBeNull();
    });

    it('does NOT publish event to eventBus when Organization provisioning fails/rolls back', async () => {
      const db = getDbClient();
      let eventPublished = false;

      const listener = () => {
        eventPublished = true;
      };
      eventBus.on('organization.provisioned', listener);

      // Trigger provisioning failure by using an already existing slug ('event-invariant-org')
      await expect(
        PlatformAdminService.provisionOrganization({
          name: 'Duplicate Slug Org',
          slug: 'event-invariant-org',
          adminEmail: 'fail.admin@test.com',
          adminFullName: 'Fail Admin',
        })
      ).rejects.toThrow();

      eventBus.off('organization.provisioned', listener);

      // INVARIANT: EventBus received NO event
      expect(eventPublished).toBe(false);

      // Outbox check
      const outboxCheck = await db.query(
        `SELECT * FROM event_outbox WHERE payload->>'slug' = 'event-invariant-org' AND actor_id != $1;`,
        [adminUserId]
      );
      expect(outboxCheck.rows).toHaveLength(0);
    });
  });

  describe('2. Commit Invariant — Event is dispatched to eventBus only AFTER transaction commits', () => {
    it('dispatches event to eventBus post-commit for Person-User linking', async () => {
      const db = getDbClient();
      let capturedEvent: DomainEventPayload | null = null;

      const listener = (evt: DomainEventPayload) => {
        capturedEvent = evt;
      };
      eventBus.on('person.user_linked', listener);

      const result = await OrganizationAdminService.linkUserToPerson(
        testOrgId,
        testPersonId,
        memberUserId,
        adminUserId
      );

      eventBus.off('person.user_linked', listener);

      // INVARIANT 1: Linking completed successfully
      expect(result.personId).toBe(testPersonId);
      expect(result.userId).toBe(memberUserId);

      // INVARIANT 2: Event was received by eventBus subscriber
      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.eventName).toBe('person.user_linked');
      expect((capturedEvent as any)?.entityId).toBe(testPersonId);
      expect(capturedEvent?.organizationId).toBe(testOrgId);

      // INVARIANT 3: Outbox record in DB is marked 'Dispatched'
      const outboxCheck = await db.query<any>(
        `SELECT * FROM event_outbox WHERE entity_id = $1 AND event_name = 'person.user_linked';`,
        [testPersonId]
      );
      expect(outboxCheck.rows).toHaveLength(1);
      expect(outboxCheck.rows[0].status).toBe('Dispatched');
      expect(outboxCheck.rows[0].dispatched_at).not.toBeNull();
    });

    it('dispatches event to eventBus post-commit for Organization Settings update', async () => {
      const db = getDbClient();
      let capturedEvent: DomainEventPayload | null = null;

      const listener = (evt: DomainEventPayload) => {
        capturedEvent = evt;
      };
      eventBus.on('organization.settings_updated', listener);

      const updated = await SettingsService.updateSettings(testOrgId, {
        timezone: 'Europe/London',
        currency: 'GBP',
        actorId: adminUserId,
      });

      eventBus.off('organization.settings_updated', listener);

      // INVARIANT 1: Settings updated
      expect(updated.timezone).toBe('Europe/London');
      expect(updated.currency).toBe('GBP');

      // INVARIANT 2: Event was dispatched post-commit
      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.eventName).toBe('organization.settings_updated');
      expect(capturedEvent?.organizationId).toBe(testOrgId);

      // INVARIANT 3: Outbox record marked 'Dispatched'
      const outboxCheck = await db.query<any>(
        `SELECT * FROM event_outbox WHERE organization_id = $1 AND event_name = 'organization.settings_updated' ORDER BY created_at DESC LIMIT 1;`,
        [testOrgId]
      );
      expect(outboxCheck.rows).toHaveLength(1);
      expect(outboxCheck.rows[0].status).toBe('Dispatched');
    });

    it('dispatches event to eventBus post-commit for Organization Provisioning', async () => {
      const db = getDbClient();
      let capturedEvent: DomainEventPayload | null = null;

      const listener = (evt: DomainEventPayload) => {
        capturedEvent = evt;
      };
      eventBus.on('organization.provisioned', listener);

      const provisioned = await PlatformAdminService.provisionOrganization({
        name: 'Post Commit Verification Org',
        slug: 'post-commit-verification-org',
        adminEmail: 'postcommit.admin@devoc.test',
        adminFullName: 'Post Commit Admin',
        actorId: adminUserId,
      });

      eventBus.off('organization.provisioned', listener);

      // INVARIANT 1: Provisioning succeeded
      expect(provisioned.organization.id).toBeDefined();

      // INVARIANT 2: Event was dispatched to eventBus post-commit
      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.eventName).toBe('organization.provisioned');
      expect(capturedEvent?.organizationId).toBe(provisioned.organization.id);

      // INVARIANT 3: Outbox record marked 'Dispatched'
      const outboxCheck = await db.query<any>(
        `SELECT * FROM event_outbox WHERE organization_id = $1 AND event_name = 'organization.provisioned';`,
        [provisioned.organization.id]
      );
      expect(outboxCheck.rows).toHaveLength(1);
      expect(outboxCheck.rows[0].status).toBe('Dispatched');
    });
  });
});
