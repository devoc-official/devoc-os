import { describe, it, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { redactPayload } from '../../src/audit/redaction.js';
import { eventBus, DomainEventPayload } from '../../src/events/event-bus.js';
import { getDbClient, withTransaction } from '../../src/database/index.js';
import { runMigrations } from '../../src/database/migrate.js';
import { OutboxService } from '../../src/events/outbox.service.js';
import { AuditService } from '../../src/audit/audit.service.js';

describe('Milestone 10 — Audit & Events Hardening Unit & Conformance Tests', () => {
  let testOrgId: string;

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    testOrgId = uuidv4();
    const db = getDbClient();
    await db.query(
      `INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;`,
      [testOrgId, 'M10 Unit Org', `m10-unit-${testOrgId.substring(0, 8)}`]
    );
  });

  it('1. Redaction — scrubs sensitive keys (password, token, secret, apiKey, creditCard, authHeader)', () => {
    const rawPayload = {
      title: 'User Login',
      password: 'superSecretPassword123',
      token: 'jwt-bearer-token-abc',
      nested: {
        apiKey: 'sk-1234567890',
        creditCard: '4111-2222-3333-4444',
        regularField: 'safeValue',
      },
    };

    const redacted = redactPayload(rawPayload);

    expect(redacted.title).toBe('User Login');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.nested.apiKey).toBe('[REDACTED]');
    expect(redacted.nested.creditCard).toBe('[REDACTED]');
    expect(redacted.nested.regularField).toBe('safeValue');
  });

  it('2. Redaction — truncates payloads exceeding 64KB size limit', () => {
    const hugeArray = new Array(2000).fill('Very Long Text Payload String Segment Requiring Serialization Truncation');
    const hugePayload = {
      largeData: hugeArray,
    };

    const result: any = redactPayload(hugePayload);

    expect(result._truncated).toBe(true);
    expect(result.summary).toContain('exceeding 64KB');
  });

  it('3. Event Bus — attaches canonical event envelope defaults (eventId, version, occurredAt)', () => {
    let capturedEvent: DomainEventPayload | null = null;
    const testEntityId = uuidv4();

    const subscriber = (evt: DomainEventPayload) => {
      capturedEvent = evt;
    };

    eventBus.on('unit.test.event', subscriber);

    eventBus.publish({
      eventName: 'unit.test.event',
      organizationId: testOrgId,
      entityType: 'unit_entity',
      entityId: testEntityId,
      payload: { key: 'value' },
    });

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent?.eventId).toBeDefined();
    expect(capturedEvent?.version).toBe('1.0');
    expect(capturedEvent?.occurredAt).toBeDefined();
    expect(capturedEvent?.organizationId).toBe(testOrgId);

    eventBus.off('unit.test.event', subscriber);
  });

  it('4. Outbox Post-Commit Architecture — transaction rollback produces zero event dispatch and zero DB records', async () => {
    const db = getDbClient();
    let eventDispatched = false;

    const listener = () => {
      eventDispatched = true;
    };
    eventBus.on('rollback.test.event', listener);

    const entityId = uuidv4();

    await expect(
      withTransaction(async (tx) => {
        await AuditService.recordLog({
          organizationId: testOrgId,
          action: 'TEST_ROLLBACK',
          entityType: 'test_entity',
          entityId,
          dbClient: tx,
        });

        await OutboxService.stageOutboxEvent({
          organizationId: testOrgId,
          eventName: 'rollback.test.event',
          entityType: 'test_entity',
          entityId,
          dbClient: tx,
        });

        throw new Error('Simulated transaction failure before commit');
      })
    ).rejects.toThrow('Simulated transaction failure before commit');

    eventBus.off('rollback.test.event', listener);

    expect(eventDispatched).toBe(false);

    // Verify outbox record does not exist
    const outboxRes = await db.query(`SELECT * FROM event_outbox WHERE entity_id = $1;`, [entityId]);
    expect(outboxRes.rows).toHaveLength(0);

    // Verify audit record does not exist
    const auditRes = await db.query(`SELECT * FROM audit_logs WHERE entity_id = $1;`, [entityId]);
    expect(auditRes.rows).toHaveLength(0);
  });

  it('5. Outbox Post-Commit Architecture — successful commit followed by immediate dispatch', async () => {
    const db = getDbClient();
    let capturedEvent: DomainEventPayload | null = null;

    const listener = (evt: DomainEventPayload) => {
      capturedEvent = evt;
    };
    eventBus.on('commit.test.event', listener);

    const entityId = uuidv4();

    const { outboxRecord } = await withTransaction(async (tx) => {
      await AuditService.recordLog({
        organizationId: testOrgId,
        action: 'TEST_COMMIT',
        entityType: 'test_entity',
        entityId,
        dbClient: tx,
      });

      const outboxRecord = await OutboxService.stageOutboxEvent({
        organizationId: testOrgId,
        eventName: 'commit.test.event',
        entityType: 'test_entity',
        entityId,
        payload: { committed: true },
        dbClient: tx,
      });

      return { outboxRecord };
    });

    // Before immediate dispatch, outbox status is 'Pending' and eventBus has not emitted
    expect(outboxRecord.status).toBe('Pending');
    expect(capturedEvent).toBeNull();

    // Perform post-commit immediate dispatch
    const dispatched = await OutboxService.dispatchImmediate(outboxRecord);
    expect(dispatched).toBe(true);

    eventBus.off('commit.test.event', listener);

    // After post-commit dispatch, subscriber received event and DB record status is 'Dispatched'
    expect(capturedEvent).not.toBeNull();
    expect((capturedEvent as any)?.entityId).toBe(entityId);

    const updatedOutbox = await OutboxService.getEventById(testOrgId, outboxRecord.id);
    expect(updatedOutbox.status).toBe('Dispatched');
  });

  it('6. Background Worker Recovery — processes pending/failed outbox events', async () => {
    const db = getDbClient();
    const entityId = uuidv4();

    // Stage outbox event without calling immediate dispatch (simulating crash post-commit)
    const staged = await OutboxService.stageOutboxEvent({
      organizationId: testOrgId,
      eventName: 'recovery.test.event',
      entityType: 'test_entity',
      entityId,
      payload: { crashRecovered: true },
    });

    expect(staged.status).toBe('Pending');

    let capturedEvent: DomainEventPayload | null = null;
    const listener = (evt: DomainEventPayload) => {
      capturedEvent = evt;
    };
    eventBus.on('recovery.test.event', listener);

    // Run background outbox poller worker
    const processedCount = await OutboxService.processPendingOutboxEvents(10);
    expect(processedCount).toBeGreaterThanOrEqual(1);

    eventBus.off('recovery.test.event', listener);

    expect(capturedEvent).not.toBeNull();

    const updatedOutbox = await OutboxService.getEventById(testOrgId, staged.id);
    expect(updatedOutbox.status).toBe('Dispatched');
  });

  it('7. Consumer Idempotency — prevents duplicate consumer processing and handles failures safely', async () => {
    const stagedEvent = await OutboxService.stageOutboxEvent({
      organizationId: testOrgId,
      eventName: 'idempotency.test.event',
      entityType: 'test_entity',
      entityId: uuidv4(),
    });
    const eventId = stagedEvent.id;

    const consumerName = 'test-idempotent-consumer';
    let executionCount = 0;

    const handler = async (tx: any) => {
      executionCount++;
      return { success: true };
    };

    // First execution -> succeeds
    const firstRes = await OutboxService.executeConsumerWithIdempotency(
      testOrgId,
      eventId,
      consumerName,
      handler
    );
    expect(firstRes.executed).toBe(true);
    expect(executionCount).toBe(1);

    // Second execution with same eventId and consumerName -> skipped
    const secondRes = await OutboxService.executeConsumerWithIdempotency(
      testOrgId,
      eventId,
      consumerName,
      handler
    );
    expect(secondRes.executed).toBe(false);
    expect(executionCount).toBe(1);

    // Consumer failure scenario -> handler throws error
    const failedStagedEvent = await OutboxService.stageOutboxEvent({
      organizationId: testOrgId,
      eventName: 'idempotency.failure.test.event',
      entityType: 'test_entity',
      entityId: uuidv4(),
    });
    const failedEventId = failedStagedEvent.id;
    let failedAttempts = 0;

    const failingHandler = async (tx: any) => {
      failedAttempts++;
      throw new Error('Transient consumer error');
    };

    await expect(
      OutboxService.executeConsumerWithIdempotency(testOrgId, failedEventId, consumerName, failingHandler)
    ).rejects.toThrow('Transient consumer error');
    expect(failedAttempts).toBe(1);

    // Verify event_consumer_records does NOT mark it processed, allowing retry
    const isProcessed = await OutboxService.isEventProcessedByConsumer(failedEventId, consumerName);
    expect(isProcessed).toBe(false);

    // Retry succeeded handler on same failedEventId -> now succeeds
    const retryRes = await OutboxService.executeConsumerWithIdempotency(
      testOrgId,
      failedEventId,
      consumerName,
      handler
    );
    expect(retryRes.executed).toBe(true);
  });

  it('8. Event Registry Versioning — supports unique (event_name, version) constraint', async () => {
    const db = getDbClient();
    const eventName = 'test.versioned.event';

    // Insert version 1.0
    await db.query(
      `INSERT INTO event_registry (event_name, version, source_module, description)
       VALUES ($1, '1.0', 'test', 'Version 1.0 test event')
       ON CONFLICT (event_name, version) DO NOTHING;`,
      [eventName]
    );

    // Insert version 2.0 (same event_name, different version) -> allowed!
    await db.query(
      `INSERT INTO event_registry (event_name, version, source_module, description)
       VALUES ($1, '2.0', 'test', 'Version 2.0 test event')
       ON CONFLICT (event_name, version) DO NOTHING;`,
      [eventName]
    );

    const res = await db.query(
      `SELECT version FROM event_registry WHERE event_name = $1 ORDER BY version ASC;`,
      [eventName]
    );

    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].version).toBe('1.0');
    expect(res.rows[1].version).toBe('2.0');
  });

  it('9. Immediate dispatch failure — transaction remains committed and outbox record remains recoverable by poller', async () => {
    const db = getDbClient();
    const entityId = uuidv4();

    // 1. Transaction commits successfully with audit and outbox record staged
    const { outboxRecord } = await withTransaction(async (tx) => {
      await AuditService.recordLog({
        organizationId: testOrgId,
        action: 'TEST_DISPATCH_FAILURE',
        entityType: 'test_entity',
        entityId,
        dbClient: tx,
      });

      const outboxRecord = await OutboxService.stageOutboxEvent({
        organizationId: testOrgId,
        eventName: 'dispatch.failure.test.event',
        entityType: 'test_entity',
        entityId,
        payload: { test: true },
        dbClient: tx,
      });

      return { outboxRecord };
    });

    // 2. Simulate eventBus throwing an error on immediate dispatch
    const failingSubscriber = () => {
      throw new Error('Immediate subscriber error during post-commit dispatch');
    };
    eventBus.on('dispatch.failure.test.event', failingSubscriber);

    // Call immediate dispatch -> it catches subscriber error, logs warning, returns false
    const dispatchResult = await OutboxService.dispatchImmediate(outboxRecord);
    expect(dispatchResult).toBe(false);

    // Remove failing subscriber
    eventBus.off('dispatch.failure.test.event', failingSubscriber);

    // 3. Verify business transaction and audit log remain committed in DB!
    const auditRes = await db.query(`SELECT * FROM audit_logs WHERE entity_id = $1;`, [entityId]);
    expect(auditRes.rows).toHaveLength(1);

    // 4. Verify outbox record remains in Pending state with last_error recorded, ready for recovery!
    const outboxAfter = await OutboxService.getEventById(testOrgId, outboxRecord.id);
    expect(outboxAfter.status).toBe('Pending');
    expect(outboxAfter.lastError).toContain('Immediate subscriber error');

    // 5. Poller can recover and dispatch successfully
    let recoveredEvent: DomainEventPayload | null = null;
    const workingSubscriber = (evt: DomainEventPayload) => {
      recoveredEvent = evt;
    };
    eventBus.on('dispatch.failure.test.event', workingSubscriber);

    const polledCount = await OutboxService.processPendingOutboxEvents(10);
    expect(polledCount).toBeGreaterThanOrEqual(1);

    eventBus.off('dispatch.failure.test.event', workingSubscriber);

    expect(recoveredEvent).not.toBeNull();
    const finalOutbox = await OutboxService.getEventById(testOrgId, outboxRecord.id);
    expect(finalOutbox.status).toBe('Dispatched');
  });
});
