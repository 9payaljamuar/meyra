import 'dotenv/config';
import crypto from 'node:crypto';
import pg from 'pg';
import {SCHEMA} from './schema.js';

// NUMERIC comes back as string by default; money values here are small enough for float.
pg.types.setTypeParser(1700, v => parseFloat(v));

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? 'postgres://meyra:meyra@localhost:5436/meyra';
export const pool = new pg.Pool({
  connectionString: url,
  // Hosted Postgres (Neon etc.) requires TLS; serverless instances keep few connections.
  ssl: /localhost|127\.0\.0\.1|@db:/.test(url) ? undefined : {rejectUnauthorized: false},
  max: process.env.VERCEL ? 3 : 10,
});

export async function q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function one<T = any>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await q<T>(sql, params))[0];
}

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

const SCHEMA_VERSION = crypto.createHash('sha1').update(SCHEMA).digest('hex').slice(0, 12);

/** Applies the (idempotent) schema, skipping the DDL entirely when this exact schema was already applied. */
export async function migrate() {
  try {
    const row = await one(`SELECT value FROM settings WHERE key = 'schema_version'`);
    if (row?.value === SCHEMA_VERSION) return;
  } catch {
    // First run: settings table doesn't exist yet.
  }
  await pool.query(SCHEMA);
  await pool.query(
    `INSERT INTO settings(key, value) VALUES ('schema_version', $1) ON CONFLICT (key) DO UPDATE SET value = $1`,
    [JSON.stringify(SCHEMA_VERSION)],
  );
}
