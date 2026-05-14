const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'carbook-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ── helpers ──────────────────────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
  next();
};

function enrichCar(car) {
  const ct = db.get('carTypes').find({ id: car.carTypeId }).value() || {};
  return { ...car, typeName: ct.name || '', typeIcon: ct.icon || '🚗' };
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  if (db.get('users').find({ email }).value())
    return res.json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
  const hashed = await bcrypt.hash(password, 10);
  const id = db.get('nextUserId').value();
  db.get('users').push({ id, name, email, password: hashed, phone: phone || '', role: 'user', createdAt: new Date().toISOString() }).write();
  db.set('nextUserId', id + 1).write();
  req.session.user = { id, name, email, role: 'user' };
  res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.get('users').find({ email }).value();
  if (!user) return res.json({ success: false, message: 'ไม่พบบัญชีผู้ใช้' });
  if (!await bcrypt.compare(password, user.password))
    return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ success: true, role: user.role });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) => res.json(req.session.user
  ? { loggedIn: true, user: req.session.user } : { loggedIn: false }));

// ── CAR TYPES (master) ────────────────────────────────────────────────────────
app.get('/api/cartypes', (req, res) => res.json(db.get('carTypes').value()));

app.post('/api/cartypes', isAdmin, (req, res) => {
  const { name, icon, description } = req.body;
  if (!name) return res.json({ success: false, message: 'กรุณาระบุชื่อประเภท' });
  const id = db.get('nextCarTypeId').value();
  db.get('carTypes').push({ id, name, icon: icon || '🚗', description: description || '' }).write();
  db.set('nextCarTypeId', id + 1).write();
  res.json({ success: true, id });
});

app.put('/api/cartypes/:id', isAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { name, icon, description } = req.body;
  db.get('carTypes').find({ id }).assign({ name, icon, description }).write();
  res.json({ success: true });
});

app.delete('/api/cartypes/:id', isAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (db.get('cars').find({ carTypeId: id }).value())
    return res.json({ success: false, message: 'มีรถใช้ประเภทนี้อยู่ ลบไม่ได้' });
  db.get('carTypes').remove({ id }).write();
  res.json({ success: true });
});

// ── DRIVERS (master) ──────────────────────────────────────────────────────────
app.get('/api/drivers', (req, res) => res.json(db.get('drivers').value()));

app.post('/api/drivers', isAdmin, (req, res) => {
  const { name, phone, license, note } = req.body;
  if (!name || !phone) return res.json({ success: false, message: 'กรุณาระบุชื่อและเบอร์โทร' });
  const id = db.get('nextDriverId').value();
  db.get('drivers').push({ id, name, phone, license: license || '', available: true, note: note || '' }).write();
  db.set('nextDriverId', id + 1).write();
  res.json({ success: true, id });
});

app.put('/api/drivers/:id', isAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, license, available, note } = req.body;
  db.get('drivers').find({ id }).assign({ name, phone, license, available, note }).write();
  res.json({ success: true });
});

app.delete('/api/drivers/:id', isAdmin, (req, res) => {
  db.get('drivers').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

// ── CARS ──────────────────────────────────────────────────────────────────────
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
  const id = parseInt(req.params.id);
  const { name, carTypeId, seats, available, description } = req.body;
  db.get('cars').find({ id }).assign({ name, carTypeId: parseInt(carTypeId), seats: parseInt(seats), available, description }).write();
  res.json({ success: true });
});

app.delete('/api/cars/:id', isAdmin, (req, res) => {
  db.get('cars').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

// ── BOOKINGS ──────────────────────────────────────────────────────────────────
app.post('/api/bookings', (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' });
  const { carId, driverId, startDate, endDate, pickupLocation, dropoffLocation, notes } = req.body;
  if (!carId || !startDate || !endDate || !pickupLocation)
    return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

  const car = db.get('cars').find({ id: parseInt(carId) }).value();
  if (!car) return res.json({ success: false, message: 'ไม่พบรถที่เลือก' });

  const start = new Date(startDate), end = new Date(endDate);
  if (end <= start) return res.json({ success: false, message: 'วันคืนรถต้องมากกว่าวันรับรถ' });

  const ct = db.get('carTypes').find({ id: car.carTypeId }).value() || {};
  let driver = null;
  if (driverId) {
    driver = db.get('drivers').find({ id: parseInt(driverId) }).value() || null;
  }

  const days = Math.ceil((end - start) / 86400000);
  const id = db.get('nextBookingId').value();
  const booking = {
    id,
    carId: car.id, carName: car.name, carTypeId: car.carTypeId,
    carTypeName: ct.name || '', carTypeIcon: ct.icon || '🚗',
    driverId: driver ? driver.id : null,
    driverName: driver ? driver.name : null,
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
  if (!req.session.user) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
  res.json(db.get('bookings').filter({ userId: req.session.user.id }).value());
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.get('/api/admin/bookings', isAdmin, (req, res) =>
  res.json(db.get('bookings').value()));

app.put('/api/admin/bookings/:id', isAdmin, (req, res) => {
  db.get('bookings').find({ id: parseInt(req.params.id) }).assign(req.body).write();
  res.json({ success: true });
});

app.delete('/api/admin/bookings/:id', isAdmin, (req, res) => {
  db.get('bookings').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

app.get('/api/admin/stats', isAdmin, (req, res) => {
  const bookings = db.get('bookings').value();
  res.json({
    totalBookings: bookings.length,
    pending:    bookings.filter(b => b.status === 'pending').length,
    confirmed:  bookings.filter(b => b.status === 'confirmed').length,
    cancelled:  bookings.filter(b => b.status === 'cancelled').length,
    totalCars:     db.get('cars').value().length,
    totalDrivers:  db.get('drivers').value().length,
    totalCarTypes: db.get('carTypes').value().length
  });
});

// ── PAGES ─────────────────────────────────────────────────────────────────────
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'public/booking.html')));
app.get('/admin',   (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

app.listen(PORT, () => console.log(`🚗 DriveElite running → http://localhost:${PORT}`));
