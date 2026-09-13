import { getDbClient, DbClient } from '../../../database/index.js';
import { PlatformSettingProps } from '../domain/platform-settings.entity.js';

export class PlatformSettingsRepository {
  public static async findByKey(key: string, dbClient?: DbClient): Promise<PlatformSettingProps | null> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `SELECT key, value, description, updated_by, created_at, updated_at
       FROM platform_settings
       WHERE key = $1;`,
      [key]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async listAll(dbClient?: DbClient): Promise<PlatformSettingProps[]> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `SELECT key, value, description, updated_by, created_at, updated_at
       FROM platform_settings
       ORDER BY key ASC;`
    );

    return res.rows.map((row) => this.mapRow(row));
  }

  public static async upsert(
    key: string,
    value: Record<string, unknown>,
    description?: string | null,
    updatedBy?: string | null,
    dbClient?: DbClient
  ): Promise<PlatformSettingProps> {
    const db = dbClient || getDbClient();
    const res = await db.query<any>(
      `INSERT INTO platform_settings (key, value, description, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           description = COALESCE(EXCLUDED.description, platform_settings.description),
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING key, value, description, updated_by, created_at, updated_at;`,
      [key, JSON.stringify(value), description, updatedBy]
    );

    return this.mapRow(res.rows[0]);
  }

  public static async delete(key: string, dbClient?: DbClient): Promise<boolean> {
    const db = dbClient || getDbClient();
    const res = await db.query(`DELETE FROM platform_settings WHERE key = $1;`, [key]);
    return (res.rowCount ?? 0) > 0;
  }

  private static mapRow(row: any): PlatformSettingProps {
    return {
      key: row.key,
      value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value,
      description: row.description,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
