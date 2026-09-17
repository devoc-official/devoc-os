import { getDbClient, withTransaction, DbClient } from '../database/index.js';
import { eventBus, DomainEventPayload } from './event-bus.js';
import { logger } from '../shared/logging/logger.js';
import { redactPayload } from '../audit/redaction.js';
import { NotFoundError, ValidationError } from '../shared/errors/index.js';

export type OutboxStatus = 'Pending' | 'Dispatched' | 'Failed' | 'DeadLettered';

export interface OutboxEventRecord {
  id: string;
  organizationId: string;
  eventName: string;
  eventVersion: string;
  entityType: string;
  entityId?: string | null;
  payload: Record<string, unknown>;
  actorId?: string | null;
  actorPersonId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string | null;
  scheduledAt: Date;
  dispatchedAt?: Date | null;
  createdAt: Date;
}

export interface StageOutboxInput {
  organizationId: string;
  eventName: string;
  eventVersion?: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  actorId?: string;
  actorPersonId?: string;
  requestId?: string;
  correlationId?: string;
  dbClient?: DbClient;
}

export class OutboxService {
  /**
   * Stage outbox event atomically within a database transaction.
   * NOTE: Does NOT publish to eventBus. Immediate dispatch must be called post-commit.
   */
  public static async stageOutboxEvent(input: StageOutboxInput): Promise<OutboxEventRecord> {
    const db = input.dbClient || getDbClient();
    const version = input.eventVersion || '1.0';
    const sanitizedPayload = input.payload ? redactPayload(input.payload) : {};

    const res = await db.query<any>(
      `INSERT INTO event_outbox (
        organization_id, event_name, event_version, entity_type, entity_id,
        payload, actor_id, actor_person_id, request_id, correlation_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending')
       RETURNING *;`,
      [
        input.organizationId,
        input.eventName,
        version,
        input.entityType,
        input.entityId || null,
        JSON.stringify(sanitizedPayload),
        input.actorId || null,
        input.actorPersonId || null,
        input.requestId || null,
        input.correlationId || null,
      ]
    );

    return OutboxService.mapRowToRecord(res.rows[0]);
  }

  /**
   * Immediate eventBus dispatch — MUST be invoked AFTER the surrounding DB transaction commits.
   */
  public static async dispatchImmediate(recordOrId: OutboxEventRecord | string): Promise<boolean> {
    let record: OutboxEventRecord;
    if (typeof recordOrId === 'string') {
      const db = getDbClient();
      const res = await db.query<any>(`SELECT * FROM event_outbox WHERE id = $1;`, [recordOrId]);
      if (res.rows.length === 0) return false;
      record = OutboxService.mapRowToRecord(res.rows[0]);
    } else {
      record = recordOrId;
    }

    if (record.status === 'Dispatched') {
      return true;
    }

    try {
      eventBus.publish({
        eventId: record.id,
        eventName: record.eventName,
        version: record.eventVersion,
        organizationId: record.organizationId,
        entityType: record.entityType,
        entityId: record.entityId || undefined,
        actorId: record.actorId || undefined,
        actorPersonId: record.actorPersonId || undefined,
        requestId: record.requestId || undefined,
        correlationId: record.correlationId || undefined,
        payload: record.payload,
      });

      await OutboxService.markDispatched(record.id);
      record.status = 'Dispatched';
      record.dispatchedAt = new Date();
      return true;
    } catch (err: any) {
      logger.warn(`Immediate outbox dispatch failed for event '${record.id}'; queued for background poller retry`, {
        eventId: record.id,
        error: err.message,
      });
      const db = getDbClient();
      await db.query(
        `UPDATE event_outbox SET status = 'Pending', last_error = $1 WHERE id = $2;`,
        [err.message, record.id]
      );
      return false;
    }
  }

  public static async markDispatched(eventId: string, dbClient?: DbClient): Promise<void> {
    const db = dbClient || getDbClient();
    await db.query(
      `UPDATE event_outbox SET status = 'Dispatched', dispatched_at = NOW() WHERE id = $1;`,
      [eventId]
    );
  }

