import { withTransaction, getDbClient } from '../../../database/index.js';
import { AuthService } from '../../../auth/auth.service.js';
import { OrganizationEntity, OrganizationProps, OrganizationStatus } from '../../organization/domain/organization.entity.js';
import { OrganizationRepository } from '../../organization/infrastructure/organization.repository.js';
import { OrganizationSettingsRepository } from '../infrastructure/organization-settings.repository.js';
import { OrganizationSettingsEntity, OrganizationSettingsProps } from '../domain/organization-settings.entity.js';
import { PlatformSettingsRepository } from '../infrastructure/platform-settings.repository.js';
import { PlatformSettingEntity, PlatformSettingProps } from '../domain/platform-settings.entity.js';
import { FeatureConfigurationRepository } from '../infrastructure/feature-configuration.repository.js';
import { FeatureConfigurationEntity, FeatureConfigurationProps } from '../domain/feature-configuration.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { eventBus } from '../../../events/event-bus.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  InvalidStateTransitionError,
} from '../../../shared/errors/index.js';

export interface ProvisionOrganizationInput {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword?: string;
  adminFullName?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  requestId?: string;
  correlationId?: string;
  actorId?: string;
}

export class PlatformAdminService {
  public static async provisionOrganization(input: ProvisionOrganizationInput): Promise<{
    organization: OrganizationProps;
    settings: OrganizationSettingsProps;
    adminUser: { id: string; email: string; fullName: string };
  }> {
    OrganizationEntity.validateSlug(input.slug);
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Organization name is required');
    }
    if (!input.adminEmail || !input.adminEmail.includes('@')) {
      throw new ValidationError('Valid administrator email is required');
    }

    const timezone = input.timezone || 'UTC';
    const locale = input.locale || 'en-US';
    const currency = input.currency || 'USD';

    OrganizationSettingsEntity.validateTimezone(timezone);
    OrganizationSettingsEntity.validateLocale(locale);
    OrganizationSettingsEntity.validateCurrency(currency);

    const existingSlug = await OrganizationRepository.findBySlug(input.slug);
    if (existingSlug) {
      throw new ConflictError(`Organization slug '${input.slug}' is already taken`);
    }

    return await withTransaction(async (txClient) => {
      // 1. Resolve or create initial admin user
      let adminUser = await AuthService.getUserByEmail(input.adminEmail);
      if (!adminUser) {
        const password = input.adminPassword || 'InitialAdminPassword123!';
        const fullName = input.adminFullName || 'Organization Administrator';
        adminUser = await AuthService.createUser({
          email: input.adminEmail,
          password,
          fullName,
        });
      }

      // 2. Create organization tenant
      const organization = await OrganizationRepository.create(
        {
          name: input.name.trim(),
          slug: input.slug.trim().toLowerCase(),
          status: 'active',
        },
        txClient
      );

      // 3. Initialize organization operational settings
      const settings = await OrganizationSettingsRepository.upsert(
        {
          organizationId: organization.id,
          timezone,
          locale,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          currency: currency.toUpperCase(),
          settings: {},
        },
        txClient
      );

      // 4. Assign membership as org_admin
      await OrganizationRepository.createMembership(
        {
          organizationId: organization.id,
          userId: adminUser.id,
          role: 'org_admin',
          status: 'active',
        },
        txClient
      );

      // 5. Immutable Audit Log
      await AuditService.recordLog({
        organizationId: organization.id,
        actorId: input.actorId || adminUser.id,
        action: 'ORGANIZATION_PROVISIONED',
        entityType: 'organization',
        entityId: organization.id,
        payload: {
          name: organization.name,
          slug: organization.slug,
          adminEmail: adminUser.email,
          timezone,
          currency,
        },
        requestId: input.requestId,
        correlationId: input.correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      // 6. Stage Outbox Event
      await OutboxService.stageOutboxEvent({
        organizationId: organization.id,
        eventName: 'organization.provisioned',
        entityType: 'organization',
        entityId: organization.id,
        actorId: input.actorId || adminUser.id,
        payload: {
          organizationId: organization.id,
          name: organization.name,
          slug: organization.slug,
          adminUserId: adminUser.id,
        },
        requestId: input.requestId,
        correlationId: input.correlationId,
        dbClient: txClient,
      });

      // Emit fast in-process event
      eventBus.publish({
        eventName: 'organization.provisioned',
        organizationId: organization.id,
        actorId: input.actorId || adminUser.id,
        entityType: 'organization',
        entityId: organization.id,
        payload: {
          organizationId: organization.id,
          slug: organization.slug,
          adminUserId: adminUser.id,
        },
        requestId: input.requestId,
        correlationId: input.correlationId,
      });

      return {
        organization,
        settings,
        adminUser: { id: adminUser.id, email: adminUser.email, fullName: adminUser.fullName },
      };
    });
  }

  public static async listOrganizations(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ organizations: OrganizationProps[]; total: number }> {
    const db = getDbClient();
    const limit = options.limit && options.limit > 0 && options.limit <= 100 ? options.limit : 50;
    const offset = options.offset && options.offset >= 0 ? options.offset : 0;

    let query = 'SELECT id, name, slug, status, created_at, updated_at FROM organizations';
    let countQuery = 'SELECT COUNT(*)::int as total FROM organizations';
    const params: any[] = [];

    if (options.status) {
      query += ' WHERE status = $1';
      countQuery += ' WHERE status = $1';
      params.push(options.status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;

    const countRes = await db.query<{ total: number }>(countQuery, params);
    const total = countRes.rows[0]?.total ?? 0;

    const res = await db.query<any>(query, [...params, limit, offset]);
    const organizations: OrganizationProps[] = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));

    return { organizations, total };
  }

  public static async getOrganization(id: string): Promise<{
    organization: OrganizationProps;
    settings?: OrganizationSettingsProps | null;
  }> {
    const organization = await OrganizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundError(`Organization '${id}' not found`);
    }

    const settings = await OrganizationSettingsRepository.findByOrganizationId(id);
    return { organization, settings };
  }

