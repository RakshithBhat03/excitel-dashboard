import pg from 'pg';
import { getErrorMessage } from '../utils/errors';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  query_timeout: 30000,
  statement_timeout: 30000,
});

export async function testConnection(): Promise<void> {
  try {
    const result = await pool.query<{ now: Date }>('SELECT NOW()');
    console.log('Database connected:', result.rows[0]?.now);
  } catch (error: unknown) {
    console.error('Database connection failed:', getErrorMessage(error));
    process.exit(1);
  }
}
