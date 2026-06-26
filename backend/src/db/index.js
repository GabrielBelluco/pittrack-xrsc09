require('dotenv').config();

const { Pool } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://pittrack:pittrack@localhost:5432/pittrack';

const pool = new Pool({
  connectionString: DATABASE_URL
});

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
  waitForDatabase
};
