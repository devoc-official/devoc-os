import { getDbClient, DbClient } from '../../../database/index.js';
import { OrganizationSettingsProps } from '../domain/organization-settings.entity.js';

export class OrganizationSettingsRepository {
  public static async findByOrganizationId(
    organizationId: string,
    dbClient?: DbClient
  ): Promise<OrganizationSettingsProps | null> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `SELECT organization_id, timezone, locale, date_format, time_format, currency,
              default_branch_id, default_business_unit_id, settings, created_at, updated_at
       FROM organization_settings
       WHERE organization_id = $1;`,
      [organizationId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async upsert(
    input: {
      organizationId: string;
      timezone?: string;
      locale?: string;
      dateFormat?: string;
      timeFormat?: '12h' | '24h';
      currency?: string;
      defaultBranchId?: string | null;
      defaultBusinessUnitId?: string | null;
      settings?: Record<string, unknown>;
    },
    dbClient?: DbClient
  ): Promise<OrganizationSettingsProps> {
    const db = dbClient || getDbClient();

    const existing = await this.findByOrganizationId(input.organizationId, dbClient);

    const timezone = input.timezone ?? existing?.timezone ?? 'UTC';
    const locale = input.locale ?? existing?.locale ?? 'en-US';
    const dateFormat = input.dateFormat ?? existing?.dateFormat ?? 'YYYY-MM-DD';
    const timeFormat = input.timeFormat ?? existing?.timeFormat ?? '24h';
    const currency = input.currency ?? existing?.currency ?? 'USD';
    const defaultBranchId = input.defaultBranchId !== undefined ? input.defaultBranchId : (existing?.defaultBranchId ?? null);
    const defaultBusinessUnitId = input.defaultBusinessUnitId !== undefined ? input.defaultBusinessUnitId : (existing?.defaultBusinessUnitId ?? null);
    const settings = input.settings ?? existing?.settings ?? {};

    const res = await db.query<any>(
      `INSERT INTO organization_settings (
         organization_id, timezone, locale, date_format, time_format, currency,
         default_branch_id, default_business_unit_id, settings, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (organization_id) DO UPDATE
       SET timezone = EXCLUDED.timezone,
           locale = EXCLUDED.locale,
           date_format = EXCLUDED.date_format,
           time_format = EXCLUDED.time_format,
           currency = EXCLUDED.currency,
           default_branch_id = EXCLUDED.default_branch_id,
           default_business_unit_id = EXCLUDED.default_business_unit_id,
           settings = EXCLUDED.settings,
           updated_at = NOW()
       RETURNING organization_id, timezone, locale, date_format, time_format, currency,
                 default_branch_id, default_business_unit_id, settings, created_at, updated_at;`,
      [
        input.organizationId,
        timezone,
        locale,
        dateFormat,
        timeFormat,
        currency,
        defaultBranchId,
        defaultBusinessUnitId,
        JSON.stringify(settings),
      ]
    );

    return this.mapRow(res.rows[0]);
  }

  private static mapRow(row: any): OrganizationSettingsProps {
    return {
      organizationId: row.organization_id,
      timezone: row.timezone,
      locale: row.locale,
      dateFormat: row.date_format,
      timeFormat: row.time_format,
      currency: row.currency,
      defaultBranchId: row.default_branch_id,
      defaultBusinessUnitId: row.default_business_unit_id,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
