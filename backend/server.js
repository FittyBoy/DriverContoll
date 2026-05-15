const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const cors    = require('cors');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true               // รองรับ session cookie ข้าม origin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'driveelite-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 วัน
    sameSite: 'lax'
  }
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
  next();
};

function enrichCar(car) {
  const ct = db.get('carTypes').find({ id: car.carTypeId }).value() || {};
  return { ...car, typeName: ct.name || '', typeIcon: ct.icon || '🚗' };
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  if (db.get('users').find({ email }).value())
    return res.json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });

  const hashed = await bcrypt.hash(password, 10);
  const id     = db.get('nextUserId').value();
  db.get('users').push({ id, name, email, password: hashed, phone: phone || '', role: 'user', createdAt: new Date().toISOString() }).write();
  db.set('nextUserId', id + 1).write();
  req.session.user = { id, name, email, role: 'user' };
  res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.get('users').find({ email }).value();
  if (!user)                                   return res.json({ success: false, message: 'ไม่พบบัญชีผู้ใช้' });
  if (!await bcrypt.compare(password, user.password)) return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ success: true, role: user.role });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/me', (req, res) =>
  res.json(req.session.user ? { loggedIn: true, user: req.session.user } : { loggedIn: false }));

// ─── Car Types ────────────────────────────────────────────────────────────────
app.get('/api/cartypes', (_req, res) => res.json(db.get('carTypes').value()));

app.post('/api/cartypes', isAdmin, (req, res) => {
  const { name, icon, description } = req.body;
  if (!name) return res.json({ success: false, message: 'กรุณาระบุชื่อประเภท' });
  const id = db.get('nextCarTypeId').value();
  db.get('carTypes').push({ id, name, icon: icon || '🚗', description: description || '' }).write();
  db.set('nextCarTypeId', id + 1).write();
  res.json({ success: true, id });
});

app.put('/api/cartypes/:id', isAdmin, (req, res) => {
  db.get('carTypes').find({ id: parseInt(req.params.id) }).assign(req.body).write();
  res.json({ success: true });
});

app.delete('/api/cartypes/:id', isAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (db.get('cars').find({ carTypeId: id }).value())
    return res.json({ success: false, message: 'มีรถที่ใช้ประเภทนี้อยู่ ลบไม่ได้' });
  db.get('carTypes').remove({ id }).write();
  res.json({ success: true });
});

// ─── Drivers ──────────────────────────────────────────────────────────────────
app.get('/api/drivers', (_req, res) => res.json(db.get('drivers').value()));

app.post('/api/drivers', isAdmin, (req, res) => {
  const { name, phone, license, note } = req.body;
  if (!name || !phone) return res.json({ success: false, message: 'กรุณาระบุชื่อและเบอร์โทร' });
  const id = db.get('nextDriverId').value();
  db.get('drivers').push({ id, name, phone, license: license || '', available: true, note: note || '' }).write();
  db.set('nextDriverId', id + 1).write();
  res.json({ success: true, id });
});

app.put('/api/drivers/:id', isAdmin, (req, res) => {
  db.get('drivers').find({ id: parseInt(req.params.id) }).assign(req.body).write();
  res.json({ success: true });
});

