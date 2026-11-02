import 'dotenv/config';
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

export async function migrate() {
  await pool.query(SCHEMA);
}
