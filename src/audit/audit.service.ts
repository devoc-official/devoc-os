import { getDbClient, DbClient } from '../database/index.js';
import { eventBus, DomainEventPayload } from '../events/event-bus.js';
import { logger } from '../shared/logging/logger.js';
import { redactPayload } from './redaction.js';
import { NotFoundError } from '../shared/errors/index.js';

export interface AuditLogRecord {
  id: string;
  organizationId?: string | null;
  actorId?: string | null;
  actorPersonId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  requestId?: string | null;
  correlationId?: string | null;
  sourceModule?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface RecordLogInput {
  organizationId?: string;
  actorId?: string;
  actorPersonId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
  sourceModule?: string;
  ipAddress?: string;
  userAgent?: string;
  dbClient?: DbClient;
}

export class AuditService {
  /**
   * Append-only audit record creation with payload redaction & truncation.
   * Accepts optional dbClient for transactional operations.
   */
  public static async recordLog(entry: RecordLogInput): Promise<AuditLogRecord | null> {
    const db = entry.dbClient || getDbClient();

    const sanitizedPayload = entry.payload ? redactPayload(entry.payload) : null;
    const sanitizedBefore = entry.beforeState ? redactPayload(entry.beforeState) : null;
    const sanitizedAfter = entry.afterState ? redactPayload(entry.afterState) : null;

    try {
      const res = await db.query<any>(
        `INSERT INTO audit_logs (
          organization_id, actor_id, actor_person_id, action, entity_type, entity_id,
          before_state, after_state, payload, request_id, correlation_id, source_module,
          ip_address, user_agent
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *;`,
        [
          entry.organizationId || null,
          entry.actorId || null,
          entry.actorPersonId || null,
          entry.action,
          entry.entityType,
          entry.entityId || null,
          sanitizedBefore ? JSON.stringify(sanitizedBefore) : null,
          sanitizedAfter ? JSON.stringify(sanitizedAfter) : null,
          sanitizedPayload ? JSON.stringify(sanitizedPayload) : null,
          entry.requestId || null,
          entry.correlationId || null,
          entry.sourceModule || null,
          entry.ipAddress || null,
          entry.userAgent || null,
        ]
      );

      const row = res.rows[0];
      return AuditService.mapRowToRecord(row);
    } catch (err) {
      logger.error('Failed to write audit log entry', { error: (err as Error).message, action: entry.action });
      return null;
    }
  }

  public static async getLogById(organizationId: string, id: string): Promise<AuditLogRecord> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM audit_logs WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL);`,
      [id, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Audit record '${id}' not found`);
    }

    return AuditService.mapRowToRecord(res.rows[0]);
  }

  public static async listLogsForTenant(
    organizationId: string,
    filtersOrLimit?:
      | number
      | {
          entityType?: string;
          entityId?: string;
          actorId?: string;
          action?: string;
          correlationId?: string;
          startDate?: string;
          endDate?: string;
        },
    limitOrOffset?: number,
    offsetArg?: number
  ): Promise<AuditLogRecord[] & { data: AuditLogRecord[]; total: number }> {
    const db = getDbClient();
    const conditions = [`organization_id = $1`];
    const params: any[] = [organizationId];

    let filters: any = {};
    let limit = 50;
    let offset = 0;

    if (typeof filtersOrLimit === 'number') {
      limit = filtersOrLimit;
      offset = typeof limitOrOffset === 'number' ? limitOrOffset : 0;
    } else if (typeof filtersOrLimit === 'object' && filtersOrLimit !== null) {
      filters = filtersOrLimit;
      limit = typeof limitOrOffset === 'number' ? limitOrOffset : 50;
      offset = typeof offsetArg === 'number' ? offsetArg : 0;
    } else {
      limit = typeof limitOrOffset === 'number' ? limitOrOffset : 50;
      offset = typeof offsetArg === 'number' ? offsetArg : 0;
    }

    if (filters.entityType) {
      params.push(filters.entityType);
      conditions.push(`entity_type = $${params.length}`);
    }
    if (filters.entityId) {
      params.push(filters.entityId);
      conditions.push(`entity_id = $${params.length}`);
    }
    if (filters.actorId) {
      params.push(filters.actorId);
      conditions.push(`actor_id = $${params.length}`);
    }
    if (filters.action) {
      params.push(filters.action);
      conditions.push(`action = $${params.length}`);
    }
    if (filters.correlationId) {
      params.push(filters.correlationId);
      conditions.push(`correlation_id = $${params.length}`);
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      conditions.push(`created_at <= $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause};`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await db.query<any>(
      `SELECT * FROM audit_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
      params
    );

    const records = res.rows.map(AuditService.mapRowToRecord);
    Object.assign(records, { data: records, total });
    return records as AuditLogRecord[] & { data: AuditLogRecord[]; total: number };
  }

  public static async listLogsForEntity(
    organizationId: string,
    entityType: string,
    entityId: string
  ): Promise<AuditLogRecord[]> {
    const result = await AuditService.listLogsForTenant(organizationId, { entityType, entityId }, 100, 0);
    return result.data;
  }

  private static mapRowToRecord(row: any): AuditLogRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      actorId: row.actor_id,
      actorPersonId: row.actor_person_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      beforeState: typeof row.before_state === 'string' ? JSON.parse(row.before_state) : row.before_state,
      afterState: typeof row.after_state === 'string' ? JSON.parse(row.after_state) : row.after_state,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      requestId: row.request_id,
      correlationId: row.correlation_id,
      sourceModule: row.source_module,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }
}

// Automatically subscribe to domain event bus to capture all published events into audit_logs
eventBus.on('*', async (event: DomainEventPayload) => {
  await AuditService.recordLog({
    organizationId: event.organizationId,
    actorId: event.actorId,
    actorPersonId: event.actorPersonId,
    action: event.eventName,
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload,
    requestId: event.requestId,
    correlationId: event.correlationId,
    sourceModule: event.metadata?.sourceModule as string | undefined,
  });
});
