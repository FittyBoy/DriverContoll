require('dotenv').config();
const express       = require('express');
const session       = require('express-session');
const bcrypt        = require('bcryptjs');
const cors          = require('cors');
const rateLimit     = require('express-rate-limit');
const axios         = require('axios');
const ExcelJS       = require('exceljs');
const swaggerUi     = require('swagger-ui-express');
const swaggerSpec   = require('./swagger');
const { query, queryOne } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL     = process.env.FRONTEND_URL     || 'http://localhost:5500';
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN || '';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'agc-mass-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax', secure: false }
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max: 20,
  message: { success: false, message: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป โปรดรอ 15 นาที' },
  standardHeaders: true, legacyHeaders: false,
});
const bookLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 min
  max: 10,
  message: { success: false, message: 'ส่งคำขอจองเร็วเกินไป โปรดรอสักครู่' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, message: 'Too many requests' },
});
app.use('/api/', apiLimiter);

// ── Guards ────────────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน', expired: true });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
  next();
};

// ── Line Notify ───────────────────────────────────────────────────────────────
async function lineNotify(message) {
  if (!LINE_NOTIFY_TOKEN) return;
  try {
    await axios.post(
      'https://notify-api.line.me/api/notify',
      new URLSearchParams({ message }),
      { headers: { Authorization: `Bearer ${LINE_NOTIFY_TOKEN}` } }
    );
  } catch (e) {
    console.warn('Line Notify failed:', e.message);
  }
}