  public static async updateOrganizationStatus(
    id: string,
    newStatus: OrganizationStatus,
    reason?: string,
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ): Promise<OrganizationProps> {
    const org = await OrganizationRepository.findById(id);
    if (!org) {
      throw new NotFoundError(`Organization '${id}' not found`);
    }

    if (org.status === newStatus) {
      return org;
    }

    // State machine transitions
    if (org.status === 'archived' && newStatus !== 'archived') {
      throw new InvalidStateTransitionError("Cannot reactivate an 'archived' organization directly.");
    }

    const validStatuses: OrganizationStatus[] = ['active', 'suspended', 'archived'];
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError(`Invalid organization status '${newStatus}'`);
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE organizations
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, slug, status, created_at, updated_at;`,
        [newStatus, id]
      );
      if (res.rows.length === 0) {
        throw new NotFoundError(`Organization '${id}' not found`);
      }
      const updatedOrg: OrganizationProps = {
        id: res.rows[0].id,
        name: res.rows[0].name,
        slug: res.rows[0].slug,
        status: res.rows[0].status,
        createdAt: new Date(res.rows[0].created_at),
        updatedAt: new Date(res.rows[0].updated_at),
      };

      const eventName =
        newStatus === 'suspended'
          ? 'organization.suspended'
          : newStatus === 'active'
          ? 'organization.reactivated'
          : 'organization.updated';

      await AuditService.recordLog({
        organizationId: id,
        actorId,
        action: 'ORGANIZATION_STATUS_UPDATED',
        entityType: 'organization',
        entityId: id,
        beforeState: { status: org.status },
        afterState: { status: newStatus },
        payload: { previousStatus: org.status, newStatus, reason },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      await OutboxService.stageOutboxEvent({
        organizationId: id,
        eventName,
        entityType: 'organization',
        entityId: id,
        actorId,
        payload: { organizationId: id, previousStatus: org.status, status: newStatus, reason },
        requestId,
        correlationId,
        dbClient: txClient,
      });

      eventBus.publish({
        eventName,
        organizationId: id,
        actorId,
        entityType: 'organization',
        entityId: id,
        payload: { organizationId: id, previousStatus: org.status, status: newStatus, reason },
        requestId,
        correlationId,
      });

      return updatedOrg;
    });
  }

  // --- PLATFORM SETTINGS ---
  public static async listPlatformSettings(): Promise<PlatformSettingProps[]> {
    return PlatformSettingsRepository.listAll();
  }

  public static async getPlatformSetting(key: string): Promise<PlatformSettingProps> {
    PlatformSettingEntity.validateKey(key);
    const setting = await PlatformSettingsRepository.findByKey(key);
    if (!setting) {
      throw new NotFoundError(`Platform setting '${key}' not found`);
    }
    return setting;
  }

  public static async updatePlatformSetting(
    key: string,
    value: Record<string, unknown>,
    description?: string | null,
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ): Promise<PlatformSettingProps> {
    PlatformSettingEntity.validateKey(key);
    PlatformSettingEntity.validateValue(value);

    const existing = await PlatformSettingsRepository.findByKey(key);

    return await withTransaction(async (txClient) => {
      const setting = await PlatformSettingsRepository.upsert(key, value, description, actorId, txClient);

      await AuditService.recordLog({
        actorId,
        action: 'PLATFORM_SETTING_UPDATED',
        entityType: 'platform_setting',
        entityId: undefined,
        beforeState: existing ? { value: existing.value, description: existing.description } : undefined,
        afterState: { value: setting.value, description: setting.description },
        payload: { key, value },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return setting;
    });
  }

  // --- PLATFORM FEATURES ---
  public static async listPlatformFeatures(): Promise<FeatureConfigurationProps[]> {
    return FeatureConfigurationRepository.listPlatformDefaults();
  }

  public static async getPlatformFeature(featureKey: string): Promise<FeatureConfigurationProps> {
    FeatureConfigurationEntity.validateFeatureKey(featureKey);
    const feature = await FeatureConfigurationRepository.findPlatformDefault(featureKey);
    if (!feature) {
      throw new NotFoundError(`Platform feature '${featureKey}' default not found`);
    }
    return feature;
  }

  public static async updatePlatformFeature(
    featureKey: string,
    isEnabled: boolean,
    configValue: Record<string, unknown> = {},
    description?: string | null,
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ): Promise<FeatureConfigurationProps> {
    FeatureConfigurationEntity.validateFeatureKey(featureKey);
    FeatureConfigurationEntity.validateConfigValue(configValue);

    const existing = await FeatureConfigurationRepository.findPlatformDefault(featureKey);

    return await withTransaction(async (txClient) => {
      const feature = await FeatureConfigurationRepository.upsertPlatformDefault(
        featureKey,
        isEnabled,
        configValue,
        description,
        actorId,
        txClient
      );

      await AuditService.recordLog({
        actorId,
        action: 'PLATFORM_FEATURE_UPDATED',
        entityType: 'feature_configuration',
        entityId: feature.id,
        beforeState: existing ? { isEnabled: existing.isEnabled, configValue: existing.configValue } : undefined,
        afterState: { isEnabled: feature.isEnabled, configValue: feature.configValue },
        payload: { featureKey, isEnabled, configValue },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return feature;
    });
  }
}
