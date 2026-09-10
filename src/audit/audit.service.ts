import { getDbClient } from '../database/index.js';
import { eventBus, DomainEventPayload } from '../events/event-bus.js';
import { logger } from '../shared/logging/logger.js';

export interface AuditLogRecord {
  id: string;
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  requestId?: string | null;
  createdAt: Date;
}

export class AuditService {
  public static async recordLog(entry: {
    organizationId?: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    payload?: Record<string, unknown>;
    requestId?: string;
  }): Promise<void> {
    const db = getDbClient();
    try {
      await db.query(
        `INSERT INTO audit_logs (organization_id, actor_id, action, entity_type, entity_id, payload, request_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          entry.organizationId || null,
          entry.actorId || null,
          entry.action,
          entry.entityType,
          entry.entityId || null,
          entry.payload ? JSON.stringify(entry.payload) : null,
          entry.requestId || null,
        ]
      );
    } catch (err) {
      logger.error('Failed to write audit log entry', { error: (err as Error).message, entry });
    }
  }

  public static async listLogsForTenant(
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLogRecord[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string | null;
      actor_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      payload: Record<string, unknown> | null;
      request_id: string | null;
      created_at: Date;
    }>(
      `SELECT id, organization_id, actor_id, action, entity_type, entity_id, payload, request_id, created_at
       FROM audit_logs
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [organizationId, limit, offset]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      actorId: row.actor_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: row.payload,
      requestId: row.request_id,
      createdAt: row.created_at,
    }));
  }
}

// Automatically subscribe to domain event bus to capture all mutations into audit log
eventBus.on('*', async (event: DomainEventPayload) => {
  await AuditService.recordLog({
    organizationId: event.organizationId,
    actorId: event.actorId,
    action: event.eventName,
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload,
    requestId: event.requestId,
  });
});