// ── Swagger ───────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ═════════════════════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════════════════════
app.post('/api/register', authLimiter, async (req, res) => {
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
  } catch (e) { console.error('❌', req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await queryOne('SELECT * FROM users WHERE email=$1', [email]);
    if (!user) return res.json({ success: false, message: 'ไม่พบบัญชีผู้ใช้' });
    if (!await bcrypt.compare(password, user.password))
      return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ success: true, role: user.role, user: req.session.user });
  } catch (e) { console.error('❌', req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/me', (req, res) =>
  res.json(req.session.user ? { loggedIn: true, user: req.session.user } : { loggedIn: false })
);

// ═════════════════════════════════════════════════════════════════════════════
// CAR TYPES
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/cartypes', async (_req, res) => {
  try { res.json(await query('SELECT * FROM car_types ORDER BY id')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post('/api/cartypes', requireAdmin, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    if (!name) return res.json({ success: false, message: 'กรุณาระบุชื่อประเภท' });
    const row = await queryOne(`INSERT INTO car_types (name,icon,description) VALUES ($1,$2,$3) RETURNING id`, [name, icon||'🚗', description||'']);
    res.json({ success: true, id: row.id });
  } catch (e) { res.json({ success: false, message: e.message }); }
});
app.put('/api/cartypes/:id', requireAdmin, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    await query(`UPDATE car_types SET name=$1,icon=$2,description=$3 WHERE id=$4`, [name, icon, description, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});
app.delete('/api/cartypes/:id', requireAdmin, async (req, res) => {
  try {
    const used = await queryOne('SELECT id FROM cars WHERE car_type_id=$1 LIMIT 1', [req.params.id]);
    if (used) return res.json({ success: false, message: 'มีรถที่ใช้ประเภทนี้อยู่ ลบไม่ได้' });
    await query('DELETE FROM car_types WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// DRIVERS
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/drivers', async (_req, res) => {
  try { res.json(await query('SELECT * FROM drivers ORDER BY id')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post('/api/drivers', requireAdmin, async (req, res) => {
  try {
    const { name, phone, license, note } = req.body;
    if (!name || !phone) return res.json({ success: false, message: 'กรุณาระบุชื่อและเบอร์โทร' });
    const row = await queryOne(`INSERT INTO drivers (name,phone,license,note) VALUES ($1,$2,$3,$4) RETURNING id`, [name, phone, license||'', note||'']);
    res.json({ success: true, id: row.id });
  } catch (e) { res.json({ success: false, message: e.message }); }
});
app.put('/api/drivers/:id', requireAdmin, async (req, res) => {
  try {
    const { name, phone, license, available, note } = req.body;
    await query(`UPDATE drivers SET name=$1,phone=$2,license=$3,available=$4,note=$5 WHERE id=$6`, [name, phone, license, available, note, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});
app.delete('/api/drivers/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM drivers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// CARS
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/cars', async (req, res) => {
  try {
    const { typeId } = req.query;
    const sql = `SELECT c.id, c.name, c.car_type_id AS "carTypeId", c.seats, c.available, c.description,
                        ct.name AS "typeName", ct.icon AS "typeIcon"
                 FROM cars c JOIN car_types ct ON ct.id=c.car_type_id
                 ${typeId ? 'WHERE c.car_type_id=$1' : ''} ORDER BY c.id`;
    res.json(await query(sql, typeId ? [typeId] : []));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/cars/:id', async (req, res) => {
  try {
    const car = await queryOne(
      `SELECT c.id, c.name, c.car_type_id AS "carTypeId", c.seats, c.available, c.description,
              ct.name AS "typeName", ct.icon AS "typeIcon"
       FROM cars c JOIN car_types ct ON ct.id=c.car_type_id WHERE c.id=$1`, [req.params.id]);
    if (!car) return res.status(404).json({ message: 'ไม่พบรถ' });
    res.json(car);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.post('/api/cars', requireAdmin, async (req, res) => {
  try {
    const { name, carTypeId, seats, description } = req.body;
    if (!name || !carTypeId) return res.json({ success: false, message: 'กรุณาระบุข้อมูลให้ครบ' });
    const row = await queryOne(`INSERT INTO cars (name,car_type_id,seats,description) VALUES ($1,$2,$3,$4) RETURNING id`, [name, carTypeId, seats||4, description||'']);
    res.json({ success: true, id: row.id });
  } catch (e) { res.json({ success: false, message: e.message }); }
});
app.put('/api/cars/:id', requireAdmin, async (req, res) => {
  try {
    const { name, carTypeId, seats, available, description } = req.body;
    await query(`UPDATE cars SET name=$1,car_type_id=$2,seats=$3,available=$4,description=$5 WHERE id=$6`, [name, carTypeId, seats, available, description, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});
app.delete('/api/cars/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM cars WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// BOOKINGS
// ═════════════════════════════════════════════════════════════════════════════
app.post('/api/bookings', requireAuth, bookLimiter, async (req, res) => {
  try {
    const { carId, driverId, startDate, startTime, endDate, endTime,
            pickupLocation, dropoffLocation, notes,
            recurring, recurringDays } = req.body;

    if (!carId || !startDate || !startTime || !endDate || !endTime || !pickupLocation)
      return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    if (!driverId)
      return res.json({ success: false, message: 'กรุณาเลือกคนขับ' });

    const car = await queryOne(
      `SELECT c.*,ct.name AS type_name,ct.icon AS type_icon FROM cars c JOIN car_types ct ON ct.id=c.car_type_id WHERE c.id=$1`,
      [carId]
    );
    if (!car) return res.json({ success: false, message: 'ไม่พบรถที่เลือก' });

    const startDT = new Date(`${startDate}T${startTime}`);
    const endDT   = new Date(`${endDate}T${endTime}`);
    if (endDT <= startDT)
      return res.json({ success: false, message: 'วันและเวลาคืนรถต้องมากกว่าวันรับรถ' });

    const days = Math.ceil((endDT - startDT) / 86400000) || 1;

    // Conflict check
    const conflict = await queryOne(
      `SELECT id FROM bookings WHERE car_id=$1 AND status IN ('pending','confirmed')
       AND NOT ((end_date+COALESCE(end_time,'09:00'::time))<=($3::date+$5::time) OR ($2::date+$4::time)<=(start_date+COALESCE(start_time,'09:00'::time)))
       LIMIT 1`,
      [carId, endDate, startDate, endTime, startTime]
    );
    if (conflict)
      return res.json({ success: false, message: 'รถมีการจองในช่วงเวลานี้แล้ว กรุณาเลือกเวลาอื่น' });

    const driver = driverId ? await queryOne('SELECT id,name FROM drivers WHERE id=$1', [driverId]) : null;
    const user   = req.session.user;

    // ── Create booking(s) ──
    const bookingIds = [];
    const datesToBook = [{ startDate, startTime, endDate, endTime, days }];

    // Recurring: generate dates
    if (recurring && recurringDays && Array.isArray(recurringDays) && recurringDays.length > 0) {
      const baseStart = new Date(startDate);
      const baseEnd   = new Date(endDate);
      const diffMs    = baseEnd - baseStart;
      // generate next 8 weeks
      for (let w = 1; w <= 8; w++) {
        for (const dow of recurringDays) {
          const d = new Date(baseStart);
          d.setDate(d.getDate() + (dow - d.getDay() + 7) % 7 + w * 7);
          const sd = d.toISOString().slice(0, 10);
          const ed = new Date(d.getTime() + diffMs).toISOString().slice(0, 10);
          datesToBook.push({ startDate: sd, startTime, endDate: ed, endTime, days });
        }
      }
    }

    for (const slot of datesToBook) {
      const bk = await queryOne(
        `INSERT INTO bookings
           (car_id,car_name,car_type_id,car_type_name,car_type_icon,
            driver_id,driver_name,user_id,user_name,user_email,
            start_date,start_time,end_date,end_time,days,
            pickup_location,dropoff_location,notes,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending')
         RETURNING *`,
        [car.id,car.name,car.car_type_id,car.type_name,car.type_icon,
         driver?.id??null, driver?.name??null,
         user.id,user.name,user.email,
         slot.startDate,slot.startTime,slot.endDate,slot.endTime,slot.days,
         pickupLocation, dropoffLocation||pickupLocation, notes||'']
      );
      bookingIds.push(bk);
    }

    // Line Notify — new booking
    await lineNotify(
      `\n🚗 จองรถใหม่ #${String(bookingIds[0].id).padStart(5,'0')}\n` +
      `👤 ${user.name}\n` +
      `🚘 ${car.name}${driver ? ' / ' + driver.name : ''}\n` +
      `📅 ${startDate} ${startTime} → ${endDate} ${endTime}\n` +
      `📍 ${pickupLocation}` +
      (datesToBook.length > 1 ? `\n🔁 Recurring ×${datesToBook.length} ครั้ง` : '')
    );

    const first = bookingIds[0];
    res.json({ success: true, count: bookingIds.length, booking: {
      id: first.id, carId: first.car_id, carName: first.car_name,
      carTypeIcon: first.car_type_icon, carTypeName: first.car_type_name,
      driverId: first.driver_id, driverName: first.driver_name,
      userId: first.user_id, userName: first.user_name, userEmail: first.user_email,
      startDate: first.start_date, startTime: first.start_time,
      endDate: first.end_date, endTime: first.end_time,
      days: first.days, pickupLocation: first.pickup_location,
      dropoffLocation: first.dropoff_location, notes: first.notes, status: first.status,
    }});
  } catch (e) { console.error('❌', req.method, req.path, e.message); res.json({ success: false, message: e.message }); }
});

app.get('/api/bookings/my', requireAuth, async (req, res) => {
  try {
    res.json(await query('SELECT * FROM bookings WHERE user_id=$1 ORDER BY created_at DESC', [req.session.user.id]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/bookings/car/:carId', async (req, res) => {
  try {
    const { weekStart } = req.query;
    let sql = 'SELECT * FROM bookings WHERE car_id=$1';
    const params = [req.params.carId];
    if (weekStart) { sql += ` AND start_date>=$2 AND start_date<=($2::date+INTERVAL '6 days')`; params.push(weekStart); }
    sql += ' ORDER BY start_date';
    res.json(await query(sql, params));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN — BOOKINGS
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/admin/bookings', requireAdmin, async (_req, res) => {
  try { res.json(await query('SELECT * FROM bookings ORDER BY created_at DESC')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// Quick status update endpoint
app.patch('/api/admin/bookings/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending','confirmed','cancelled','completed'];
    if (!allowed.includes(status)) return res.json({ success: false, message: 'status ไม่ถูกต้อง' });

    await query(`UPDATE bookings SET status=$1 WHERE id=$2`, [status, req.params.id]);

    // fetch booking for notification
    const bk = await queryOne('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    if (bk) {
      const statusTH = { pending:'รอดำเนินการ', confirmed:'✅ ยืนยันแล้ว', cancelled:'❌ ยกเลิก', completed:'✔️ เสร็จสิ้น' };
      await lineNotify(
        `\n📋 อัปเดตการจอง #${String(bk.id).padStart(5,'0')}\n` +
        `สถานะ: ${statusTH[status]||status}\n` +
        `👤 ${bk.user_name}  🚗 ${bk.car_name}\n` +
        `📅 ${bk.start_date} ${bk.start_time||''}`
      );
    }
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.put('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const fields = Object.keys(req.body).map((k,i) => `${k.replace(/([A-Z])/g,'_$1').toLowerCase()}=$${i+1}`).join(', ');
    await query(`UPDATE bookings SET ${fields} WHERE id=$${Object.keys(req.body).length+1}`, [...Object.values(req.body), req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.delete('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM bookings WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN — STATS & ANALYTICS
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const [bk, cars, drivers, types, trips] = await Promise.all([
      query(`SELECT status, COUNT(*)::int AS cnt FROM bookings GROUP BY status`),
      queryOne('SELECT COUNT(*)::int AS cnt FROM cars'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM drivers'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM car_types'),
      queryOne('SELECT COUNT(*)::int AS cnt FROM trips WHERE trip_date=CURRENT_DATE'),
    ]);
    const byStatus = Object.fromEntries(bk.map(r => [r.status, r.cnt]));
    res.json({
      totalBookings: Object.values(byStatus).reduce((a,b)=>a+b,0),
      pending:    byStatus.pending   || 0,
      confirmed:  byStatus.confirmed || 0,
      cancelled:  byStatus.cancelled || 0,
      completed:  byStatus.completed || 0,
      totalCars:    cars.cnt,
      totalDrivers: drivers.cnt,
      totalCarTypes: types.cnt,
      tripsToday:   trips?.cnt || 0,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Dashboard analytics
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const { range = '30' } = req.query;
    const days = parseInt(range) || 30;

    const [topCars, topDrivers, peakHours, byStatus, weekly] = await Promise.all([
      // Top used cars
      query(`
        SELECT car_name, COUNT(*)::int AS bookings,
               SUM(days)::int AS total_days
        FROM bookings
        WHERE created_at >= NOW() - INTERVAL '${days} days'
          AND status IN ('confirmed','completed')
        GROUP BY car_name ORDER BY bookings DESC LIMIT 8
      `),
      // Top drivers
      query(`
        SELECT driver_name, COUNT(*)::int AS trips
        FROM bookings
        WHERE driver_name IS NOT NULL
          AND created_at >= NOW() - INTERVAL '${days} days'
          AND status IN ('confirmed','completed')
        GROUP BY driver_name ORDER BY trips DESC LIMIT 8
      `),
      // Peak hours (from start_time)
      query(`
        SELECT EXTRACT(HOUR FROM start_time)::int AS hour,
               COUNT(*)::int AS cnt
        FROM bookings
        WHERE start_time IS NOT NULL
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY hour ORDER BY hour
      `),
      // By status
      query(`
        SELECT status, COUNT(*)::int AS cnt
        FROM bookings
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY status
      `),
      // Weekly trend (last 8 weeks)
      query(`
        SELECT DATE_TRUNC('week', start_date)::date AS week_start,
               COUNT(*)::int AS cnt
        FROM bookings
        WHERE start_date >= NOW()::date - INTERVAL '56 days'
        GROUP BY week_start ORDER BY week_start
      `),
    ]);

    res.json({ topCars, topDrivers, peakHours, byStatus, weekly, range: days });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT — weekly schedule
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/admin/export/schedule', requireAdmin, async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: 'weekStart required' });

    const [bookings, cars] = await Promise.all([
      query(`
        SELECT b.*, c.name AS car_name_full,
               ct.name AS type_name
        FROM bookings b
        LEFT JOIN cars c ON c.id=b.car_id
        LEFT JOIN car_types ct ON ct.id=b.car_type_id
        WHERE b.start_date <= ($1::date + INTERVAL '6 days')
          AND b.end_date   >= $1::date
          AND b.status IN ('pending','confirmed','completed')
        ORDER BY b.car_name, b.start_date, b.start_time
      `, [weekStart]),
      query(`
        SELECT c.id, c.name, ct.name AS type_name
        FROM cars c JOIN car_types ct ON ct.id=c.car_type_id
        ORDER BY ct.name, c.name
      `),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AGC Microglass Transportation';
    wb.created = new Date();

    const ws = wb.addWorksheet('Weekly Schedule', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    // Calculate 7 days
    const monday = new Date(weekStart);
    const days   = Array.from({length:7}, (_,i) => {
      const d = new Date(monday); d.setDate(d.getDate()+i); return d;
    });
    const fmtDate = d => d.toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'});
    const fmtYMD  = d => d.toISOString().slice(0,10);

    // Header row 1 — title
    ws.mergeCells(1,1,1,9);
    ws.getCell(1,1).value = `ตารางรถประจำสัปดาห์  ${fmtDate(days[0])} – ${fmtDate(days[6])} ${days[0].getFullYear()+543}`;
    ws.getCell(1,1).font  = { bold:true, size:14 };
    ws.getCell(1,1).alignment = { horizontal:'center' };
    ws.getRow(1).height = 28;

    // Header row 2 — columns
    const headers = ['ประเภท','รถ','คนขับ','ผู้จอง',...days.map(fmtDate),'สถานที่รับ'];
    ws.addRow(headers);
    const hRow = ws.getRow(2);
    hRow.height = 22;
    hRow.eachCell(cell => {
      cell.fill   = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1E3A5F'} };
      cell.font   = { bold:true, color:{argb:'FFFFFFFF'}, size:10 };
      cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
      cell.border = { bottom:{style:'thin',color:{argb:'FFAAAAAA'}} };
    });

    // Column widths
    [12,18,18,18,14,14,14,14,14,14,14,22].forEach((w,i) => {
      if (ws.getColumn(i+1)) ws.getColumn(i+1).width = w;
    });

    // Data rows
    const statusColor = { pending:'FFFEF3C7', confirmed:'FFD1FAE5', completed:'FFDBEAFE', cancelled:'FFFEE2E2' };

    bookings.forEach(bk => {
      const rowData = [
        bk.type_name||'',
        bk.car_name||'',
        bk.driver_name||'',
        bk.user_name||'',
      ];
      // Mark each day
      days.forEach(d => {
        const ds = fmtYMD(d);
        if (bk.start_date <= ds && bk.end_date >= ds) {
          const isStart = bk.start_date === ds, isEnd = bk.end_date === ds;
          rowData.push(isStart ? (bk.start_time||'') : isEnd ? (bk.end_time||'') : '◄►');
        } else {
          rowData.push('');
        }
      });
      rowData.push(bk.pickup_location||'');

      const row = ws.addRow(rowData);
      row.height = 18;
      const bg = statusColor[bk.status] || 'FFFFFFFF';
      row.eachCell({ includeEmpty:true }, cell => {
        cell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:bg} };
        cell.border = { bottom:{style:'hair',color:{argb:'FFDDDDDD'}} };
        cell.alignment = { vertical:'middle', wrapText:false };
        cell.font  = { size:9 };
      });
      // Bold car name
      row.getCell(2).font = { bold:true, size:9 };
    });

    // Freeze header rows
    ws.views = [{ state:'frozen', ySplit:2 }];

    // Legend sheet
    const wsLeg = wb.addWorksheet('Legend');
    wsLeg.addRow(['สี','สถานะ']);
    [['รอดำเนินการ','FFFEF3C7'],['ยืนยันแล้ว','FFD1FAE5'],['เสร็จสิ้น','FFDBEAFE'],['ยกเลิก','FFFEE2E2']].forEach(([s,c])=>{
      const r = wsLeg.addRow([s,'']);
      r.getCell(1).fill = { type:'pattern',pattern:'solid',fgColor:{argb:c} };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="schedule_${weekStart}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { console.error('❌ export', e.message); res.status(500).json({ message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// SCHEDULE  (all cars × week)
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/schedule', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: 'weekStart required' });
    const [bResult, cResult] = await Promise.all([
      query(`
        SELECT b.id, b.car_id, b.car_name, b.car_type_id, b.car_type_name, b.car_type_icon,
               b.driver_name, b.user_name,
               to_char(b.start_date,'YYYY-MM-DD') AS start_date,
               to_char(b.end_date,  'YYYY-MM-DD') AS end_date,
               to_char(b.start_time,'HH24:MI')    AS start_time,
               to_char(b.end_time,  'HH24:MI')    AS end_time,
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
        FROM cars c JOIN car_types ct ON ct.id=c.car_type_id ORDER BY ct.name, c.name
      `)
    ]);
    res.json({ bookings: bResult, cars: cResult });
  } catch (e) { console.error('❌', req.method, req.path, e.message); res.status(500).json({ message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// TRIPS
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/trips', async (req, res) => {
  try {
    const { date, weekStart, driverName } = req.query;
    let sql = 'SELECT * FROM trips WHERE 1=1';
    const params = [];
    if (date) { params.push(date); sql += ` AND trip_date=$${params.length}`; }
    else if (weekStart) { params.push(weekStart); sql += ` AND trip_date>=$${params.length}::date AND trip_date<=($${params.length}::date+INTERVAL '6 days')`; }
    if (driverName) { params.push(`%${driverName}%`); sql += ` AND driver_name ILIKE $${params.length}`; }
    sql += ' ORDER BY trip_date, pickup_time, id';
    res.json(await query(sql, params));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/trips/dates', async (_req, res) => {
  try {
    res.json(await query(`SELECT DISTINCT trip_date::text, COUNT(*)::int AS cnt FROM trips GROUP BY trip_date ORDER BY trip_date DESC LIMIT 90`));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.post('/api/trips', requireAdmin, async (req, res) => {
  try {
    const { tripDate,carTypeLabel,driverName,registrationPlate,phone,passengerName,pickupLocation,dropoffLocation,pickupTime,remarks } = req.body;
    if (!tripDate||!passengerName||!pickupLocation||!dropoffLocation) return res.json({ success:false, message:'กรุณากรอกข้อมูลให้ครบ' });
    const row = await queryOne(
      `INSERT INTO trips (trip_date,car_type_label,driver_name,registration_plate,phone,passenger_name,pickup_location,dropoff_location,pickup_time,remarks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [tripDate,carTypeLabel||'',driverName||'',registrationPlate||'',phone||'',passengerName,pickupLocation,dropoffLocation,pickupTime||'',remarks||'']
    );
    res.json({ success:true, id:row.id });
  } catch (e) { res.json({ success:false, message:e.message }); }
});
app.put('/api/trips/:id', requireAdmin, async (req, res) => {
  try {
    const { tripDate,carTypeLabel,driverName,registrationPlate,phone,passengerName,pickupLocation,dropoffLocation,pickupTime,remarks,status } = req.body;
    await query(
      `UPDATE trips SET trip_date=$1,car_type_label=$2,driver_name=$3,registration_plate=$4,phone=$5,passenger_name=$6,pickup_location=$7,dropoff_location=$8,pickup_time=$9,remarks=$10,status=$11 WHERE id=$12`,
      [tripDate,carTypeLabel||'',driverName||'',registrationPlate||'',phone||'',passengerName,pickupLocation,dropoffLocation,pickupTime||'',remarks||'',status||'scheduled',req.params.id]
    );
    res.json({ success:true });
  } catch (e) { res.json({ success:false, message:e.message }); }
});
app.delete('/api/trips/:id', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM trips WHERE id=$1',[req.params.id]); res.json({ success:true }); }
  catch (e) { res.json({ success:false, message:e.message }); }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚗 AGC Microglass API  →  http://localhost:${PORT}`);
  console.log(`   Frontend           →  ${FRONTEND_URL}`);
  console.log(`   Swagger UI         →  http://localhost:${PORT}/api-docs`);
  console.log(`   Line Notify        →  ${LINE_NOTIFY_TOKEN ? '✅ configured' : '⚠️  not set (add LINE_NOTIFY_TOKEN to .env)'}`);
});
