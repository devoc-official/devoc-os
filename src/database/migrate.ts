import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbClient } from './index.js';
import { logger } from '../shared/logging/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runMigrations = async (): Promise<void> => {
  const db = getDbClient();

  // Create migrations table to track applied migrations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const migrationsDir = path.resolve(__dirname, '../../migrations');
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`No migrations directory found at: ${migrationsDir}`);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
    .sort();

  const appliedRes = await db.query<{ name: string }>('SELECT name FROM schema_migrations;');
  const appliedNames = new Set(appliedRes.rows.map((r) => r.name));

  for (const file of files) {
    if (!appliedNames.has(file)) {
      logger.info(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await db.exec(sql);
        await db.query('INSERT INTO schema_migrations (name) VALUES ($1);', [file]);
        logger.info(`Successfully applied migration: ${file}`);
      } catch (err) {
        logger.error(`Failed to apply migration: ${file}`, { error: (err as Error).message });
        throw err;
      }
    } else {
      logger.info(`Migration already applied: ${file}`);
    }
  }
};

export const resetDatabase = async (): Promise<void> => {
  const db = getDbClient();
  logger.info('Resetting database schema...');
  await db.exec(`
    DROP TABLE IF EXISTS meeting_action_items CASCADE;
    DROP TABLE IF EXISTS meeting_decisions CASCADE;
    DROP TABLE IF EXISTS meeting_notes CASCADE;
    DROP TABLE IF EXISTS meeting_agenda_items CASCADE;
    DROP TABLE IF EXISTS meeting_participants CASCADE;
    DROP TABLE IF EXISTS meeting_targets CASCADE;
    DROP TABLE IF EXISTS meetings CASCADE;
    DROP TABLE IF EXISTS meeting_types CASCADE;
    DROP TABLE IF EXISTS work_outcomes CASCADE;
    DROP TABLE IF EXISTS outcomes CASCADE;
    DROP TABLE IF EXISTS work_evidence CASCADE;
    DROP TABLE IF EXISTS work_records CASCADE;
    DROP TABLE IF EXISTS work_categories CASCADE;
    DROP TABLE IF EXISTS task_dependencies CASCADE;
    DROP TABLE IF EXISTS tasks CASCADE;
    DROP TABLE IF EXISTS project_business_units CASCADE;
    DROP TABLE IF EXISTS project_owners CASCADE;
    DROP TABLE IF EXISTS projects CASCADE;
    DROP TABLE IF EXISTS assignment_history CASCADE;
    DROP TABLE IF EXISTS assignments CASCADE;
    DROP TABLE IF EXISTS person_skills CASCADE;
    DROP TABLE IF EXISTS skills CASCADE;
    DROP TABLE IF EXISTS employment_history CASCADE;
    DROP TABLE IF EXISTS employments CASCADE;
    DROP TABLE IF EXISTS person_roles CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE IF EXISTS people CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS teams CASCADE;
    DROP TABLE IF EXISTS departments CASCADE;
    DROP TABLE IF EXISTS business_units CASCADE;
    DROP TABLE IF EXISTS branches CASCADE;
    DROP TABLE IF EXISTS organization_memberships CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS organizations CASCADE;
    DROP TABLE IF EXISTS schema_migrations CASCADE;
  `);
  await runMigrations();
};

// CLI Execution if called directly
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  const command = process.argv[2] || 'up';
  (async () => {
    try {
      if (command === 'reset') {
        await resetDatabase();
      } else {
        await runMigrations();
      }
      logger.info('Migration task complete.');
    } catch (e) {
      logger.error('Migration failed:', { error: (e as Error).message });
      process.exit(1);
    }
  })();
}
