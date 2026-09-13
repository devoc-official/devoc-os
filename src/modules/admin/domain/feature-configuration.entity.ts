import { ValidationError } from '../../../shared/errors/index.js';

export interface FeatureConfigurationProps {
  id: string;
  organizationId?: string | null;
  featureKey: string;
  isEnabled: boolean;
  configValue: Record<string, unknown>;
  description?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FeatureSource = 'organization_override' | 'platform_default' | 'system_default';

export interface ResolvedFeature {
  featureKey: string;
  isEnabled: boolean;
  configValue: Record<string, unknown>;
  source: FeatureSource;
  description?: string | null;
  updatedAt?: Date;
}

export class FeatureConfigurationEntity {
  public static validateFeatureKey(key: string): void {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new ValidationError('Feature key is required');
    }
    if (key.length > 100) {
      throw new ValidationError('Feature key must not exceed 100 characters');
    }
    const validKeyRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!validKeyRegex.test(key)) {
      throw new ValidationError(`Feature key '${key}' contains invalid characters. Allowed: alphanumeric, '.', '_', '-'`);
    }
  }

  public static validateConfigValue(value: unknown): Record<string, unknown> {
    if (value === undefined || value === null) {
      return {};
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError('Feature config value must be a valid JSON object');
    }
    return value as Record<string, unknown>;
  }

  public static resolve(
    featureKey: string,
    orgOverride?: FeatureConfigurationProps | null,
    platformDefault?: FeatureConfigurationProps | null
  ): ResolvedFeature {
    if (orgOverride) {
      return {
        featureKey,
        isEnabled: orgOverride.isEnabled,
        configValue: orgOverride.configValue,
        source: 'organization_override',
        description: orgOverride.description,
        updatedAt: orgOverride.updatedAt,
      };
    }

    if (platformDefault) {
      return {
        featureKey,
        isEnabled: platformDefault.isEnabled,
        configValue: platformDefault.configValue,
        source: 'platform_default',
        description: platformDefault.description,
        updatedAt: platformDefault.updatedAt,
      };
    }

    return {
      featureKey,
      isEnabled: false,
      configValue: {},
      source: 'system_default',
    };
  }
}
