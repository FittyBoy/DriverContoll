// ── โหลด .env ก่อนทุกอย่าง ────────────────────────────────────────────────
require('dotenv').config();

// ── PostgreSQL connection pool ─────────────────────────────────────────────
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'postgres',
  user:     process.env.PG_USER     || 'postgres',
  password: String(process.env.PG_PASSWORD || '').replace(/^["']|["']$/g, ''),  // strip quotes ถ้า dotenv ใส่มา
  options:  `-c search_path=mass`,
});

// ทดสอบการเชื่อมต่อตอนเริ่ม
pool.connect()
  .then(c => { console.log('✅ PostgreSQL connected (schema: mass)'); c.release(); })
  .catch(e => console.error('❌ PostgreSQL connection error:', e.message));

async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

module.exports = { pool, query, queryOne };