  /**
   * Background outbox poller for crash recovery & failed retries.
   */
  public static async processPendingOutboxEvents(batchSize: number = 50): Promise<number> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM event_outbox
       WHERE (status = 'Pending' OR status = 'Failed') AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC
       LIMIT $1;`,
      [batchSize]
    );

    let processedCount = 0;

    for (const row of res.rows) {
      const record = OutboxService.mapRowToRecord(row);
      try {
        eventBus.publish({
          eventId: record.id,
          eventName: record.eventName,
          version: record.eventVersion,
          organizationId: record.organizationId,
          entityType: record.entityType,
          entityId: record.entityId || undefined,
          actorId: record.actorId || undefined,
          actorPersonId: record.actorPersonId || undefined,
          requestId: record.requestId || undefined,
          correlationId: record.correlationId || undefined,
          payload: record.payload,
        });

        await OutboxService.markDispatched(record.id);
        processedCount++;
      } catch (err: any) {
        const nextRetry = record.retryCount + 1;
        const newStatus = nextRetry >= 5 ? 'DeadLettered' : 'Failed';
        const nextScheduled = new Date(Date.now() + Math.pow(2, nextRetry) * 1000).toISOString();

        await db.query(
          `UPDATE event_outbox
           SET status = $1, retry_count = $2, last_error = $3, scheduled_at = $4
           WHERE id = $5;`,
          [newStatus, nextRetry, err.message, nextScheduled, record.id]
        );
      }
    }

    return processedCount;
  }

  /**
   * Retry a failed or dead-lettered event manually.
   */
  public static async retryEvent(organizationId: string, eventId: string): Promise<OutboxEventRecord> {
    const record = await OutboxService.getEventById(organizationId, eventId);
    if (record.status === 'Dispatched') {
      throw new ValidationError(`Event '${eventId}' has already been successfully dispatched`);
    }

    const success = await OutboxService.dispatchImmediate(record);
    if (!success) {
      throw new Error(`Manual retry for outbox event '${eventId}' failed`);
    }

    return OutboxService.getEventById(organizationId, eventId);
  }

  public static async getEventById(organizationId: string, eventId: string): Promise<OutboxEventRecord> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM event_outbox WHERE id = $1 AND organization_id = $2;`,
      [eventId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Outbox event '${eventId}' not found`);
    }

    return OutboxService.mapRowToRecord(res.rows[0]);
  }

  public static async getOutboxStatusSummary(organizationId: string): Promise<Record<OutboxStatus, number>> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT status, COUNT(*) as count FROM event_outbox WHERE organization_id = $1 GROUP BY status;`,
      [organizationId]
    );

    const summary: Record<OutboxStatus, number> = {
      Pending: 0,
      Dispatched: 0,
      Failed: 0,
      DeadLettered: 0,
    };

    for (const r of res.rows) {
      summary[r.status as OutboxStatus] = parseInt(r.count, 10);
    }

    return summary;
  }

  /**
   * Consumer Idempotency Execution Helpers
   */
  public static async recordConsumerExecution(
    organizationId: string,
    eventId: string,
    consumerName: string,
    dbClient?: DbClient
  ): Promise<boolean> {
    const db = dbClient || getDbClient();
    try {
      await db.query(
        `INSERT INTO event_consumer_records (organization_id, event_id, consumer_name, status)
         VALUES ($1, $2, $3, 'Processed');`,
        [organizationId, eventId, consumerName]
      );
      return true;
    } catch (err: any) {
      if (err.code === '23505') { // Unique constraint violation in PostgreSQL
        logger.info(`Consumer '${consumerName}' already processed event '${eventId}'; skipping duplicate processing`);
        return false;
      }
      throw err;
    }
  }

  public static async isEventProcessedByConsumer(
    eventId: string,
    consumerName: string,
    dbClient?: DbClient
  ): Promise<boolean> {
    const db = dbClient || getDbClient();
    const res = await db.query(
      `SELECT id FROM event_consumer_records WHERE event_id = $1 AND consumer_name = $2 AND status = 'Processed';`,
      [eventId, consumerName]
    );
    return res.rows.length > 0;
  }

  /**
   * Execute consumer handler within transaction and record idempotency entry atomically.
   */
  public static async executeConsumerWithIdempotency<T>(
    organizationId: string,
    eventId: string,
    consumerName: string,
    handler: (tx: DbClient) => Promise<T>
  ): Promise<{ executed: boolean; result?: T }> {
    const db = getDbClient();

    const isProcessed = await OutboxService.isEventProcessedByConsumer(eventId, consumerName, db);
    if (isProcessed) {
      logger.info(`Consumer '${consumerName}' already processed event '${eventId}'; skipping`);
      return { executed: false };
    }

    const result = await withTransaction(async (tx) => {
      const handlerResult = await handler(tx);
      await OutboxService.recordConsumerExecution(organizationId, eventId, consumerName, tx);
      return handlerResult;
    });

    return { executed: true, result };
  }

  private static mapRowToRecord(row: any): OutboxEventRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      eventName: row.event_name,
      eventVersion: row.event_version,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      actorId: row.actor_id,
      actorPersonId: row.actor_person_id,
      requestId: row.request_id,
      correlationId: row.correlation_id,
      status: row.status,
      retryCount: Number(row.retry_count),
      lastError: row.last_error,
      scheduledAt: row.scheduled_at,
      dispatchedAt: row.dispatched_at,
      createdAt: row.created_at,
    };
  }
}
