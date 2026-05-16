require('dotenv').config();
const express        = require('express');
const swaggerUi      = require('swagger-ui-express');
const swaggerSpec    = require('./swagger');
const session        = require('express-session');
const bcrypt  = require('bcryptjs');
const cors    = require('cors');
const { query, queryOne } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,        // สะท้อน origin กลับ — ทำงานกับ credentials: include
  credentials: true,   // จำเป็นสำหรับ session cookie ข้าม port
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

/**
 * @swagger
 * /api/register:
 *   post:
 *     tags: [Auth]
 *     summary: สมัครสมาชิกใหม่
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string, example: สมหมาย ใจดี }
 *               email:    { type: string, example: sommai@agc.com }
 *               password: { type: string, example: "123456" }
 *               phone:    { type: string, example: 081-000-0000 }
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 */
app.post('/api/register'
, async (req, res) => {
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


/**
 * @swagger
 * /api/login:
 *   post:
 *     tags: [Auth]
 *     summary: เข้าสู่ระบบ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: admin@carbook.com }
 *               password: { type: string, example: admin123 }
 *     responses:
 *       200:
 *         description: เข้าสู่ระบบสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 role:    { type: string,  example: admin }
 */
app.post('/api/login'
, async (req, res) => {
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


/**
 * @swagger
 * /api/logout:
 *   post:
 *     tags: [Auth]
 *     summary: ออกจากระบบ
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 */
app.post('/api/logout'
, (req, res) => { req.session.destroy(); res.json({ success: true }); });

/**
 * @swagger
 * /api/me:
 *   get:
 *     tags: [Auth]
 *     summary: ดูข้อมูลผู้ใช้ที่ login อยู่
 *     responses:
 *       200:
 *         description: สถานะ login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loggedIn: { type: boolean }
 *                 user:     { type: object }
 */
app.get('/api/me'
, (req, res) =>
  res.json(req.session.user ? { loggedIn: true, user: req.session.user } : { loggedIn: false }));

// ── CAR TYPES ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/cartypes:
 *   get:
 *     tags: [Car Types]
 *     summary: ดูประเภทรถทั้งหมด
 *     responses:
 *       200:
 *         description: รายการประเภทรถ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/CarType' }
 */
app.get('/api/cartypes'
, async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM car_types ORDER BY id'));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});


/**
 * @swagger
 * /api/cartypes:
 *   post:
 *     tags: [Car Types]
 *     summary: เพิ่มประเภทรถใหม่ (Admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:        { type: string, example: SUV }
 *               icon:        { type: string, example: 🚙 }
 *               description: { type: string, example: รถอเนกประสงค์ }
 *     responses:
 *       200:
 *         description: เพิ่มสำเร็จ
 */
app.post('/api/cartypes'
, requireAdmin, async (req, res) => {
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


/**
 * @swagger
 * /api/cartypes/{id}:
 *   put:
 *     tags: [Car Types]
 *     summary: แก้ไขประเภทรถ (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               icon:        { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: แก้ไขสำเร็จ
 */
app.put('/api/cartypes/:id'
, requireAdmin, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    await query(
      `UPDATE car_types SET name=$1, icon=$2, description=$3 WHERE id=$4`,
      [name, icon, description, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});


/**
 * @swagger
 * /api/cartypes/{id}:
 *   delete:
 *     tags: [Car Types]
 *     summary: ลบประเภทรถ (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: ลบสำเร็จ
 */
app.delete('/api/cartypes/:id'
, requireAdmin, async (req, res) => {
  try {
    const used = await queryOne('SELECT id FROM cars WHERE car_type_id=$1 LIMIT 1', [req.params.id]);
    if (used) return res.json({ success: false, message: 'มีรถที่ใช้ประเภทนี้อยู่ ลบไม่ได้' });
    await query('DELETE FROM car_types WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

// ── DRIVERS ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     tags: [Drivers]
 *     summary: ดูคนขับทั้งหมด
 *     responses:
 *       200:
 *         description: รายการคนขับ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Driver' }
 */
app.get('/api/drivers'
, async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM drivers ORDER BY id'));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});


/**
 * @swagger
 * /api/drivers:
 *   post:
 *     tags: [Drivers]
 *     summary: เพิ่มคนขับใหม่ (Admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name:    { type: string, example: สมชาย มีสุข }
 *               phone:   { type: string, example: 081-111-1111 }
 *               license: { type: string, example: A1234567 }
 *               note:    { type: string, example: ชำนาญเส้นทาง }
 *     responses:
 *       200:
 *         description: เพิ่มสำเร็จ
 */
app.post('/api/drivers'
, requireAdmin, async (req, res) => {
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


/**
 * @swagger
 * /api/drivers/{id}:
 *   put:
 *     tags: [Drivers]
 *     summary: แก้ไขข้อมูลคนขับ (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:      { type: string }
 *               phone:     { type: string }
 *               license:   { type: string }
 *               available: { type: boolean }
 *               note:      { type: string }
 *     responses:
 *       200:
 *         description: แก้ไขสำเร็จ
 */
app.put('/api/drivers/:id'
, requireAdmin, async (req, res) => {
  try {
    const { name, phone, license, available, note } = req.body;
    await query(
      `UPDATE drivers SET name=$1, phone=$2, license=$3, available=$4, note=$5 WHERE id=$6`,
      [name, phone, license, available, note, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});


/**
 * @swagger
 * /api/drivers/{id}:
 *   delete:
 *     tags: [Drivers]
 *     summary: ลบคนขับ (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: ลบสำเร็จ
 */
app.delete('/api/drivers/:id'
, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM drivers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

// ── CARS ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/cars:
 *   get:
 *     tags: [Cars]
 *     summary: ดูรถทั้งหมด
 *     parameters:
 *       - in: query
 *         name: typeId
 *         schema: { type: integer }
 *         description: กรองตาม carTypeId
 *     responses:
 *       200:
 *         description: รายการรถ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Car' }
 */
app.get('/api/cars'
, async (req, res) => {
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


/**
 * @swagger
 * /api/cars:
 *   post:
 *     tags: [Cars]
 *     summary: เพิ่มรถใหม่ (Admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, carTypeId]
 *             properties:
 *               name:        { type: string,  example: Toyota Camry }
 *               carTypeId:   { type: integer, example: 1 }
 *               seats:       { type: integer, example: 5 }
 *               description: { type: string,  example: รถเก๋งหรู }
 *     responses:
 *       200:
 *         description: เพิ่มสำเร็จ
 */
app.post('/api/cars'
, requireAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: สร้างการจองใหม่ (ต้อง login)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [carId, driverId, startDate, endDate, pickupLocation]
 *             properties:
 *               carId:           { type: integer, example: 1 }
 *               driverId:        { type: integer, example: 1 }
 *               startDate:       { type: string, format: date, example: "2024-07-01" }
 *               endDate:         { type: string, format: date, example: "2024-07-03" }
 *               pickupLocation:  { type: string, example: โรงงาน MG }
 *               dropoffLocation: { type: string, example: สนามบิน BKK }
 *               notes:           { type: string, example: รับแขก VIP }
 *     responses:
 *       200:
 *         description: จองสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 booking: { $ref: '#/components/schemas/Booking' }
 */
app.post('/api/bookings'
, requireAuth, async (req, res) => {
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
    // ส่ง camelCase กลับ เพื่อให้ frontend ใช้งานได้สะดวก
    const bk = booking;
    res.json({ success: true, booking: {
      id:              bk.id,
      carId:           bk.car_id,
      carName:         bk.car_name,
      carTypeId:       bk.car_type_id,
      carTypeName:     bk.car_type_name,
      carTypeIcon:     bk.car_type_icon,
      driverId:        bk.driver_id,
      driverName:      bk.driver_name,
      userId:          bk.user_id,
      userName:        bk.user_name,
      userEmail:       bk.user_email,
      startDate:       bk.start_date,
      startTime:       bk.start_time,
      endDate:         bk.end_date,
      endTime:         bk.end_time,
      days:            bk.days,
      pickupLocation:  bk.pickup_location,
      dropoffLocation: bk.dropoff_location,
      notes:           bk.notes,
      status:          bk.status,
      createdAt:       bk.created_at,
    }});
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});


/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     tags: [Bookings]
 *     summary: ดูการจองของตัวเอง (ต้อง login)
 *     responses:
 *       200:
 *         description: รายการการจอง
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Booking' }
 */
app.get('/api/bookings/my'
, requireAuth, async (req, res) => {
  try {
    res.json(await query(
      'SELECT * FROM bookings WHERE user_id=$1 ORDER BY created_at DESC',
      [req.session.user.id]
    ));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});


/**
 * @swagger
 * /api/bookings/car/{carId}:
 *   get:
 *     tags: [Bookings]
 *     summary: ดูการจองของรถ (สำหรับตารางสัปดาห์)
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: weekStart
 *         schema: { type: string, format: date }
 *         description: วันจันทร์ของสัปดาห์ที่ต้องการ (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: รายการการจองในสัปดาห์
 */
app.get('/api/bookings/car/:carId'
, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     tags: [Admin]
 *     summary: ดูการจองทั้งหมด (Admin)
 *     responses:
 *       200:
 *         description: รายการการจองทั้งหมด
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Booking' }
 */
app.get('/api/admin/bookings'
, requireAdmin, async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM bookings ORDER BY created_at DESC'));
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});


/**
 * @swagger
 * /api/admin/bookings/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: อัปเดตสถานะการจอง (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [pending, confirmed, cancelled, completed] }
 *     responses:
 *       200:
 *         description: อัปเดตสำเร็จ
 */
app.put('/api/admin/bookings/:id'
, requireAdmin, async (req, res) => {
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


/**
 * @swagger
 * /api/admin/bookings/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: ลบการจอง (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: ลบสำเร็จ
 */
app.delete('/api/admin/bookings/:id'
, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM bookings WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});


/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: ดูสถิติภาพรวม (Admin)
 *     responses:
 *       200:
 *         description: สถิติ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBookings: { type: integer }
 *                 pending:       { type: integer }
 *                 confirmed:     { type: integer }
 *                 cancelled:     { type: integer }
 *                 completed:     { type: integer }
 *                 totalCars:     { type: integer }
 *                 totalDrivers:  { type: integer }
 *                 totalCarTypes: { type: integer }
 */
app.get('/api/admin/stats'
, requireAdmin, async (_req, res) => {
  try {
    const [bk, cars, drivers, types, trips] = await Promise.all([
      query(`SELECT status, COUNT(*)::int AS cnt FROM bookings GROUP BY status`),
      queryOne('SELECT COUNT(*)::int AS cnt FROM cars'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM drivers'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM car_types'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM trips WHERE trip_date = CURRENT_DATE'),
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
      tripsToday:    trips?.cnt || 0,
    });
  } catch (e) { console.error("❌", req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

<<<<<<< HEAD
// ── TRIPS (ตารางจัดรถรายวัน) ───────────────────────────────────────────────
app.get('/api/trips', async (req, res) => {
  try {
    const { date, weekStart, driverName } = req.query;
    let sql = 'SELECT * FROM trips WHERE 1=1';
    const params = [];
    if (date) {
      params.push(date);
      sql += ` AND trip_date = $${params.length}`;
    } else if (weekStart) {
      params.push(weekStart);
      sql += ` AND trip_date >= $${params.length}::date AND trip_date <= ($${params.length}::date + INTERVAL '6 days')`;
    }
    if (driverName) {
      params.push(`%${driverName}%`);
      sql += ` AND driver_name ILIKE $${params.length}`;
    }
    sql += ' ORDER BY trip_date, pickup_time, id';
    res.json(await query(sql, params));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/trips/dates', async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT trip_date::text, COUNT(*)::int AS cnt
       FROM trips GROUP BY trip_date ORDER BY trip_date DESC LIMIT 90`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/trips', requireAdmin, async (req, res) => {
  try {
    const { tripDate, carTypeLabel, driverName, registrationPlate, phone,
            passengerName, pickupLocation, dropoffLocation, pickupTime, remarks } = req.body;
    if (!tripDate || !passengerName || !pickupLocation || !dropoffLocation)
      return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
    const row = await queryOne(
      `INSERT INTO trips (trip_date, car_type_label, driver_name, registration_plate, phone,
         passenger_name, pickup_location, dropoff_location, pickup_time, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [tripDate, carTypeLabel||'', driverName||'', registrationPlate||'', phone||'',
       passengerName, pickupLocation, dropoffLocation, pickupTime||'', remarks||'']
    );
    res.json({ success: true, id: row.id });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.put('/api/trips/:id', requireAdmin, async (req, res) => {
  try {
    const { tripDate, carTypeLabel, driverName, registrationPlate, phone,
            passengerName, pickupLocation, dropoffLocation, pickupTime, remarks, status } = req.body;
    await query(
      `UPDATE trips SET trip_date=$1, car_type_label=$2, driver_name=$3, registration_plate=$4,
         phone=$5, passenger_name=$6, pickup_location=$7, dropoff_location=$8,
         pickup_time=$9, remarks=$10, status=$11 WHERE id=$12`,
      [tripDate, carTypeLabel||'', driverName||'', registrationPlate||'', phone||'',
       passengerName, pickupLocation, dropoffLocation, pickupTime||'', remarks||'',
       status||'scheduled', req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.delete('/api/trips/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM trips WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
=======
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
>>>>>>> 0c3f4b1ac3e688679c9208ee51cd8fc43edd9029
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚗 AGC Microglass API  →  http://localhost:${PORT}`);
  console.log(`   Frontend origin     →  ${FRONTEND_URL}`);
  console.log(`   Database schema     →  mass`);
  console.log(`   Swagger UI          →  http://localhost:${PORT}/api-docs`);
});