app.delete('/api/drivers/:id', isAdmin, (req, res) => {
  db.get('drivers').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

// ─── Cars ─────────────────────────────────────────────────────────────────────
app.get('/api/cars', (req, res) => {
  let cars = db.get('cars').value().map(enrichCar);
  if (req.query.typeId) cars = cars.filter(c => c.carTypeId === parseInt(req.query.typeId));
  res.json(cars);
});

app.get('/api/cars/:id', (req, res) => {
  const car = db.get('cars').find({ id: parseInt(req.params.id) }).value();
  if (!car) return res.status(404).json({ message: 'ไม่พบรถ' });
  res.json(enrichCar(car));
});

app.post('/api/cars', isAdmin, (req, res) => {
  const { name, carTypeId, seats, description } = req.body;
  if (!name || !carTypeId) return res.json({ success: false, message: 'กรุณาระบุข้อมูลให้ครบ' });
  const id = db.get('nextCarId').value();
  db.get('cars').push({ id, name, carTypeId: parseInt(carTypeId), seats: parseInt(seats) || 4, available: true, description: description || '' }).write();
  db.set('nextCarId', id + 1).write();
  res.json({ success: true, id });
});

app.put('/api/cars/:id', isAdmin, (req, res) => {
  const { name, carTypeId, seats, available, description } = req.body;
  db.get('cars').find({ id: parseInt(req.params.id) })
    .assign({ name, carTypeId: parseInt(carTypeId), seats: parseInt(seats), available, description }).write();
  res.json({ success: true });
});

app.delete('/api/cars/:id', isAdmin, (req, res) => {
  db.get('cars').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
app.post('/api/bookings', (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' });

  const { carId, driverId, startDate, endDate, pickupLocation, dropoffLocation, notes } = req.body;
  if (!carId || !startDate || !endDate || !pickupLocation)
    return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

  const car = db.get('cars').find({ id: parseInt(carId) }).value();
  if (!car) return res.json({ success: false, message: 'ไม่พบรถที่เลือก' });

  const start = new Date(startDate), end = new Date(endDate);
  if (end <= start) return res.json({ success: false, message: 'วันคืนรถต้องมากกว่าวันรับรถ' });

  const ct     = db.get('carTypes').find({ id: car.carTypeId }).value() || {};
  const driver = driverId ? db.get('drivers').find({ id: parseInt(driverId) }).value() || null : null;
  const days   = Math.ceil((end - start) / 86400000);
  const id     = db.get('nextBookingId').value();

  const booking = {
    id,
    carId: car.id, carName: car.name, carTypeId: car.carTypeId,
    carTypeName: ct.name || '', carTypeIcon: ct.icon || '🚗',
    driverId: driver?.id ?? null, driverName: driver?.name ?? null,
    userId: req.session.user.id, userName: req.session.user.name, userEmail: req.session.user.email,
    startDate, endDate, days,
    pickupLocation, dropoffLocation: dropoffLocation || pickupLocation,
    notes: notes || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.get('bookings').push(booking).write();
  db.set('nextBookingId', id + 1).write();
  res.json({ success: true, booking });
});

app.get('/api/bookings/my', (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
  res.json(db.get('bookings').filter({ userId: req.session.user.id }).value());
});

// ดึงการจองทั้งหมดของรถคันนั้น (public — สำหรับแสดงตาราง)
app.get('/api/bookings/car/:carId', (req, res) => {
  const carId = parseInt(req.params.carId);
  const { weekStart } = req.query;   // optional: filter by week (YYYY-MM-DD of Monday)
  let bk = db.get('bookings').filter({ carId }).value();
  if (weekStart) {
    const mon = new Date(weekStart); mon.setHours(0,0,0,0);
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6); sun.setHours(23,59,59,999);
    bk = bk.filter(b => {
      const s = new Date(b.startDate);
      return s >= mon && s <= sun;
    });
  }
  res.json(bk);
});

// ─── Admin ────────────────────────────────────────────────────────────────────
app.get('/api/admin/bookings', isAdmin, (_req, res) =>
  res.json(db.get('bookings').value()));

app.put('/api/admin/bookings/:id', isAdmin, (req, res) => {
  db.get('bookings').find({ id: parseInt(req.params.id) }).assign(req.body).write();
  res.json({ success: true });
});

app.delete('/api/admin/bookings/:id', isAdmin, (req, res) => {
  db.get('bookings').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

app.get('/api/admin/stats', isAdmin, (_req, res) => {
  const bk = db.get('bookings').value();
  res.json({
    totalBookings: bk.length,
    pending:       bk.filter(b => b.status === 'pending').length,
    confirmed:     bk.filter(b => b.status === 'confirmed').length,
    cancelled:     bk.filter(b => b.status === 'cancelled').length,
    totalCars:     db.get('cars').value().length,
    totalDrivers:  db.get('drivers').value().length,
    totalCarTypes: db.get('carTypes').value().length
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚗 DriveElite API  →  http://localhost:${PORT}`);
  console.log(`   Allowed origin  →  ${FRONTEND_URL}`);
});
