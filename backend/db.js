// ── PostgreSQL connection pool ─────────────────────────────────────────────
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'postgres',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || '',
  // search_path ให้ใช้ schema mass ทุก query
  options:  `-c search_path=mass`,
});

// ทดสอบการเชื่อมต่อตอนเริ่ม
pool.connect()
  .then(c => { console.log('✅ PostgreSQL connected (schema: mass)'); c.release(); })
  .catch(e => console.error('❌ PostgreSQL connection error:', e.message));

/**
 * helper — query แบบ parameterized
 * @param {string} sql
 * @param {any[]}  params
 */
async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * helper — query แล้วคืนแถวแรกแถวเดียว (หรือ null)
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

module.exports = { pool, query, queryOne };
