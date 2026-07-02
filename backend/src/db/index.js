require('dotenv').config();

const { Pool } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://pittrack:pittrack@localhost:5432/pittrack';

const pool = new Pool({
  connectionString: DATABASE_URL
});

async function ensureRuntimeSchema() {
  await pool.query(`
    ALTER TABLE media_records
      ADD COLUMN IF NOT EXISTS original_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
      ADD COLUMN IF NOT EXISTS size_bytes INTEGER;

    CREATE TABLE IF NOT EXISTS live_sessions (
      id SERIAL PRIMARY KEY,
      service_order_id INTEGER NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
      status VARCHAR(40) NOT NULL DEFAULT 'active',
      started_by VARCHAR(120) NOT NULL DEFAULT 'oficina',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_live_sessions_order
      ON live_sessions(service_order_id, status, started_at);
  `);
}

async function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function waitForDatabase(maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      await ensureRuntimeSchema();
      console.log('[postgres] conexão pronta');
      return;
    } catch (error) {
      console.log(`[postgres] aguardando banco (${attempt}/${maxAttempts}): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error('PostgreSQL não respondeu dentro do tempo esperado.');
}

module.exports = {
  pool,
  query,
  withTransaction,
  waitForDatabase,
  ensureRuntimeSchema
};
