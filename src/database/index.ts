import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { config } from '../config/index.js';
import { logger } from '../shared/logging/logger.js';

const { Pool } = pg;

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
}

let pgPool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;

export const getDbClient = (): DbClient => {
  const isTest = config.NODE_ENV === 'test';
  const usePGlite = process.env.USE_PGLITE === 'true' || (isTest && !process.env.DATABASE_URL);

  if (usePGlite) {
    if (!pgliteInstance) {
      pgliteInstance = new PGlite();
      logger.info('🐘 Connected to in-memory PGlite PostgreSQL instance');
    }
    return {
      query: async <T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> => {
        const res = await pgliteInstance!.query<T>(sql, params);
        return {
          rows: res.rows,
          rowCount: res.rows.length,
        };
      },
      exec: async (sql: string): Promise<void> => {
        await pgliteInstance!.exec(sql);
      },
    };
  }

  if (!pgPool) {
    const connectionString = isTest && config.TEST_DATABASE_URL ? config.TEST_DATABASE_URL : config.DATABASE_URL;
    pgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pgPool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
    });
  }

  return {
    query: async <T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> => {
      const res = await pgPool!.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? 0,
      };
    },
    exec: async (sql: string): Promise<void> => {
      await pgPool!.query(sql);
    },
  };
};

export const closeDb = async (): Promise<void> => {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
};

export const withTransaction = async <T>(
  callback: (client: DbClient) => Promise<T>
): Promise<T> => {
  const db = getDbClient();
  await db.query('BEGIN');
  try {
    const result = await callback(db);
    await db.query('COMMIT');
    return result;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

export { runMigrations, resetDatabase } from './migrate.js';
