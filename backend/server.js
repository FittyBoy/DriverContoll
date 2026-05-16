require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const cors    = require('cors');
const { query, queryOne } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => cb(null, true),   // รับทุก origin (local dev)
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'agc-mass-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax', secure: false }
}));

// ── Guards ─────────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
  next();
};

// ── AUTH ───────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

    const exist = await queryOne('SELECT id FROM users WHERE email=$1', [email]);
    if (exist) return res.json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await queryOne(
      `INSERT INTO users (name, email, password, phone, role)
       VALUES ($1,$2,$3,$4,'user') RETURNING id, name, email, role`,
      [name, email, hashed, phone || null]
    );
    req.session.user = user;
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await queryOne('SELECT * FROM users WHERE email=$1', [email]);
    if (!user) return res.json({ success: false, message: 'ไม่พบบัญชีผู้ใช้' });
    if (!await bcrypt.compare(password, user.password))
      return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ success: true, role: user.role });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) =>
  res.json(req.session.user ? { loggedIn: true, user: req.session.user } : { loggedIn: false }));

// ── CAR TYPES ──────────────────────────────────────────────────────────────
app.get('/api/cartypes', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM car_types ORDER BY id'));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

app.post('/api/cartypes', requireAdmin, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    if (!name) return res.json({ success: false, message: 'กรุณาระบุชื่อประเภท' });
    const row = await queryOne(
      `INSERT INTO car_types (name, icon, description) VALUES ($1,$2,$3) RETURNING id`,
      [name, icon || '🚗', description || '']
    );
    res.json({ success: true, id: row.id });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.put('/api/cartypes/:id', requireAdmin, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    await query(
      `UPDATE car_types SET name=$1, icon=$2, description=$3 WHERE id=$4`,
      [name, icon, description, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.delete('/api/cartypes/:id', requireAdmin, async (req, res) => {
  try {
    const used = await queryOne('SELECT id FROM cars WHERE car_type_id=$1 LIMIT 1', [req.params.id]);
    if (used) return res.json({ success: false, message: 'มีรถที่ใช้ประเภทนี้อยู่ ลบไม่ได้' });
    await query('DELETE FROM car_types WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

// ── DRIVERS ────────────────────────────────────────────────────────────────
app.get('/api/drivers', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM drivers ORDER BY id'));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

app.post('/api/drivers', requireAdmin, async (req, res) => {
  try {
    const { name, phone, license, note } = req.body;
    if (!name || !phone) return res.json({ success: false, message: 'กรุณาระบุชื่อและเบอร์โทร' });
    const row = await queryOne(
      `INSERT INTO drivers (name, phone, license, note) VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, phone, license || '', note || '']
    );
    res.json({ success: true, id: row.id });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.put('/api/drivers/:id', requireAdmin, async (req, res) => {
  try {
    const { name, phone, license, available, note } = req.body;
    await query(
      `UPDATE drivers SET name=$1, phone=$2, license=$3, available=$4, note=$5 WHERE id=$6`,
      [name, phone, license, available, note, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.delete('/api/drivers/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM drivers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

// ── CARS ───────────────────────────────────────────────────────────────────
app.get('/api/cars', async (req, res) => {
  try {
    const { typeId } = req.query;
    const sql = `
      SELECT c.id, c.name, c.car_type_id AS "carTypeId", c.seats, c.available, c.description,
             ct.name AS "typeName", ct.icon AS "typeIcon"
      FROM cars c
      JOIN car_types ct ON ct.id = c.car_type_id
      ${typeId ? 'WHERE c.car_type_id = $1' : ''}
      ORDER BY c.id`;
    res.json(await query(sql, typeId ? [typeId] : []));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

app.get('/api/cars/:id', async (req, res) => {
  try {
    const car = await queryOne(
      `SELECT c.id, c.name, c.car_type_id AS "carTypeId", c.seats, c.available, c.description,
              ct.name AS "typeName", ct.icon AS "typeIcon"
       FROM cars c JOIN car_types ct ON ct.id = c.car_type_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!car) return res.status(404).json({ message: 'ไม่พบรถ' });
    res.json(car);
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

app.post('/api/cars', requireAdmin, async (req, res) => {
  try {
    const { name, carTypeId, seats, description } = req.body;
    if (!name || !carTypeId) return res.json({ success: false, message: 'กรุณาระบุข้อมูลให้ครบ' });
    const row = await queryOne(
      `INSERT INTO cars (name, car_type_id, seats, description)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, carTypeId, seats || 4, description || '']
    );
    res.json({ success: true, id: row.id });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.put('/api/cars/:id', requireAdmin, async (req, res) => {
  try {
    const { name, carTypeId, seats, available, description } = req.body;
    await query(
      `UPDATE cars SET name=$1, car_type_id=$2, seats=$3, available=$4, description=$5 WHERE id=$6`,
      [name, carTypeId, seats, available, description, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.delete('/api/cars/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM cars WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

// ── BOOKINGS ───────────────────────────────────────────────────────────────
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { carId, driverId, startDate, startTime, endDate, endTime, pickupLocation, dropoffLocation, notes } = req.body;
    if (!carId || !startDate || !startTime || !endDate || !endTime || !pickupLocation)
      return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    if (!driverId)
      return res.json({ success: false, message: 'กรุณาเลือกคนขับ (รถบริษัทต้องมีคนขับเท่านั้น)' });

    const car = await queryOne(
      `SELECT c.*, ct.name AS type_name, ct.icon AS type_icon
       FROM cars c JOIN car_types ct ON ct.id=c.car_type_id WHERE c.id=$1`,
      [carId]
    );
    if (!car) return res.json({ success: false, message: 'ไม่พบรถที่เลือก' });

    // ตรวจสอบวันและเวลา
    const startDT = new Date(`${startDate}T${startTime}`);
    const endDT = new Date(`${endDate}T${endTime}`);
    if (endDT <= startDT) 
      return res.json({ success: false, message: 'วันและเวลาคืนรถต้องมากกว่าวันและเวลารับรถ' });
    
    const days = Math.ceil((endDT - startDT) / 86400000);

    // ตรวจสอบการซ้อนทับ (conflict checking)
    // Two intervals overlap if: NOT (existing.end <= new.start OR new.end <= existing.start)
    const conflict = await queryOne(
      `SELECT id FROM bookings 
       WHERE car_id=$1 
       AND status IN ('pending', 'confirmed')
       AND NOT (
         -- No overlap if existing booking ends before or at new booking start
         (end_date + COALESCE(end_time, '09:00'::time)) <= ($3::date + $5::time)
         OR
         -- No overlap if new booking ends before or at existing booking start
         ($2::date + $4::time) <= (start_date + COALESCE(start_time, '09:00'::time))
       )
       LIMIT 1`,
      [carId, endDate, startDate, endTime, startTime]
    );
    if (conflict)
      return res.json({ success: false, message: 'รถมีการจองในช่วงเวลานี้แล้ว กรุณาเลือกวันและเวลาอื่น' });

    let driver = null;
    if (driverId) driver = await queryOne('SELECT id, name FROM drivers WHERE id=$1', [driverId]);

    const user = req.session.user;
    const booking = await queryOne(
      `INSERT INTO bookings
         (car_id, car_name, car_type_id, car_type_name, car_type_icon,
          driver_id, driver_name,
          user_id, user_name, user_email,
          start_date, start_time, end_date, end_time, days,
          pickup_location, dropoff_location, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending')
       RETURNING *`,
      [
        car.id, car.name, car.car_type_id, car.type_name, car.type_icon,
        driver?.id ?? null, driver?.name ?? null,
        user.id, user.name, user.email,
        startDate, startTime, endDate, endTime, days,
        pickupLocation, dropoffLocation || pickupLocation, notes || ''
      ]
    );
    res.json({ success: true, booking });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.get('/api/bookings/my', requireAuth, async (req, res) => {
  try {
    res.json(await query(
      'SELECT * FROM bookings WHERE user_id=$1 ORDER BY created_at DESC',
      [req.session.user.id]
    ));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

app.get('/api/bookings/car/:carId', async (req, res) => {
  try {
    const { weekStart } = req.query;
    let sql = 'SELECT * FROM bookings WHERE car_id=$1';
    const params = [req.params.carId];
    if (weekStart) {
      sql += ` AND start_date >= $2 AND start_date <= ($2::date + INTERVAL '6 days')`;
      params.push(weekStart);
    }
    sql += ' ORDER BY start_date';
    res.json(await query(sql, params));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

// ── ADMIN ──────────────────────────────────────────────────────────────────
app.get('/api/admin/bookings', requireAdmin, async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM bookings ORDER BY created_at DESC'));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const fields = Object.keys(req.body)
      .map((k, i) => {
        // camelCase → snake_case
        const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${col}=$${i + 1}`;
      }).join(', ');
    await query(
      `UPDATE bookings SET ${fields} WHERE id=$${Object.keys(req.body).length + 1}`,
      [...Object.values(req.body), req.params.id]
    );
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.delete('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM bookings WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const [bk, cars, drivers, types] = await Promise.all([
      query(`SELECT status, COUNT(*)::int AS cnt FROM bookings GROUP BY status`),
      queryOne('SELECT COUNT(*)::int AS cnt FROM cars'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM drivers'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM car_types'),
    ]);
    const byStatus = Object.fromEntries(bk.map(r => [r.status, r.cnt]));
    res.json({
      totalBookings: Object.values(byStatus).reduce((a, b) => a + b, 0),
      pending:    byStatus.pending   || 0,
      confirmed:  byStatus.confirmed || 0,
      cancelled:  byStatus.cancelled || 0,
      completed:  byStatus.completed || 0,
      totalCars:     cars.cnt,
      totalDrivers:  drivers.cnt,
      totalCarTypes: types.cnt,
    });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

// ── Schedule (all cars × week) ─────────────────────────────────────────────
app.get('/api/schedule', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: 'weekStart required' });

    const [bResult, cResult] = await Promise.all([
      query(`
        SELECT
          b.id, b.car_id, b.car_name, b.car_type_id, b.car_type_name, b.car_type_icon,
          b.driver_name, b.user_name,
          to_char(b.start_date, 'YYYY-MM-DD') AS start_date,
          to_char(b.end_date,   'YYYY-MM-DD') AS end_date,
          to_char(b.start_time, 'HH24:MI')    AS start_time,
          to_char(b.end_time,   'HH24:MI')    AS end_time,
          b.status, b.pickup_location, b.dropoff_location, b.notes, b.days
        FROM bookings b
        WHERE b.status IN ('pending','confirmed','completed')
          AND b.start_date <= ($1::date + INTERVAL '6 days')
          AND b.end_date   >= $1::date
        ORDER BY b.car_id, b.start_date, b.start_time
      `, [weekStart]),
      query(`
        SELECT c.id, c.name, c.seats, c.description,
               ct.id AS type_id, ct.name AS type_name, ct.icon AS type_icon
        FROM cars c JOIN car_types ct ON ct.id = c.car_type_id
        ORDER BY ct.name, c.name
      `)
    ]);

    res.json({ bookings: bResult.rows, cars: cResult.rows });
  } catch (e) {
    console.error('❌', req.method, req.path, e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚗 AGC Microglass API  →  http://localhost:${PORT}`);
  console.log(`   Frontend origin     →  ${FRONTEND_URL}`);
  console.log(`   Database schema     →  mass`);
});
