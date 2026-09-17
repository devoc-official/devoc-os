import { getDbClient, DbClient } from '../../../database/index.js';
import {
  FeatureConfigurationProps,
  FeatureConfigurationEntity,
  ResolvedFeature,
} from '../domain/feature-configuration.entity.js';

export class FeatureConfigurationRepository {
  public static async findPlatformDefault(
    featureKey: string,
    dbClient?: DbClient
  ): Promise<FeatureConfigurationProps | null> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `SELECT id, organization_id, feature_key, is_enabled, config_value, description, updated_by, created_at, updated_at
       FROM feature_configurations
       WHERE feature_key = $1 AND organization_id IS NULL;`,
      [featureKey]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findOrganizationOverride(
    organizationId: string,
    featureKey: string,
    dbClient?: DbClient
  ): Promise<FeatureConfigurationProps | null> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `SELECT id, organization_id, feature_key, is_enabled, config_value, description, updated_by, created_at, updated_at
       FROM feature_configurations
       WHERE feature_key = $1 AND organization_id = $2;`,
      [featureKey, organizationId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async listPlatformDefaults(dbClient?: DbClient): Promise<FeatureConfigurationProps[]> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `SELECT id, organization_id, feature_key, is_enabled, config_value, description, updated_by, created_at, updated_at
       FROM feature_configurations
       WHERE organization_id IS NULL
       ORDER BY feature_key ASC;`
    );

    return res.rows.map((r) => this.mapRow(r));
  }

  public static async listOrganizationOverrides(
    organizationId: string,
    dbClient?: DbClient
  ): Promise<FeatureConfigurationProps[]> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `SELECT id, organization_id, feature_key, is_enabled, config_value, description, updated_by, created_at, updated_at
       FROM feature_configurations
       WHERE organization_id = $1
       ORDER BY feature_key ASC;`,
      [organizationId]
    );

    return res.rows.map((r) => this.mapRow(r));
  }

  public static async upsertPlatformDefault(
    featureKey: string,
    isEnabled: boolean,
    configValue: Record<string, unknown> = {},
    description?: string | null,
    updatedBy?: string | null,
    dbClient?: DbClient
  ): Promise<FeatureConfigurationProps> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `INSERT INTO feature_configurations (
         organization_id, feature_key, is_enabled, config_value, description, updated_by, updated_at
       ) VALUES (NULL, $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (feature_key) WHERE organization_id IS NULL DO UPDATE
       SET is_enabled = EXCLUDED.is_enabled,
           config_value = EXCLUDED.config_value,
           description = COALESCE(EXCLUDED.description, feature_configurations.description),
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING id, organization_id, feature_key, is_enabled, config_value, description, updated_by, created_at, updated_at;`,
      [featureKey, isEnabled, JSON.stringify(configValue), description, updatedBy]
    );

    return this.mapRow(res.rows[0]);
  }

  public static async upsertOrganizationOverride(
    organizationId: string,
    featureKey: string,
    isEnabled: boolean,
    configValue: Record<string, unknown> = {},
    description?: string | null,
    updatedBy?: string | null,
    dbClient?: DbClient
  ): Promise<FeatureConfigurationProps> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `INSERT INTO feature_configurations (
         organization_id, feature_key, is_enabled, config_value, description, updated_by, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (organization_id, feature_key) WHERE organization_id IS NOT NULL DO UPDATE
       SET is_enabled = EXCLUDED.is_enabled,
           config_value = EXCLUDED.config_value,
           description = COALESCE(EXCLUDED.description, feature_configurations.description),
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING id, organization_id, feature_key, is_enabled, config_value, description, updated_by, created_at, updated_at;`,
      [organizationId, featureKey, isEnabled, JSON.stringify(configValue), description, updatedBy]
    );

    return this.mapRow(res.rows[0]);
  }

  public static async deleteOrganizationOverride(
    organizationId: string,
    featureKey: string,
    dbClient?: DbClient
  ): Promise<boolean> {
    const db = dbClient || getDbClient();
    const res = await db.query(
      `DELETE FROM feature_configurations
       WHERE organization_id = $1 AND feature_key = $2;`,
      [organizationId, featureKey]
    );

    return (res.rowCount ?? 0) > 0;
  }

  public static async resolveAllForOrganization(
    organizationId: string,
    dbClient?: DbClient
  ): Promise<ResolvedFeature[]> {
    const platformDefaults = await this.listPlatformDefaults(dbClient);
    const orgOverrides = await this.listOrganizationOverrides(organizationId, dbClient);

    const overrideMap = new Map<string, FeatureConfigurationProps>();
    for (const ov of orgOverrides) {
      overrideMap.set(ov.featureKey, ov);
    }

    const defaultMap = new Map<string, FeatureConfigurationProps>();
    for (const def of platformDefaults) {
      defaultMap.set(def.featureKey, def);
    }

    const allKeys = new Set<string>([...overrideMap.keys(), ...defaultMap.keys()]);
    const resolvedList: ResolvedFeature[] = [];

    for (const key of Array.from(allKeys).sort()) {
      const override = overrideMap.get(key);
      const def = defaultMap.get(key);
      resolvedList.push(FeatureConfigurationEntity.resolve(key, override, def));
    }

    return resolvedList;
  }

  private static mapRow(row: any): FeatureConfigurationProps {
    return {
      id: row.id,
      organizationId: row.organization_id,
      featureKey: row.feature_key,
      isEnabled: row.is_enabled,
      configValue: typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value,
      description: row.description,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
