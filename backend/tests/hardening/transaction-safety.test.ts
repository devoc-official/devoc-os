import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runMigrations, closeDb, getDbClient, withTransaction } from '../../src/database/index.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { OutboxService } from '../../src/events/outbox.service.js';

describe('System Hardening — Transaction Atomicity & Outbox Invariants', () => {
  let org: any;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'Tx Safety Org',
      slug: 'tx-safety-org',
      adminEmail: 'admin@tx-safety.internal',
      adminPassword: 'Password123!',
      adminFullName: 'Admin Tx',
    });
    org = boot.organization;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. withTransaction rolls back state mutations and outbox records on error', async () => {
    const db = getDbClient();
    const branchName = 'Rollback Branch Test';

    let errorThrown = false;
    try {
      await withTransaction(async (tx) => {
        // 1. Insert branch in transaction
        await tx.query(
          `INSERT INTO branches (organization_id, name, code)
           VALUES ($1, $2, 'BR-ROLLBACK-1');`,
          [org.id, branchName]
        );

        // 2. Stage outbox event in transaction
        await OutboxService.stageOutboxEvent(
          {
            organizationId: org.id,
            eventName: 'branch.created',
            entityType: 'branch',
            entityId: '00000000-0000-0000-0000-000000000001',
            payload: { name: branchName },
          },
          tx
        );

        // 3. Deliberately fail transaction
        throw new Error('Simulated domain invariant violation');
      });
    } catch (err: any) {
      errorThrown = true;
      expect(err.message).toBe('Simulated domain invariant violation');
    }

    expect(errorThrown).toBe(true);

    // Verify branch was NOT persisted
    const branchCheck = await db.query(
      `SELECT id FROM branches WHERE organization_id = $1 AND name = $2;`,
      [org.id, branchName]
    );
    expect(branchCheck.rows.length).toBe(0);

    // Verify outbox event was NOT persisted
    const outboxCheck = await db.query(
      `SELECT id FROM event_outbox WHERE organization_id = $1 AND event_name = 'branch.created';`,
      [org.id]
    );
    expect(outboxCheck.rows.length).toBe(0);
  });

  it('2. withTransaction atomically commits mutations and outbox records on success', async () => {
    const db = getDbClient();
    const branchName = 'Committed Branch Test';

    await withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO branches (organization_id, name, code)
         VALUES ($1, $2, 'BR-COMMIT-1');`,
        [org.id, branchName]
      );

      await OutboxService.stageOutboxEvent(
        {
          organizationId: org.id,
          eventName: 'branch.created',
          entityType: 'branch',
          entityId: '00000000-0000-0000-0000-000000000002',
          payload: { name: branchName },
        },
        tx
      );
    });

    const branchCheck = await db.query(
      `SELECT id FROM branches WHERE organization_id = $1 AND name = $2;`,
      [org.id, branchName]
    );
    expect(branchCheck.rows.length).toBe(1);

    const outboxCheck = await db.query(
      `SELECT id FROM event_outbox WHERE organization_id = $1 AND event_name = 'branch.created';`,
      [org.id]
    );
    expect(outboxCheck.rows.length).toBe(1);
  });
});
