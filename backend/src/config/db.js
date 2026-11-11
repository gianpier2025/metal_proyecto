import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { HttpError } from '../middleware/errors.js';

const { Pool, types } = pg;
// Keep PostgreSQL DATE columns as YYYY-MM-DD strings instead of JS Date objects.
types.setTypeParser(1082, (value) => value);
const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
const isPlaceholder = !rawDatabaseUrl || /\[TU|YOUR_|PLACEHOLDER|<.*>/.test(rawDatabaseUrl);
const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sslCaPath = process.env.DATABASE_SSL_CA_PATH?.trim();
const sslCa = sslCaPath ? readFileSync(resolve(backendDir, sslCaPath), 'utf8') : undefined;

export const databaseConfigured = !isPlaceholder;

export const pool = databaseConfigured
  ? new Pool({
      connectionString: rawDatabaseUrl,
      ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) },
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

export async function withUserTransaction(userId, callback) {
  if (!pool) {
    throw new HttpError(503, 'Falta configurar DATABASE_URL en el backend.');
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    const value = await callback(client);
    await client.query('commit');
    return value;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) await pool.end();
}
