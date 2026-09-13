import { withTransaction } from '../../../database/index.js';
import { FeatureConfigurationRepository } from '../infrastructure/feature-configuration.repository.js';
import {
  FeatureConfigurationEntity,
  FeatureConfigurationProps,
  ResolvedFeature,
} from '../domain/feature-configuration.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { eventBus } from '../../../events/event-bus.js';
import { NotFoundError } from '../../../shared/errors/index.js';

export class FeatureConfigService {
  public static async resolveFeaturesForOrganization(organizationId: string): Promise<ResolvedFeature[]> {
    return FeatureConfigurationRepository.resolveAllForOrganization(organizationId);
  }

  public static async resolveSingleFeature(
    organizationId: string,
    featureKey: string
  ): Promise<ResolvedFeature> {
    FeatureConfigurationEntity.validateFeatureKey(featureKey);
    const orgOverride = await FeatureConfigurationRepository.findOrganizationOverride(
      organizationId,
      featureKey
    );
    const platformDefault = await FeatureConfigurationRepository.findPlatformDefault(featureKey);

    return FeatureConfigurationEntity.resolve(featureKey, orgOverride, platformDefault);
  }

  public static async setOrganizationOverride(
    organizationId: string,
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

    const existing = await FeatureConfigurationRepository.findOrganizationOverride(
      organizationId,
      featureKey
    );

    return await withTransaction(async (txClient) => {
      const override = await FeatureConfigurationRepository.upsertOrganizationOverride(
        organizationId,
        featureKey,
        isEnabled,
        configValue,
        description,
        actorId,
        txClient
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'FEATURE_CONFIGURATION_UPDATED',
        entityType: 'feature_configuration',
        entityId: override.id,
        beforeState: existing
          ? { isEnabled: existing.isEnabled, configValue: existing.configValue }
          : undefined,
        afterState: { isEnabled: override.isEnabled, configValue: override.configValue },
        payload: { featureKey, isEnabled, configValue },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'feature_configuration.updated',
        entityType: 'feature_configuration',
        entityId: override.id,
        actorId,
        payload: { organizationId, featureKey, isEnabled, configValue },
        requestId,
        correlationId,
        dbClient: txClient,
      });

      eventBus.publish({
        eventName: 'feature_configuration.updated',
        organizationId,
        actorId,
        entityType: 'feature_configuration',
        entityId: override.id,
        payload: { organizationId, featureKey, isEnabled, configValue },
        requestId,
        correlationId,
      });

      return override;
    });
  }

  public static async deleteOrganizationOverride(
    organizationId: string,
    featureKey: string,
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ): Promise<ResolvedFeature> {
    FeatureConfigurationEntity.validateFeatureKey(featureKey);
    const existing = await FeatureConfigurationRepository.findOrganizationOverride(
      organizationId,
      featureKey
    );
    if (!existing) {
      throw new NotFoundError(
        `Feature configuration override for '${featureKey}' not found in this organization`
      );
    }

    await withTransaction(async (txClient) => {
      await FeatureConfigurationRepository.deleteOrganizationOverride(
        organizationId,
        featureKey,
        txClient
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'FEATURE_CONFIGURATION_OVERRIDE_REMOVED',
        entityType: 'feature_configuration',
        entityId: existing.id,
        beforeState: { isEnabled: existing.isEnabled, configValue: existing.configValue },
        afterState: { isEnabled: null, configValue: null },
        payload: { featureKey },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });
    });

    return this.resolveSingleFeature(organizationId, featureKey);
  }
}
