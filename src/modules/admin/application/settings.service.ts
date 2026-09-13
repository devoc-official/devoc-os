import { withTransaction, getDbClient } from '../../../database/index.js';
import { OrganizationSettingsRepository } from '../infrastructure/organization-settings.repository.js';
import { OrganizationSettingsEntity, OrganizationSettingsProps } from '../domain/organization-settings.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { eventBus } from '../../../events/event-bus.js';
import { NotFoundError } from '../../../shared/errors/index.js';

export interface UpdateSettingsInput {
  timezone?: string;
  locale?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  currency?: string;
  defaultBranchId?: string | null;
  defaultBusinessUnitId?: string | null;
  settings?: Record<string, unknown>;
  actorId?: string;
  requestId?: string;
  correlationId?: string;
}

export class SettingsService {
  public static async getSettings(organizationId: string): Promise<OrganizationSettingsProps> {
    const existing = await OrganizationSettingsRepository.findByOrganizationId(organizationId);
    if (existing) {
      return existing;
    }

    // Auto-initialize default settings if not already created
    return OrganizationSettingsRepository.upsert({
      organizationId,
      timezone: 'UTC',
      locale: 'en-US',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      currency: 'USD',
      settings: {},
    });
  }

  public static async updateSettings(
    organizationId: string,
    input: UpdateSettingsInput
  ): Promise<OrganizationSettingsProps> {
    const db = getDbClient();

    // 1. Validation of fields
    if (input.timezone !== undefined) {
      OrganizationSettingsEntity.validateTimezone(input.timezone);
    }
    if (input.locale !== undefined) {
      OrganizationSettingsEntity.validateLocale(input.locale);
    }
    if (input.currency !== undefined) {
      OrganizationSettingsEntity.validateCurrency(input.currency);
    }
    if (input.timeFormat !== undefined) {
      OrganizationSettingsEntity.validateTimeFormat(input.timeFormat);
    }
    if (input.dateFormat !== undefined) {
      OrganizationSettingsEntity.validateDateFormat(input.dateFormat);
    }
    if (input.settings !== undefined) {
      OrganizationSettingsEntity.validateSettings(input.settings);
    }

    // 2. Tenant isolation on default branch pointer
    if (input.defaultBranchId) {
      const branchRes = await db.query(
        `SELECT id FROM branches WHERE id = $1 AND organization_id = $2;`,
        [input.defaultBranchId, organizationId]
      );
      if (branchRes.rows.length === 0) {
        throw new NotFoundError(`Branch '${input.defaultBranchId}' not found in this organization`);
      }
    }

    // 3. Tenant isolation on default business unit pointer
    if (input.defaultBusinessUnitId) {
      const buRes = await db.query(
        `SELECT id FROM business_units WHERE id = $1 AND organization_id = $2;`,
        [input.defaultBusinessUnitId, organizationId]
      );
      if (buRes.rows.length === 0) {
        throw new NotFoundError(`Business Unit '${input.defaultBusinessUnitId}' not found in this organization`);
      }
    }

    const previous = await this.getSettings(organizationId);

    return await withTransaction(async (txClient) => {
      const updated = await OrganizationSettingsRepository.upsert(
        {
          organizationId,
          timezone: input.timezone,
          locale: input.locale,
          dateFormat: input.dateFormat,
          timeFormat: input.timeFormat,
          currency: input.currency?.toUpperCase(),
          defaultBranchId: input.defaultBranchId,
          defaultBusinessUnitId: input.defaultBusinessUnitId,
          settings: input.settings,
        },
        txClient
      );

      await AuditService.recordLog({
        organizationId,
        actorId: input.actorId,
        action: 'ORGANIZATION_SETTINGS_UPDATED',
        entityType: 'organization_settings',
        entityId: organizationId,
        beforeState: {
          timezone: previous.timezone,
          locale: previous.locale,
          currency: previous.currency,
          timeFormat: previous.timeFormat,
          dateFormat: previous.dateFormat,
        },
        afterState: {
          timezone: updated.timezone,
          locale: updated.locale,
          currency: updated.currency,
          timeFormat: updated.timeFormat,
          dateFormat: updated.dateFormat,
        },
        payload: {
          timezone: updated.timezone,
          locale: updated.locale,
          currency: updated.currency,
        },
        requestId: input.requestId,
        correlationId: input.correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'organization.settings_updated',
        entityType: 'organization_settings',
        entityId: organizationId,
        actorId: input.actorId,
        payload: { organizationId, timezone: updated.timezone, currency: updated.currency },
        requestId: input.requestId,
        correlationId: input.correlationId,
        dbClient: txClient,
      });

      eventBus.publish({
        eventName: 'organization.settings_updated',
        organizationId,
        actorId: input.actorId,
        entityType: 'organization_settings',
        entityId: organizationId,
        payload: { organizationId, timezone: updated.timezone, currency: updated.currency },
        requestId: input.requestId,
        correlationId: input.correlationId,
      });

      return updated;
    });
  }
}
